import type { PreparationResult, PreparationContent, PreparationSource } from './src/types/preparation';
export const PREPARATION_CONSENT: 'research-and-draft-v1';
export const MAX_BRIEF_LENGTH: number;
export const PREPARATION_SCHEMA: object;
export function safeSourceUrl(value: unknown): string | null;
export function validatePreparationRequest(value: unknown): { id: string; brief: string; consent: typeof PREPARATION_CONSENT };
export function validatePreparationContent(value: unknown, sources: PreparationSource[]): PreparationContent;
export function validatePreparationResult(value: unknown): PreparationResult;
