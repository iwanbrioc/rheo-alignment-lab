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

/** A display-only fictional overlay; never writes coordinates into mesh records. */
export function sampleOverlay(state, position) {
  if (!position || !Number.isFinite(position.latitude) ||
      !Number.isFinite(position.longitude) || Math.abs(position.latitude) > 90 ||
      Math.abs(position.longitude) > 180) return [];
  const samples = state.portals.filter(p => p.demo);
  const longitudeScale = Math.max(0.05, Math.cos(position.latitude * Math.PI / 180));
  return samples.map((p, index) => {
    const angle = index * 2 * Math.PI / samples.length;
    const north = Math.cos(angle) * 0.006;
    const east = Math.sin(angle) * 0.006 / longitudeScale;
    return { ...p, location: {
      latitude: Math.max(-90, Math.min(90, position.latitude + north)),
      longitude: ((position.longitude + east + 540) % 360) - 180,
    }};
  });
}
