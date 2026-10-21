import { requireOptionalNativeModule, NativeModule } from 'expo';
import type { MeshRecord } from './replication.mjs';
export type RadioStatus = { active: boolean; bluetooth: string; bluetoothLinks: number; wifiPeers: number };
type RadioEvents = {
  onRecord: (record: MeshRecord) => void;
  onStatus: (status: RadioStatus) => void;
  onWarning: (event: { message: string }) => void;
};
declare class MeshNative extends NativeModule<RadioEvents> {
  start(): Promise<void>;
  stop(): Promise<void>;
  publish(payload: string): Promise<string>;
  verify(wire: string): Promise<MeshRecord>;
  send(wire: string): Promise<void>;
};
export const nativeMesh = requireOptionalNativeModule<MeshNative>('RheoMesh');
