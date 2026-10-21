import type {
  MeshState,
  Portal,
  Connection,
  Session,
  PortalInput,
  SessionInput,
} from "./types";
export const CATEGORIES: readonly string[];
export const PORTAL_KINDS: readonly string[];
export function sampleState(): MeshState;
export function validateState(value: unknown): MeshState;
export function validatePortal(value: unknown): Portal;
export function newPortal(state: MeshState, input: PortalInput): MeshState;
export function connect(
  state: MeshState,
  from: string,
  to: string,
  relation: string,
): MeshState;
export function proposeSession(
  state: MeshState,
  input: SessionInput,
): MeshState;
export function togglePath(state: MeshState, id: string): MeshState;
export function myPathSessions(state: MeshState): Session[];
export function pathHasOverlap(state: MeshState): boolean;
export function portalConnections(state: MeshState, id: string): Connection[];
export function nextId(prefix: string): string;

export function editPortal(
  state: MeshState,
  id: string,
  input: PortalInput,
): MeshState;
