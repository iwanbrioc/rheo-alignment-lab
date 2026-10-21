import Foundation
import CryptoKit
import Security

enum MeshError: Error, LocalizedError {
  case invalid(String)
  var errorDescription: String? { if case .invalid(let text) = self { return text }; return nil }
}

// Signatures identify a publishing key, not a trusted person or a verified place.
final class MeshIdentity {
  private let key: Curve25519.Signing.PrivateKey
  init() throws {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "org.rheo.mobile.mesh-signing-v1", kSecAttrAccount as String: "publisher"]
    var request = query
    request[kSecReturnData as String] = true
    var found: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &found)
    if status == errSecSuccess, let bytes = found as? Data {
      key = try Curve25519.Signing.PrivateKey(rawRepresentation: bytes)
    } else if status == errSecItemNotFound {
      let created = Curve25519.Signing.PrivateKey()
      var add = query
      add[kSecValueData as String] = created.rawRepresentation
      add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
      guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else { throw MeshError.invalid("Could not save the mesh signing key.") }
      key = created
    } else { throw MeshError.invalid("The mesh signing key is unavailable. Unlock the phone and try again.") }
  }
  func make(payload: String) throws -> String {
    guard payload.utf8.count <= 24_000 else { throw MeshError.invalid("Shared map exceeds the current 24 KB radio limit. Share a smaller map file instead.") }
    let now = Int(Date().timeIntervalSince1970 * 1000)
    let body = try JSONSerialization.data(withJSONObject: ["createdAt": now, "expiresAt": now + 604800000, "payload": payload], options: [.sortedKeys])
    let publicKey = key.publicKey.rawRepresentation
    let signature = try key.signature(for: body)
    let id = SHA256.hash(data: publicKey + body).map { String(format: "%02x", $0) }.joined()
    let bytes = try JSONSerialization.data(withJSONObject: ["version": 1, "id": id, "body": body.base64EncodedString(),
      "publisher": publicKey.base64EncodedString(), "signature": signature.base64EncodedString(), "hops": 0], options: [.sortedKeys])
    guard bytes.count <= MeshFrames.maxBytes, let wire = String(data: bytes, encoding: .utf8) else { throw MeshError.invalid("Map packet is too large.") }
    return wire
  }
  static func verify(_ wire: String) throws -> [String: Any] {
    guard wire.utf8.count <= MeshFrames.maxBytes,
      let data = wire.data(using: .utf8),
      let packet = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      packet["version"] as? Int == 1,
      let id = packet["id"] as? String,
      let hops = packet["hops"] as? Int, (0...7).contains(hops),
      let b = packet["body"] as? String, let body = Data(base64Encoded: b), body.count <= 32_000,
      let p = packet["publisher"] as? String, let publicKey = Data(base64Encoded: p), publicKey.count == 32,
      let s = packet["signature"] as? String, let signature = Data(base64Encoded: s), signature.count == 64,
      let key = try? Curve25519.Signing.PublicKey(rawRepresentation: publicKey), key.isValidSignature(signature, for: body),
      id == SHA256.hash(data: publicKey + body).map({ String(format: "%02x", $0) }).joined(),
      let content = try JSONSerialization.jsonObject(with: body) as? [String: Any],
      let created = content["createdAt"] as? Int, let expires = content["expiresAt"] as? Int,
      let payload = content["payload"] as? String, payload.utf8.count <= 24_000
      else { throw MeshError.invalid("Invalid signed mesh record.") }
    let now = Int(Date().timeIntervalSince1970 * 1000)
    guard created <= now + 300000, expires > now, expires > created, expires - created <= 604800000 else { throw MeshError.invalid("Expired mesh record or incorrect phone clock.") }
    return ["id": id, "publisher": p, "createdAt": created, "expiresAt": expires, "payload": payload, "hops": hops, "wire": wire]
  }
}
