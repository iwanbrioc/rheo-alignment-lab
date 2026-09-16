import { validatePathwayResult } from '../../pathway_contract.mjs';
import type { Pathway, PathwayReview, PathwayStatus } from '../types/pathway';
import { createLocalId } from './decisionSession';

export const PATHWAY_STATUS: Record<PathwayStatus, string> = {
  idea: 'An idea', trying: 'Trying a step', helped: 'Helped this time', needs_care: 'Needs care', paused: 'Paused',
};
export const MAX_PATHWAYS = 50;
export const MAX_REVIEWS = 30;

export function createPathway(need = '', nextStep = '', now = new Date().toISOString()): Pathway {
  return { id: createLocalId('pathway'), createdAt: now, updatedAt: now, need, nextStep,
    gift: '', enablers: '', limits: '', status: 'idea', suggestion: null, reviews: [] };
}

function text(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Invalid pathway text');
  return value.trim();
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Invalid pathway date');
  return value;
}
function status(value: unknown): PathwayStatus {
  if (typeof value !== 'string' || !Object.hasOwn(PATHWAY_STATUS, value)) throw new Error('Invalid pathway state');
  return value as PathwayStatus;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid pathway');
  return value as Record<string, unknown>;
}

export function validateReview(value: unknown): PathwayReview {
  const item = record(value);
  const result = { id: text(item.id, 120, true), createdAt: timestamp(item.createdAt), status: status(item.status),
    happened: text(item.happened, 1500, true), felt: text(item.felt, 1500),
    burden: text(item.burden, 1500), remains: text(item.remains, 1500) };
  return result;
}

// Allowlist stored fields: no hidden coordinates, identities, scores or imported decision history.
export function validatePathway(value: unknown): Pathway {
  const item = record(value);
  if (!Array.isArray(item.reviews) || item.reviews.length > MAX_REVIEWS) throw new Error('Invalid pathway reviews');
  const reviews = item.reviews.map(validateReview);
  if (new Set(reviews.map((review) => review.id)).size !== reviews.length) throw new Error('Duplicate review');
  const state = status(item.status);
  if (state !== (reviews.at(-1)?.status || 'idea')) throw new Error('A status needs a personal observation');
  return { id: text(item.id, 120, true), createdAt: timestamp(item.createdAt), updatedAt: timestamp(item.updatedAt),
    need: text(item.need, 1500, true), gift: text(item.gift, 1500), enablers: text(item.enablers, 1500),
    limits: text(item.limits, 1500), nextStep: text(item.nextStep, 1500), status: state,
    suggestion: item.suggestion === null ? null : validatePathwayResult(item.suggestion), reviews };
}

export function parsePathways(raw: string | null): Pathway[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > MAX_PATHWAYS) throw new Error('Invalid pathway history');
  const items = parsed.map(validatePathway);
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Duplicate pathway');
  return items;
}

export function withPathwayReview(pathway: Pathway, review: PathwayReview): Pathway {
  if (pathway.reviews.length >= MAX_REVIEWS) throw new Error('This pathway has 30 reviews. Start a new pathway to keep exploring.');
  const checked = validateReview(review);
  return validatePathway({ ...pathway, reviews: [...pathway.reviews, checked], status: checked.status, updatedAt: checked.createdAt });
}
