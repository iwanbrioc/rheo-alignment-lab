import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { MeshState } from "./types";
import { MAX_FILE_BYTES, parseMesh, sharedMesh } from "./exchange.mjs";
export async function shareMesh(
  state: MeshState,
  privateBackup = false,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is not available on this device.");
  if (!FileSystem.cacheDirectory)
    throw new Error("Temporary file storage is unavailable.");
  const path =
    FileSystem.cacheDirectory +
    "rheo-" +
    (privateBackup ? "PRIVATE-backup" : "shared-map") +
    "-" +
    Date.now() +
    ".json";
  try {
    await FileSystem.writeAsStringAsync(
      path,
      JSON.stringify(privateBackup ? state : sharedMesh(state)),
    );
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: privateBackup
        ? "Private backup: contains private portals and My Path"
        : "Share consented portals and relationships",
    });
  } finally {
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
  }
}
export async function pickMesh(): Promise<MeshState | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (!asset) throw new Error("No map file was selected.");
  try {
    if (asset.size != null && asset.size > MAX_FILE_BYTES)
      throw new Error("Map file exceeds 400 KB.");
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (info.exists && !info.isDirectory && info.size > MAX_FILE_BYTES)
      throw new Error("Map file exceeds 400 KB.");
    return parseMesh(await FileSystem.readAsStringAsync(asset.uri));
  } finally {
    if (
      FileSystem.cacheDirectory &&
      asset.uri.startsWith(FileSystem.cacheDirectory)
    )
      await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(
        () => {},
      );
  }
}
