import type { MeshState, Portal, Coordinate } from "./types";
export const needTopics: {
  id: string;
  label: string;
  category?: string;
  words: string[];
}[];
export function distanceKm(
  a: Coordinate | null | undefined,
  b: Coordinate | null | undefined,
): number | null;
export function findPortals(
  state: MeshState,
  options?: {
    query?: string;
    topic?: string | null;
    position?: Coordinate | null;
    includeExamples?: boolean;
  },
): {
  portal: Portal;
  distance: number | null;
  relevance: number;
  matches: boolean;
}[];
