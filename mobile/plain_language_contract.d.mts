import type { RecommendationAction } from './src/types/decision';
export const PLAIN_ENGLISH: string;
export const DISPLAY_FIELDS: readonly string[];
export const PLAIN_ACTION_SCHEMA: object;
export function displayActions(actions: unknown): RecommendationAction[];
export function validatePlainActions(value: unknown, originals: unknown): RecommendationAction[];
