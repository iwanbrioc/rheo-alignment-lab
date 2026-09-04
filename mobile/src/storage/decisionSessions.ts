import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DecisionSession } from '../types/decision';
import {
  parseDecisionSessions,
  sanitizeDecisionSessionForStorage,
  serializeDecisionSessions,
} from '../utils/decisionSession';

const STORAGE_KEY = '@rheo/decision-sessions/v0.2';
const MAX_SESSIONS = 20;

function newestFirst(a: DecisionSession, b: DecisionSession): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

async function readAll(): Promise<DecisionSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return parseDecisionSessions(raw).sort(newestFirst);
  } catch {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage may be unavailable in tests or restricted environments.
    }
    return [];
  }
}

export async function listDecisionSessions(): Promise<DecisionSession[]> {
  return readAll();
}

export async function getDecisionSession(id: string): Promise<DecisionSession | null> {
  const sessions = await readAll();
  return sessions.find((session) => session.id === id) || null;
}

export async function upsertDecisionSession(session: DecisionSession): Promise<void> {
  const stored = await readAll();
  const clean = sanitizeDecisionSessionForStorage(session);
  const next = [
    clean,
    ...stored.filter((existing) => existing.id !== clean.id),
  ]
    .sort(newestFirst)
    .slice(0, MAX_SESSIONS);

  await AsyncStorage.setItem(STORAGE_KEY, serializeDecisionSessions(next));
}

export async function deleteDecisionSession(id: string): Promise<void> {
  const stored = await readAll();
  const next = stored.filter((session) => session.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, serializeDecisionSessions(next));
}
