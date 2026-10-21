import Foundation
import CryptoKit

func check(_ value: @autoclosure () -> Bool, _ label: String) {
  if !value() { fatalError(label) }
}
let payload = Data((0..<24000).map { UInt8($0 % 251) })
let frames = MeshFrames.split(payload, mtu: 185)
check(!frames.isEmpty && frames.allSatisfy { $0.count <= 185 }, "MTU-bound fragmenting")
var buffer = MeshAssemblies()
var output: Data?
for frame in frames.reversed() { output = buffer.append(frame, peer: "one") ?? output }
check(output == payload, "Reordered fragments must reconstruct bytes exactly")
var duplicates = MeshAssemblies()
for frame in frames.dropLast() {
  check(duplicates.append(frame, peer: "one") == nil, "Incomplete frame set")
  check(duplicates.append(frame, peer: "one") == nil, "Replay must not complete assembly")
}
check(duplicates.append(frames.last!, peer: "one") == payload, "Duplicates must not corrupt reconstruction")
var isolated = MeshAssemblies()
for (i,frame) in frames.enumerated() {
  check(isolated.append(frame, peer: i % 2 == 0 ? "a" : "b") == nil, "Never combine different peers")
}
check(MeshFrames.split(Data(repeating: 1, count: 48001), mtu: 185).isEmpty, "Outbound byte limit")
check(MeshFrames.split(payload, mtu: 20).isEmpty, "Reject unsupported MTU")
var expiry = MeshAssemblies()
let start = Date()
check(expiry.append(frames[0], peer:"a", now:start) == nil, "Store first fragment")
for frame in frames.dropFirst() {
  check(expiry.append(frame, peer:"a", now:start.addingTimeInterval(100)) == nil, "Old assembly must expire")
}
let key = Curve25519.Signing.PrivateKey()
func envelope(expires: Int? = nil) throws -> String {
  let now = Int(Date().timeIntervalSince1970 * 1000)
  let body = try JSONSerialization.data(withJSONObject: ["createdAt": now, "expiresAt": expires ?? now+604800000, "payload": "{}"], options: [.sortedKeys])
  let pub = key.publicKey.rawRepresentation
  let id = SHA256.hash(data: pub + body).map { String(format:"%02x",$0) }.joined()
  let wire = try JSONSerialization.data(withJSONObject:["version":1,"hops":0,"id":id,"body":body.base64EncodedString(),"publisher":pub.base64EncodedString(),"signature":try key.signature(for:body).base64EncodedString()])
  return String(data:wire,encoding:.utf8)!
}
let valid = try envelope()
let verified = try MeshIdentity.verify(valid)
check(verified["payload"] as? String == "{}", "Valid signature")
var modified = try JSONSerialization.jsonObject(with: Data(valid.utf8)) as! [String:Any]
modified["body"] = Data("tampered".utf8).base64EncodedString()
let tampered = String(data:try JSONSerialization.data(withJSONObject:modified),encoding:.utf8)!
check((try? MeshIdentity.verify(tampered)) == nil, "Reject tampered content")
let expired = try envelope(expires:1)
check((try? MeshIdentity.verify(expired)) == nil, "Reject expired records")
modified = try JSONSerialization.jsonObject(with: Data(valid.utf8)) as! [String:Any]
modified["id"] = String(repeating:"0",count:64)
check((try? MeshIdentity.verify(String(data:try JSONSerialization.data(withJSONObject:modified),encoding:.utf8)!)) == nil, "Reject forged IDs")
var queue = BLEOutboundNotificationBuffer<String>()
_ = queue.enqueue(data:Data([1]),targets:["a","b"],capCount:1)
if case .full = queue.enqueue(data:Data([2]),targets:nil,capCount:1) {} else { fatalError("Queue bound") }
queue.removeTarget { $0 == "a" }
check(queue.takeAll().first?.targets == ["b"], "Remove disconnected targets")
print("Native mesh tests PASS: fragmentation, duplicates, peer isolation, expiry, signatures, tamper rejection and backpressure")
