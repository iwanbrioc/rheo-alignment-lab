import { MAX_BRIEF_LENGTH, PREPARATION_CONSENT, validatePreparationResult } from '../../preparation_contract.mjs';
import type { PreparationResult, PreparationTask } from '../types/preparation';

type State = { task: PreparationTask | null; busy: boolean; storageError: string | null };
type Dependencies = {
  createId: () => string;
  now: () => string;
  choiceKey: string;
  selectedStep: string;
  save: (task: PreparationTask) => Promise<void>;
  execute: (id: string, brief: string, signal: AbortSignal) => Promise<PreparationResult>;
  onState: (state: State) => void;
};

export class PreparationSession {
  state: State;
  private epoch = 0;
  private abort: AbortController | null = null;
  private disposed = false;
  private writes: Promise<void> = Promise.resolve();

  constructor(initial: PreparationTask | null, private deps: Dependencies) {
    this.state = { task: initial?.status === 'running' ? { ...initial, status: 'interrupted',
      error: 'Research was interrupted. Review the brief before trying again.' } : initial, busy: false, storageError: null };
  }

  private update(state: State) {
    this.state = state;
    if (!this.disposed) this.deps.onState(state);
  }

  private save(task: PreparationTask): Promise<void> {
    const next = this.writes.then(() => this.deps.save(task));
    this.writes = next.catch(() => {});
    return next;
  }

  async start(brief: string): Promise<void> {
    if (this.disposed || this.state.busy) return;
    if (brief.trim().length < 20 || brief.length > MAX_BRIEF_LENGTH) {
      this.update({ ...this.state, storageError: 'Use a research brief between 20 and 2500 characters.' });
      return;
    }
    const epoch = ++this.epoch;
    const controller = new AbortController();
    this.abort = controller;
    const task: PreparationTask = { id: this.deps.createId(), choiceKey: this.deps.choiceKey,
      selectedStep: this.deps.selectedStep, brief: brief.trim(), consent: PREPARATION_CONSENT,
      approvedAt: this.deps.now(), updatedAt: this.deps.now(), status: 'running', result: null, error: null };
    this.update({ task, busy: true, storageError: null });
    try {
      await this.save(task);
    } catch {
      if (this.epoch !== epoch) return;
      this.update({ task: { ...task, status: 'failed', error: 'Research did not start.' }, busy: false,
        storageError: 'The decision and approval could not be saved. Return to your choice and save it before trying again.' });
      return;
    }
    if (this.epoch !== epoch || this.disposed) return;
    let next: PreparationTask;
    try {
      const result = validatePreparationResult(await this.deps.execute(task.id, task.brief, controller.signal));
      next = { ...task, status: result.status, result, updatedAt: this.deps.now() };
    } catch (error) {
      next = { ...task, status: 'failed', updatedAt: this.deps.now(),
        error: error instanceof Error && error.name === 'PreparationServiceError' ? error.message
          : 'Research could not finish. Nothing has been acted on. Check the connection and server setup, then review the brief to retry.' };
    }
    if (this.epoch !== epoch || this.disposed) return;
    this.update({ task: next, busy: true, storageError: null });
    try {
      await this.save(next);
      if (this.epoch === epoch) this.update({ task: next, busy: false, storageError: null });
    } catch {
      if (this.epoch === epoch) this.update({ task: next, busy: false,
        storageError: 'This result is visible here but could not be saved. Retry saving before leaving.' });
    }
  }

  async retrySave(): Promise<void> {
    const task = this.state.task;
    if (!task || this.state.busy || this.disposed) return;
    this.update({ ...this.state, busy: true });
    try {
      await this.save(task);
      this.update({ task, busy: false, storageError: null });
    } catch { this.update({ task, busy: false, storageError: 'The preparation could not be saved. You can retry.' }); }
  }

  async cancel(interrupted = false): Promise<void> {
    if (!this.state.busy || !this.state.task) return;
    if (this.state.task.status !== 'running') { await this.writes; return; }
    ++this.epoch;
    this.abort?.abort();
    const task: PreparationTask = { ...this.state.task,
      status: interrupted ? 'interrupted' : 'cancelled', result: null, updatedAt: this.deps.now(),
      error: interrupted ? 'Research stopped when you left Rheo. Review the brief to retry.' : 'Research cancelled. Nothing has been acted on.' };
    this.update({ task, busy: true, storageError: null });
    try {
      await this.save(task);
      this.update({ task, busy: false, storageError: null });
    } catch { this.update({ task, busy: false, storageError: 'Research stopped, but its status could not be saved.' }); }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await this.cancel(true);
  }
}
