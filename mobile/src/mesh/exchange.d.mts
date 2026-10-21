import type { MeshState } from "./types";
export const MAX_FILE_BYTES: number;
export function sharedMesh(state: MeshState): MeshState;
export function mergeMesh(local: MeshState, incoming: MeshState): MeshState;
export function parseMesh(text: string): MeshState;
