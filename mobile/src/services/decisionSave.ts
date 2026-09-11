import type { DecisionSession } from '../types/decision';

export type DecisionSaveState = {
  status: 'idle' | 'saving' | 'saved' | 'failed';
  pending: DecisionSession | null;
  error: string | null;
};

export class DecisionSave {
  state: DecisionSaveState = { status: 'idle', pending: null, error: null };

  constructor(private write: (session: DecisionSession) => Promise<void>, private changed: (state: DecisionSaveState) => void) {}

  private update(state: DecisionSaveState) {
    this.state = state;
    this.changed(state);
  }

  reset() {
    if (this.state.status === 'saving') return false;
    this.update({ status: 'idle', pending: null, error: null });
    return true;
  }

  async save(session: DecisionSession): Promise<boolean> {
    if (this.state.status === 'saving') return false;
    this.update({ status: 'saving', pending: session, error: null });
    try {
      await this.write(session);
      this.update({ status: 'saved', pending: null, error: null });
      return true;
    } catch {
      this.update({ status: 'failed', pending: session,
        error: 'This decision is not saved yet. Keep Rheo open and try saving again.' });
      return false;
    }
  }

  async retry(): Promise<boolean> {
    if (this.state.status !== 'failed' || !this.state.pending) return false;
    return this.save(this.state.pending);
  }
}
