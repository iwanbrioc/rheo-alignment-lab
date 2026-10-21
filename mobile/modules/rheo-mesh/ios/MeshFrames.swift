import Foundation

// Bitchat-derived header layout; independent service and record type. See vendor/PROVENANCE.md.
enum MeshFrames {
  static let maxBytes = 48_000
  static let maxFragments = 1024
  static func split(_ data: Data, mtu: Int) -> [Data] {
    guard !data.isEmpty, data.count <= maxBytes, mtu >= 64 else { return [] }
    let size = min(mtu, 512) - 13
    let total = (data.count + size - 1) / size
    guard total <= maxFragments else { return [] }
    let id = (0..<8).map { _ in UInt8.random(in: 0...255) }
    return (0..<total).map { index in
      var frame = Data(id)
      frame.append(contentsOf: [UInt8(index >> 8), UInt8(index & 255), UInt8(total >> 8), UInt8(total & 255), 0x52])
      frame.append(data.subdata(in: (index * size)..<min((index + 1) * size, data.count)))
      return frame
    }
  }
}

struct MeshAssemblies {
  struct Assembly {
    let total: Int
    let started: Date
    var parts: [Int: Data] = [:]
    var bytes = 0
  }
  private var held: [String: Assembly] = [:]
  mutating func clear() { held.removeAll() }
  mutating func append(_ data: Data, peer: String, now: Date = Date()) -> Data? {
    held = held.filter { now.timeIntervalSince($0.value.started) < 90 }
    guard data.count > 13, data.count <= 512, data[12] == 0x52 else { return nil }
    let index = Int(data[8]) * 256 + Int(data[9])
    let total = Int(data[10]) * 256 + Int(data[11])
    guard total > 0, total <= MeshFrames.maxFragments, index < total else { return nil }
    let key = peer + ":" + data.prefix(8).base64EncodedString()
    if held[key] == nil {
      if held.count >= 8, let oldest = held.min(by: { $0.value.started < $1.value.started })?.key {
        held.removeValue(forKey: oldest)
      }
      held[key] = Assembly(total: total, started: now)
    }
    guard var item = held[key], item.total == total else { held.removeValue(forKey: key); return nil }
    let chunk = Data(data.dropFirst(13))
    if let previous = item.parts[index], previous != chunk {
      held.removeValue(forKey: key); return nil
    }
    item.bytes += chunk.count - (item.parts[index]?.count ?? 0)
    guard item.bytes <= MeshFrames.maxBytes else { held.removeValue(forKey: key); return nil }
    item.parts[index] = chunk
    held[key] = item
    guard item.parts.count == total else { return nil }
    held.removeValue(forKey: key)
    var result = Data()
    for i in 0..<total { guard let part = item.parts[i] else { return nil }; result.append(part) }
    return result
  }
}
