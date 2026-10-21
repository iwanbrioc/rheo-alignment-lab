import type { Portal, MeshState } from "./types";
export function makePortalToken(portal: Portal): {
  text: string;
  byteLength: number;
  framedBytes: number;
};
export function parsePortalToken(text: string): Portal;
export function mergeReceivedPortal(
  state: MeshState,
  portal: Portal,
): { state: MeshState; added: boolean };
