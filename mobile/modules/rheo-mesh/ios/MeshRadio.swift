import Foundation
import CryptoKit
import CoreBluetooth
import MultipeerConnectivity

// Foreground, public-record transport. It never sends My Path, GPS fixes or private portals.
// All mutable state is confined to the main queue; Expo bridge calls use that queue too.
final class MeshRadio: NSObject, CBCentralManagerDelegate, CBPeripheralManagerDelegate, CBPeripheralDelegate,
  MCSessionDelegate, MCNearbyServiceAdvertiserDelegate, MCNearbyServiceBrowserDelegate {
  static let service = CBUUID(string: "7252B810-7D3A-4FB2-98A6-3AC143B4E001")
  static let characteristic = CBUUID(string: "7252B810-7D3A-4FB2-98A6-3AC143B4E002")
  var onEvent: ((String, [String: Any]) -> Void)?
  private var central: CBCentralManager?
  private var peripheral: CBPeripheralManager?
  private var characteristic: CBMutableCharacteristic?
  private var links: [UUID: CBPeripheral] = [:]
  private var characteristics: [UUID: CBCharacteristic] = [:]
  private var writes: [UUID: [Data]] = [:]
  private var pendingWriteIDs: [UUID: Set<String>] = [:]
  private var writing = Set<UUID>()
  private var writeTickets: [UUID: UUID] = [:]
  private var subscribers: [UUID: CBCentral] = [:]
  private var notifications = BLEOutboundNotificationBuffer<CBCentral>()
  private var assemblies = MeshAssemblies()
  private var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?
  private var connecting = Set<MCPeerID>()
  private var peer: MCPeerID?
  private var active = false
  private var lastWarning: Date = .distantPast

  func start() {
    guard !active else { return }
    active = true
    central = CBCentralManager(delegate: self, queue: .main)
    peripheral = CBPeripheralManager(delegate: self, queue: .main)
    let id = MCPeerID(displayName: "Rheo-" + String(UUID().uuidString.prefix(8)))
    peer = id
    let local = MCSession(peer: id, securityIdentity: nil, encryptionPreference: .required)
    local.delegate = self; session = local
    let ad = MCNearbyServiceAdvertiser(peer: id, discoveryInfo: ["protocol": "rheo-data-1"], serviceType: "rheo-data-v1")
    let browse = MCNearbyServiceBrowser(peer: id, serviceType: "rheo-data-v1")
    ad.delegate = self; browse.delegate = self
    advertiser = ad; browser = browse
    ad.startAdvertisingPeer(); browse.startBrowsingForPeers()
    status()
  }
  func stop() {
    active = false
    central?.stopScan()
    for link in links.values { central?.cancelPeripheralConnection(link) }
    peripheral?.stopAdvertising(); peripheral?.removeAllServices()
    browser?.stopBrowsingForPeers(); advertiser?.stopAdvertisingPeer(); session?.disconnect()
    browser = nil; advertiser = nil; session = nil; peer = nil; connecting.removeAll()
    central = nil; peripheral = nil; characteristic = nil
    links.removeAll(); characteristics.removeAll(); writes.removeAll(); pendingWriteIDs.removeAll(); writing.removeAll(); writeTickets.removeAll(); subscribers.removeAll()
    notifications.removeAll(); assemblies.clear(); status()
  }
  private func status() {
    let bluetooth = central.map { String(describing: $0.state.rawValue) } ?? "stopped"
    onEvent?("onStatus", ["active": active, "bluetooth": bluetooth,
      "bluetoothLinks": characteristics.count + subscribers.count, "wifiPeers": session?.connectedPeers.count ?? 0])
  }
  private func warning(_ text: String) {
    guard Date().timeIntervalSince(lastWarning) > 5 else { return }
    lastWarning = Date(); onEvent?("onWarning", ["message": text])
  }
  func send(_ wire: String) throws {
    guard active, let bytes = wire.data(using: .utf8), bytes.count <= MeshFrames.maxBytes else {
      throw MeshError.invalid("Local mesh is paused or the record is too large.")
    }
    // Wi-Fi/local peer sessions require no internet and may use infrastructure or peer-to-peer Wi-Fi.
    if let session, !session.connectedPeers.isEmpty {
      do { try session.send(bytes, toPeers: session.connectedPeers, with: .reliable) }
      catch { warning("Local Wi-Fi transfer failed; Bluetooth and later retries remain available.") }
    }
    let packetID = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
    for (id, value) in characteristics {
      if pendingWriteIDs[id]?.contains(packetID) == true { continue }
      guard let link = links[id] else { continue }
      let frames = MeshFrames.split(bytes, mtu: link.maximumWriteValueLength(for: .withResponse))
      guard !frames.isEmpty else { warning("A Bluetooth link has an unsupported packet size."); continue }
      if (writes[id]?.count ?? 0) + frames.count > 2048 { warning("Bluetooth send queue is full; records will retry later."); continue }
      pendingWriteIDs[id, default: []].insert(packetID)
      writes[id, default: []].append(contentsOf: frames); pumpWrites(id)
    }
    for subscriber in subscribers.values {
      let frames = MeshFrames.split(bytes, mtu: subscriber.maximumUpdateValueLength)
      guard !frames.isEmpty, notifications.count + frames.count <= 4096 else {
        warning("Bluetooth relay queue is full or its packet size is unsupported; retry later."); continue
      }
      for frame in frames { _ = notifications.enqueue(data: frame, targets: [subscriber], capCount: 4096) }
    }
    pumpNotifications()
  }
  private func receive(_ data: Data, via: String) {
    guard data.count <= MeshFrames.maxBytes, let wire = String(data: data, encoding: .utf8) else { return }
    do {
      var record = try MeshIdentity.verify(wire)
      record["via"] = via
      onEvent?("onRecord", record)
    } catch { warning("A received record was invalid, expired, or could not be verified.") }
  }
  private func fragment(_ data: Data, peer: String) {
    if let complete = assemblies.append(data, peer: peer) { receive(complete, via: "bluetooth") }
  }
  private func pumpWrites(_ id: UUID) {
    guard !writing.contains(id), let link = links[id], let value = characteristics[id],
      let frame = writes[id]?.first else { return }
    writing.insert(id)
    let ticket = UUID(); writeTickets[id] = ticket
    link.writeValue(frame, for: value, type: .withResponse)
    DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
      guard let self, self.active, self.writeTickets[id] == ticket, self.writing.contains(id) else { return }
      self.warning("A Bluetooth link stalled; reconnecting for a later retry.")
      self.central?.cancelPeripheralConnection(link)
    }
  }
  private func pumpNotifications() {
    guard let peripheral, let characteristic else { return }
    let pending = notifications.takeAll()
    for (index, entry) in pending.enumerated() {
      if !peripheral.updateValue(entry.data, for: characteristic, onSubscribedCentrals: entry.targets) {
        notifications.prepend(Array(pending[index...])); return
      }
    }
  }
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if active && central.state == .poweredOn { central.scanForPeripherals(withServices: [Self.service], options: nil) }
    if central.state == .unauthorized { warning("Bluetooth permission is off. Enable it in iPhone Settings to join nearby peers.") }
    status()
  }
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    guard active, peripheral.state == .poweredOn else { status(); return }
    let value = CBMutableCharacteristic(type: Self.characteristic, properties: [.write, .notify], value: nil, permissions: [.writeable])
    characteristic = value
    let service = CBMutableService(type: Self.service, primary: true); service.characteristics = [value]
    peripheral.removeAllServices(); peripheral.add(service)
  }
  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    guard active, error == nil else { warning("Bluetooth advertising could not start."); return }
    peripheral.startAdvertising([CBAdvertisementDataServiceUUIDsKey: [Self.service]])
  }
  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    guard active, links[peripheral.identifier] == nil, links.count < 4 else { return }
    links[peripheral.identifier] = peripheral; peripheral.delegate = self
    central.connect(peripheral, options: nil)
    let id = peripheral.identifier
    DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self, weak peripheral] in
      guard let self, let peripheral, self.links[id] != nil, self.characteristics[id] == nil else { return }
      self.central?.cancelPeripheralConnection(peripheral)
    }
  }
  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) { peripheral.discoverServices([Self.service]) }
  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) { if central === self.central { remove(peripheral.identifier) } }
  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) { if central === self.central { remove(peripheral.identifier) } }
  private func remove(_ id: UUID) { links.removeValue(forKey: id); characteristics.removeValue(forKey: id); writes.removeValue(forKey: id); pendingWriteIDs.removeValue(forKey: id); writing.remove(id); writeTickets.removeValue(forKey: id); status() }
  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    for service in peripheral.services ?? [] where service.uuid == Self.service { peripheral.discoverCharacteristics([Self.characteristic], for: service) }
  }
  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard let value = service.characteristics?.first(where: { $0.uuid == Self.characteristic }) else { return }
    characteristics[peripheral.identifier] = value; peripheral.setNotifyValue(true, for: value)
  }
  func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) { status() }
  func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
    let id = peripheral.identifier; writing.remove(id); writeTickets.removeValue(forKey: id)
    guard error == nil else { writes[id] = []; pendingWriteIDs.removeValue(forKey: id); warning("Bluetooth write failed; the map will retry later."); return }
    if !(writes[id]?.isEmpty ?? true) { writes[id]?.removeFirst() }
    if writes[id]?.isEmpty == true { pendingWriteIDs.removeValue(forKey: id) }
    pumpWrites(id)
  }
  func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    if error == nil, let data = characteristic.value { fragment(data, peer: peripheral.identifier.uuidString) }
  }
  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      guard request.characteristic.uuid == Self.characteristic, request.offset == 0, let data = request.value,
        data.count <= 512 else { peripheral.respond(to: request, withResult: .invalidAttributeValueLength); continue }
      fragment(data, peer: request.central.identifier.uuidString); peripheral.respond(to: request, withResult: .success)
    }
  }
  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
    guard subscribers.count < 4 else { return }
    subscribers[central.identifier] = central; status()
  }
  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
    subscribers.removeValue(forKey: central.identifier)
    notifications.removeTarget { $0.identifier == central.identifier }; status()
  }
  func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) { pumpNotifications() }
  // Multipeer callbacks may arrive on arbitrary queues; confine all state/event delivery.
  func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.active, let session = self.session, let peer = self.peer,
        info?["protocol"] == "rheo-data-1", session.connectedPeers.count + self.connecting.count < 4,
        !self.connecting.contains(peerID), !session.connectedPeers.contains(peerID), peer.displayName < peerID.displayName else { return }
      self.connecting.insert(peerID); browser.invitePeer(peerID, to: session, withContext: nil, timeout: 20)
    }
  }
  func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) { DispatchQueue.main.async { self.connecting.remove(peerID) } }
  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
    DispatchQueue.main.async { [weak self] in
      guard let self, let session = self.session, self.active, session.connectedPeers.count + self.connecting.count < 4 else { invitationHandler(false, nil); return }
      self.connecting.insert(peerID); invitationHandler(true, session)
    }
  }
  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) { DispatchQueue.main.async { self.warning("Local Wi-Fi discovery is unavailable. Bluetooth can still work.") } }
  func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) { DispatchQueue.main.async { self.warning("Local network permission may be off. Bluetooth can still work.") } }
  func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
    DispatchQueue.main.async { [weak self] in self?.connecting.remove(peerID); self?.status() }
  }
  func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
    DispatchQueue.main.async { [weak self] in self?.receive(data, via: "local-wifi") }
  }
  func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
  func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
  func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}
