import type { MeshState, Portal, Coordinate, Connection } from "./types";
export function locatedPortals(
  state: MeshState,
): (Portal & { location: Coordinate })[];
export function geographicConnections(
  state: MeshState,
): (Connection & { coordinates: Coordinate[] })[];
export function initialRegion(
  portals: Portal[],
  position?: Coordinate | null,
): Coordinate & { latitudeDelta: number; longitudeDelta: number };
