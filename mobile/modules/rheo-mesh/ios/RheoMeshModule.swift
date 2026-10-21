import ExpoModulesCore
import Foundation

public class RheoMeshModule: Module {
  private var radio: MeshRadio?
  private var identity: MeshIdentity?
  private var requested = false
  public func definition() -> ModuleDefinition {
    Name("RheoMesh")
    Events("onRecord", "onStatus", "onWarning")
    OnCreate {
      self.radio = MeshRadio()
      self.radio?.onEvent = { [weak self] name, body in self?.sendEvent(name, body) }
    }
    AsyncFunction("start") {
      self.requested = true
      self.radio?.start()
    }.runOnQueue(.main)
    AsyncFunction("stop") {
      self.requested = false
      self.radio?.stop()
    }.runOnQueue(.main)
    AsyncFunction("publish") { (payload: String) -> String in
      if self.identity == nil { self.identity = try MeshIdentity() }
      guard let identity = self.identity else { throw MeshError.invalid("Signing key unavailable.") }
      return try identity.make(payload: payload)
    }.runOnQueue(.main)
    AsyncFunction("verify") { (wire: String) -> [String: Any] in try MeshIdentity.verify(wire) }.runOnQueue(.main)
    AsyncFunction("send") { (wire: String) in
      _ = try MeshIdentity.verify(wire)
      try self.radio?.send(wire)
    }.runOnQueue(.main)
    OnAppEntersBackground { self.radio?.stop() }
    OnAppBecomesActive { if self.requested { self.radio?.start() } }
    OnDestroy { self.radio?.stop() }
  }
}
