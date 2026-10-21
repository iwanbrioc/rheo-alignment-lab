import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MeshState } from "./types";
import { sampleState, validateState } from "./model.mjs";
export const MESH_KEY = "@rheo/native-mesh/v0.4";
let queue: Promise<unknown> = Promise.resolve();
export async function loadMesh(): Promise<MeshState> {
  const raw = await AsyncStorage.getItem(MESH_KEY);
  if (raw === null)
    return validateState({
      version: 4,
      portals: [],
      links: [],
      sessions: [],
      myPath: [],
    });
  try {
    return validateState(JSON.parse(raw));
  } catch {
    throw new Error(
      "Your saved mesh could not be read. It has not been erased or replaced. Retry reading; do not reset or reinstall if you need these records.",
    );
  }
}
export function saveMesh(state: MeshState): Promise<void> {
  const clean = validateState(state),
    write = queue.then(() =>
      AsyncStorage.setItem(MESH_KEY, JSON.stringify(clean)),
    );
  queue = write.catch(() => {});
  return write;
}
export function emptyMesh(): MeshState {
  return {
    version: 4,
    researchArm: null,
    portals: [],
    links: [],
    sessions: [],
    myPath: [],
  };
}
export { sampleState };
