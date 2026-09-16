import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pathway } from '../types/pathway';
import { MAX_PATHWAYS, parsePathways, validatePathway } from '../utils/pathway';

const KEY = '@rheo/private-pathways/v1';
let writes: Promise<unknown> = Promise.resolve();
function writeInOrder<T>(operation: () => Promise<T>): Promise<T> {
  const next = writes.then(operation);
  writes = next.catch(() => {});
  return next;
}
export async function listPathways(): Promise<Pathway[]> {
  try {
    return parsePathways(await AsyncStorage.getItem(KEY)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  } catch { throw new Error('Your pathways could not be read. Nothing was changed. Please try again.'); }
}
export async function savePathway(pathway: Pathway): Promise<Pathway> {
  return writeInOrder(async () => {
    const items = await listPathways();
    const clean = validatePathway(pathway);
    if (!items.some((item) => item.id === clean.id) && items.length >= MAX_PATHWAYS) {
      throw new Error('There are 50 saved pathways. Delete one before adding another.');
    }
    await AsyncStorage.setItem(KEY, JSON.stringify([clean, ...items.filter((item) => item.id !== clean.id)]));
    return clean;
  });
}
export async function deletePathway(id: string): Promise<void> {
  return writeInOrder(async () => {
    const items = await listPathways();
    await AsyncStorage.setItem(KEY, JSON.stringify(items.filter((item) => item.id !== id)));
  });
}
