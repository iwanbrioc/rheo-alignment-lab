import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MeshState } from '../types';
import { nativeMesh, type RadioStatus } from './native';
import { applyRecord, publicPayload, relayWire, retainRecords, validateRecord, type MeshRecord } from './replication.mjs';
const KEY = '@rheo/radio-records/v1';
const initialStatus: RadioStatus = { active: false, bluetooth: 'stopped', bluetoothLinks: 0, wifiPeers: 0 };

export function useMeshSync(state: MeshState | null, commit: (update: (s: MeshState) => MeshState) => Promise<void>) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState('Nearby sharing is off. Your saved map remains available offline.');
  const [records, setRecords] = useState<MeshRecord[]>([]);
  const saved = useRef<MeshRecord[]>([]), queue = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef(state), commitRef = useRef(commit), active = useRef(false), mounted = useRef(true);
  latest.current = state; commitRef.current = commit;
  function serial(task: () => Promise<void>) {
    queue.current = queue.current.then(task).catch(error => {
      if (mounted.current) setMessage(error instanceof Error ? error.message : String(error));
    });
  }
  async function persist(next: MeshRecord[]) {
    const clean = retainRecords(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(clean.map(({wire, status, reason}) => ({wire, status, reason}))));
    saved.current = clean;
    if (mounted.current) setRecords(clean);
  }
  useEffect(() => {
    mounted.current = true;
    serial(async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw && raw.length > 650000) throw new Error('Relay store exceeds its limit. Clear it before joining.');
      const stored: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stored) || stored.length > 12) throw new Error('Relay store could not be read. It was not replaced.');
      const verified: MeshRecord[] = [];
      if (nativeMesh) for (const item of stored) {
        if (!item || typeof item.wire !== 'string') continue;
        try {
          const record = await nativeMesh.verify(item.wire);
          validateRecord(record);
          if (['accepted', 'held', 'published'].includes(item.status)) verified.push({...record, status: item.status, reason: typeof item.reason === 'string' ? item.reason.slice(0, 240) : undefined});
        } catch { /* expired/invalid packets are never replayed */ }
      }
      saved.current = verified; setRecords(verified); setReady(true);
    });
    return () => { mounted.current = false; active.current = false; void nativeMesh?.stop(); };
  }, []);
  useEffect(() => {
    if (!nativeMesh) return;
    const received = nativeMesh.addListener('onRecord', record => serial(async () => {
      if (!active.current || !latest.current || saved.current.some(r => r.id === record.id)) return;
      validateRecord(record);
      let status: MeshRecord['status'] = 'accepted', reason: string | undefined;
      try { await commitRef.current(local => applyRecord(local, saved.current, record)); }
      catch (error) { status = 'held'; reason = error instanceof Error ? error.message : String(error); }
      await persist([...saved.current, {...record, status, reason}]);
      setMessage(status === 'accepted' ? 'Received map data saved on this phone. Claims remain unverified.' : 'A received revision was held for review. Your existing map was kept.');
      if (status === 'accepted' && active.current) {
        const wire = relayWire(record); if (wire) await nativeMesh?.send(wire);
      }
    }));
    const changed = nativeMesh.addListener('onStatus', value => setStatus(value));
    const warning = nativeMesh.addListener('onWarning', value => setMessage(value.message));
    return () => { received.remove(); changed.remove(); warning.remove(); };
  }, []);
  async function cycle() {
    if (!active.current || !nativeMesh || !latest.current || !status.active) return;
    const payload = publicPayload(latest.current);
    const previous = [...saved.current].reverse().find(r => r.status === 'published');
    // Refresh before expiry, but never generate identical broadcasts on every render.
    if (!previous || previous.payload !== payload || previous.expiresAt - Date.now() < 86400000) {
      const wire = await nativeMesh.publish(payload);
      const record = await nativeMesh.verify(wire);
      validateRecord(record);
      await persist([...saved.current.filter(r => r.status !== 'published'), {...record, status: 'published'}]);
    }
    const usable = retainRecords(saved.current).filter(r => r.status !== 'held');
    // Send newest first. Native queues apply backpressure and later rounds retry whole records.
    for (const record of [...usable].reverse()) {
      if (!active.current) return;
      const wire = record.status === 'published' ? record.wire : relayWire(record);
      if (wire) await nativeMesh?.send(wire);
    }
  }
  useEffect(() => {
    if (!enabled || !ready) return;
    const delay = setTimeout(() => serial(cycle), 1200);
    const timer = setInterval(() => serial(cycle), 60000);
    return () => { clearTimeout(delay); clearInterval(timer); };
  }, [enabled, ready, state, status.active, status.bluetoothLinks, status.wifiPeers]);
  async function start() {
    if (!nativeMesh || !ready) { setMessage('Nearby radio requires a new native iPhone build.'); return; }
    active.current = true;
    try { await nativeMesh.start(); setEnabled(true); setMessage('Nearby sharing enabled while Rheo is open. Public records and their coordinates can reach other phones.'); }
    catch (error) { active.current = false; throw error; }
  }
  async function stop() { active.current = false; setEnabled(false); await nativeMesh?.stop(); }
  async function clear() {
    await stop();
    serial(async () => { await persist([]); setReady(true); setMessage('Relay copies cleared on this phone. Your map is kept; copies already sent cannot be recalled.'); });
  }
  async function retryHeld() {
    serial(async () => {
      const next = [...saved.current];
      for (let i = 0; i < next.length; i++) {
        const record = next[i];
        if (!record || record.status !== 'held') continue;
        try {
          validateRecord(record);
          await commitRef.current(local => applyRecord(local, next, record));
          next[i] = {...record, status: 'accepted', reason: undefined};
        } catch (error) { next[i] = {...record, reason: error instanceof Error ? error.message : String(error)}; }
      }
      await persist(next);
      setMessage('Held records checked again. Unresolved conflicts remain held.');
    });
  }
  return { available: Boolean(nativeMesh), ready, enabled, status, message, records, start, stop, clear, retryHeld };
}
