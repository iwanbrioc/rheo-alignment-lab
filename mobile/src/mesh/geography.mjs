/** Geometry never turns a conceptual graph position into a real-world location. */
export function locatedPortals(state) {
  return state.portals.filter(
    (p) =>
      !p.demo &&
      p.location &&
      Number.isFinite(p.location.latitude) &&
      Number.isFinite(p.location.longitude),
  );
}
export function geographicConnections(state) {
  const byId = new Map(locatedPortals(state).map((p) => [p.id, p]));
  return state.links
    .filter((l) => byId.has(l.from) && byId.has(l.to))
    .map((l) => ({
      ...l,
      coordinates: [byId.get(l.from).location, byId.get(l.to).location],
    }));
}
export function initialRegion(portals, position = null) {
  if (!portals.length)
    return position
      ? { ...position, latitudeDelta: 0.035, longitudeDelta: 0.035 }
      : { latitude: 20, longitude: 0, latitudeDelta: 100, longitudeDelta: 160 };
  const latitudes = portals.map((p) => p.location.latitude),
    longitudes = portals.map((p) => p.location.longitude);
  const minLat = Math.min(...latitudes),
    maxLat = Math.max(...latitudes);
  const sorted = longitudes.map((l) => (l + 360) % 360).sort((a, b) => a - b);
  let gap = -1,
    start = sorted[0];
  for (let i = 0; i < sorted.length; i++) {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360,
      distance = next - sorted[i];
    if (distance > gap) {
      gap = distance;
      start = next % 360;
    }
  }
  const width = 360 - gap,
    centre = ((start + width / 2 + 180) % 360) - 180;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: centre,
    latitudeDelta: Math.min(170, Math.max(0.025, (maxLat - minLat) * 1.5)),
    longitudeDelta: Math.min(350, Math.max(0.025, width * 1.5)),
  };
}
