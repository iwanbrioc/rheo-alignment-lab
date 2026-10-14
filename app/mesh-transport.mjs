/** Rheo GATT bridge v1: browser is central; an external peripheral relays packets. */
export const SERVICE = '5248454f-0001-4000-8000-000000000001';
export const RX = '5248454f-0001-4000-8000-000000000002';
export const TX = '5248454f-0001-4000-8000-000000000003';
export const MAX_TRANSFER = 2_000_000;
export class PacketAssembler {
  constructor() { this.reset(); }
  reset() { this.buffer = []; this.length = 0; this.started = 0; }
  push(chunk, now = Date.now()) {
    if (this.started && now - this.started > 30000) this.reset();
    if (!this.started) this.started = now;
    const out = [];
    for (const byte of chunk) {
      if (byte === 10) {
        const joined = Uint8Array.from(this.buffer);
        this.reset();
        out.push(new TextDecoder('utf-8', { fatal: true }).decode(joined));
      } else {
        this.buffer.push(byte); this.length++;
        if (this.length > MAX_TRANSFER) { this.reset(); throw new Error('Bluetooth transfer exceeds 2 MB.'); }
      }
    }
    return out;
  }
}
export class BluetoothBridge extends EventTarget {
  constructor(onPacket) { super(); this.onPacket = onPacket; this.assembler = new PacketAssembler(); this.status = 'disconnected'; this.sending = false; }
  async connect() {
    if (!navigator.bluetooth) throw new Error('This browser cannot connect to a Bluetooth bridge. Offline file exchange remains available.');
    this.device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE] }] });
    try {
      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE);
      this.rx = await service.getCharacteristic(RX);
      this.tx = await service.getCharacteristic(TX);
      this.device.addEventListener('gattserverdisconnected', () => { this.status = 'disconnected'; this.assembler.reset(); this.dispatchEvent(new Event('change')); });
      this.tx.addEventListener('characteristicvaluechanged', event => {
        try {
          const value = event.target.value;
          const packets = this.assembler.push(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
          for (const packet of packets) this.onPacket(packet).catch(error => this.dispatchEvent(new CustomEvent('error', { detail: error })));
        } catch (error) { this.dispatchEvent(new CustomEvent('error', { detail: error })); }
      });
      await this.tx.startNotifications();
      this.status = 'connected'; this.dispatchEvent(new Event('change'));
    } catch (error) { this.disconnect(); throw error; }
  }
  async send(packet) {
    if (this.status !== 'connected') throw new Error('Connect a Rheo-compatible bridge first.');
    if (this.sending) throw new Error('A Bluetooth transfer is already in progress.');
    const data = new TextEncoder().encode(packet + '\n');
    if (data.length > MAX_TRANSFER) throw new Error('Shared packet exceeds 2 MB.');
    this.sending = true;
    try {
      // Default ATT payload is 20 bytes. Writes with response provide backpressure.
      for (let offset = 0; offset < data.length; offset += 20) await this.rx.writeValueWithResponse(data.slice(offset, offset + 20));
    } finally { this.sending = false; }
  }
  disconnect() { this.device?.gatt.disconnect(); this.status = 'disconnected'; this.assembler.reset(); this.dispatchEvent(new Event('change')); }
}
