import { validateState } from "./model.mjs";
export const MAX_FILE_BYTES = 400000;
export function sharedMesh(state) {
  const portals = state.portals.filter((p) => p.shareable),
    ids = new Set(portals.map((p) => p.id));
  return validateState({
    version: 4,
    portals,
    links: state.links.filter((l) => ids.has(l.from) && ids.has(l.to)),
    sessions: state.sessions.filter((s) => ids.has(s.portalId)),
    myPath: [],
  });
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const portalIdentity = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  category: p.category,
  kind: p.kind,
  steward: p.steward,
  x: p.x,
  y: p.y,
  demo: p.demo,
  location: p.location,
});
export function mergeMesh(local, incoming) {
  const a = validateState(local),
    b = validateState(incoming);
  const portals = new Map(a.portals.map((p) => [p.id, p]));
  for (const p of b.portals) {
    const existing = portals.get(p.id);
    if (existing && !same(portalIdentity(existing), portalIdentity(p)))
      throw new Error("Conflicting portal IDs. Nothing was overwritten.");
    if (!existing)
      portals.set(p.id, { ...p, received: true, shareable: false });
  }
  function combine(left, right, label) {
    const out = new Map(left.map((v) => [v.id, v]));
    for (const value of right) {
      const existing = out.get(value.id);
      if (existing) {
        const { received: a, ...x } = existing,
          { received: b, ...y } = value;
        if (!same(x, y))
          throw new Error(
            "Conflicting " + label + " IDs. Nothing was overwritten.",
          );
      } else out.set(value.id, { ...value, received: true });
    }
    return [...out.values()];
  }
  return validateState({
    version: 4,
    portals: [...portals.values()],
    links: combine(a.links, b.links, "connection"),
    sessions: combine(a.sessions, b.sessions, "activity"),
    myPath: a.myPath,
  });
}
export function parseMesh(text) {
  if (
    typeof text !== "string" ||
    text.length > MAX_FILE_BYTES ||
    (typeof text === "string" &&
      Array.from(text).reduce((n, c) => {
        const p = c.codePointAt(0);
        return n + (p <= 127 ? 1 : p <= 2047 ? 2 : p <= 65535 ? 3 : 4);
      }, 0) > MAX_FILE_BYTES)
  )
    throw new Error("Map file exceeds 400 KB.");
  return validateState(JSON.parse(text));
}
