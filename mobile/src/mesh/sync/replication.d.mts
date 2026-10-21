import type { MeshState } from '../types';
export type MeshRecord = { id: string; publisher: string; createdAt: number; expiresAt: number; hops: number; wire: string; payload: string; via?: string; status?: 'accepted' | 'held' | 'published'; reason?: string };
export const MAX_RECORDS: number;
export const MAX_PAYLOAD_BYTES: number;
export const LIFETIME: number;
export function publicPayload(state: MeshState): string;
export function validateRecord(record: MeshRecord, now?: number): MeshState;
export function applyRecord(local: MeshState, history: MeshRecord[], record: MeshRecord, now?: number, owners?: Record<string, string>): MeshState;
export function retainRecords(records: MeshRecord[], now?: number): MeshRecord[];
export function relayWire(record: MeshRecord): string | null;

export function rememberOwners(owners: Record<string,string>, record: MeshRecord): Record<string,string>;

export function forwardingRecords(records: MeshRecord[], offset?: number, now?: number): MeshRecord[];
