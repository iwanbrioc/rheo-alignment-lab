import { MAX_BRIEF_LENGTH, PREPARATION_CONSENT, validatePreparationResult } from '../../preparation_contract.mjs';
import type { DecisionSession } from '../types/decision';
import type { PreparationTask } from '../types/preparation';
import { getChosenAction } from './decisionSession';

export function chosenPreparationStep(session: DecisionSession): string | null {
  if (session.choice?.kind === 'custom') return session.choice.text.trim() || null;
  if (session.recommendation?.actionMeta.provider === 'fixture') return null;
  return getChosenAction(session)?.action || null;
}

export function preparationChoiceKey(session: DecisionSession): string {
  const choice = session.choice;
  return JSON.stringify([session.id, session.situation, session.areaLabel, session.recommendation?.id,
    choice?.kind, choice?.capturedAt, choice?.kind === 'recommended' ? choice.actionId : choice?.kind === 'custom' ? choice.text : null]);
}

export function defaultPreparationBrief(session: DecisionSession): string {
  const step = chosenPreparationStep(session) || '';
  return `My chosen step: ${step}\n\nMy question: ${session.situation}\n${session.areaLabel ? `Area: ${session.areaLabel}\n` : ''}\nCheck public websites for this step. Write a draft message or checklist in simple English. Tell me what I still need to do. Do not send anything.`.slice(0, MAX_BRIEF_LENGTH);
}

export function preparationTasks(session: DecisionSession): PreparationTask[] {
  if (!Array.isArray(session.preparations)) return [];
  return session.preparations.slice(0, 10).flatMap((task) => {
    try {
      if (!task || !/^prep-[a-zA-Z0-9-]{8,80}$/.test(task.id) || task.consent !== PREPARATION_CONSENT
        || typeof task.choiceKey !== 'string' || typeof task.selectedStep !== 'string'
        || typeof task.brief !== 'string' || task.brief.length > MAX_BRIEF_LENGTH
        || !Number.isFinite(Date.parse(task.approvedAt)) || !Number.isFinite(Date.parse(task.updatedAt))
        || !['running', 'prepared', 'needs_you', 'failed', 'cancelled', 'interrupted'].includes(task.status)) return [];
      const result = task.result ? validatePreparationResult(task.result) : null;
      if ((task.status === 'prepared' || task.status === 'needs_you') && result?.status !== task.status) return [];
      return [{ id: task.id, choiceKey: task.choiceKey, selectedStep: task.selectedStep,
        brief: task.brief, consent: task.consent, approvedAt: task.approvedAt, updatedAt: task.updatedAt,
        status: task.status, result, error: typeof task.error === 'string' ? task.error.slice(0, 1000) : null }];
    } catch { return []; }
  });
}

export function latestPreparation(session: DecisionSession): PreparationTask | null {
  const key = preparationChoiceKey(session);
  return preparationTasks(session).filter((task) => task.choiceKey === key).at(-1) || null;
}

export function preparationStatus(task: PreparationTask): string {
  return ({ running: 'Research interrupted', prepared: 'Preparation ready', needs_you: 'Needs your input',
    failed: 'Preparation could not finish', cancelled: 'Preparation cancelled', interrupted: 'Research interrupted' })[task.status];
}
