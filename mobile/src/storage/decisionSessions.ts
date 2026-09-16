import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DecisionSession } from '../types/decision';
import type { PreparationTask } from '../types/preparation';
import type { OutcomeReview } from '../types/experimental';
import { validOutcomeReview } from '../utils/experimental';
import { preparationChoiceKey, preparationTasks } from '../utils/preparation';
import {
  parseDecisionSessions,
  sanitizeDecisionSessionForStorage,
  serializeDecisionSessions,
} from '../utils/decisionSession';

const STORAGE_KEY = '@rheo/decision-sessions/v0.2';
const MAX_SESSIONS = 20;
let writes: Promise<unknown> = Promise.resolve();

function writeInOrder<T>(operation: () => Promise<T>): Promise<T> {
  const next = writes.then(operation);
  writes = next.catch(() => {});
  return next;
}

function newestFirst(a: DecisionSession, b: DecisionSession): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

async function readAll(): Promise<DecisionSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const items: unknown = JSON.parse(raw || '[]');
    const sessions = parseDecisionSessions(raw);
    if (!Array.isArray(items) || items.length !== sessions.length) throw new Error('Invalid history');
    return sessions.sort(newestFirst);
  } catch {
    throw new Error('Saved history could not be read. No saved decisions were changed. Please try again.');
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
  return writeInOrder(async () => {
    const stored = await readAll();
    const clean = sanitizeDecisionSessionForStorage(session);
    const next = [
      clean,
      ...stored.filter((existing) => existing.id !== clean.id),
    ]
      .sort(newestFirst)
      .slice(0, MAX_SESSIONS);

    await AsyncStorage.setItem(STORAGE_KEY, serializeDecisionSessions(next));
  });
}

export async function deleteDecisionSession(id: string): Promise<void> {
  return writeInOrder(async () => {
    const stored = await readAll();
    const next = stored.filter((session) => session.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, serializeDecisionSessions(next));
  });
}

export async function saveOutcomeReview(sessionId: string, review: OutcomeReview): Promise<DecisionSession> {
  return writeInOrder(async () => {
    const sessions = await readAll();
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || !validOutcomeReview(review) || review.recommendationId !== session.recommendation?.id) {
      throw new Error('The saved decision changed or was deleted. The review was not attached.');
    }
    const previous = session.outcomes || [];
    const existing = previous.find((item) => item.id === review.id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(review)) throw new Error('A saved review cannot be overwritten.');
      return session;
    }
    if (previous.length >= 20) throw new Error('This decision already has twenty reviews. Start a new decision for more.');
    const updated = sanitizeDecisionSessionForStorage({ ...session, outcomes: [...previous, review], updatedAt: review.createdAt });
    await AsyncStorage.setItem(STORAGE_KEY, serializeDecisionSessions(sessions.map((item) => item.id === sessionId ? updated : item)));
    return updated;
  });
}

export async function savePreparationTask(sessionId: string, task: PreparationTask): Promise<DecisionSession> {
  return writeInOrder(async () => {
    const sessions = await readAll();
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || preparationChoiceKey(session) !== task.choiceKey) {
      throw new Error('The saved choice changed or was deleted. Research was not attached.');
    }
    const previous = preparationTasks(session);
    if (!previous.some((item) => item.id === task.id) && previous.length >= 10) {
      throw new Error('This decision already has ten preparations. Start a new decision for more.');
    }
    const tasks = previous.some((item) => item.id === task.id)
      ? previous.map((item) => item.id === task.id ? task : item) : [...previous, task];
    const updated = sanitizeDecisionSessionForStorage({ ...session, preparations: tasks, updatedAt: task.updatedAt });
    if (preparationTasks(updated).length !== tasks.length) throw new Error('Invalid preparation record');
    await AsyncStorage.setItem(STORAGE_KEY, serializeDecisionSessions(sessions.map((item) => item.id === sessionId ? updated : item)));
    return updated;
  });
}
