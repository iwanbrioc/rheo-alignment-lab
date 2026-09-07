export type VoicePhase = 'idle' | 'starting' | 'recording' | 'stopping' | 'ready' | 'transcribing' | 'cancelling';
export type VoiceState = { phase: VoicePhase; error: string | null };
type VoiceDependencies = {
  prepare: () => Promise<void>;
  record: () => void;
  stop: () => Promise<string>;
  cleanup: () => Promise<void>;
  transcribe: (uri: string, signal: AbortSignal) => Promise<string>;
  onText: (text: string) => void;
  onState: (state: VoiceState) => void;
};

export function appendVoiceText(existing: string, transcript: string): string {
  return [existing.trim(), transcript.trim()].filter(Boolean).join('\n\n');
}

export class VoiceSession {
  state: VoiceState = { phase: 'idle', error: null };
  private pending: Promise<void> = Promise.resolve();
  private cancelled = false;
  private disposed = false;
  private abort: AbortController | null = null;
  private uri: string | null = null;

  constructor(private dependencies: VoiceDependencies) {}

  private update(phase: VoicePhase, error: string | null = null) {
    this.state = { phase, error };
    if (!this.disposed) this.dependencies.onState(this.state);
  }

  private async cleanup() {
    this.uri = null;
    try {
      await this.dependencies.cleanup();
      return null;
    } catch {
      return 'Rheo could not remove the temporary audio file. It may remain in this device\'s cache.';
    }
  }

  start(): Promise<void> {
    if (this.disposed || this.state.phase !== 'idle') return this.pending;
    this.cancelled = false;
    this.update('starting');
    this.pending = (async () => {
      try {
        await this.dependencies.prepare();
        if (this.cancelled) return;
        this.dependencies.record();
        this.update('recording');
      } catch (error) {
        if (!this.cancelled) {
          const cleanupError = await this.cleanup();
          if (this.cancelled) return;
          this.update('idle', cleanupError || (error instanceof Error ? error.message : 'Microphone unavailable. You can type instead.'));
        }
      }
    })();
    return this.pending;
  }

  stop(): Promise<void> {
    if (this.disposed || this.state.phase !== 'recording') return this.pending;
    this.update('stopping');
    this.pending = (async () => {
      try {
        this.uri = await this.dependencies.stop();
        if (!this.cancelled) this.update('ready');
      } catch {
        if (!this.cancelled) {
          const cleanupError = await this.cleanup();
          if (this.cancelled) return;
          this.update('idle', cleanupError || 'The recording was interrupted. Please record again or type instead.');
        }
      }
    })();
    return this.pending;
  }

  transcribe(): Promise<void> {
    if (this.disposed || this.state.phase !== 'ready' || !this.uri) return this.pending;
    this.abort = new AbortController();
    this.update('transcribing');
    this.pending = (async () => {
      try {
        const text = await this.dependencies.transcribe(this.uri!, this.abort!.signal);
        if (this.cancelled) return;
        const cleanupError = await this.cleanup();
        if (this.cancelled) return;
        this.dependencies.onText(text);
        this.update('idle', cleanupError);
      } catch (error) {
        if (!this.cancelled) this.update('ready', error instanceof Error ? error.message : 'Transcription failed. Try again or type instead.');
      }
    })();
    return this.pending;
  }

  cancel(message: string | null = null): Promise<void> {
    if (this.state.phase === 'cancelling') return this.pending;
    this.cancelled = true;
    this.abort?.abort();
    const previous = this.pending;
    this.update('cancelling');
    this.pending = (async () => {
      await previous;
      const cleanupError = await this.cleanup();
      this.update('idle', cleanupError || message);
    })();
    return this.pending;
  }

  dispose(): Promise<void> {
    this.disposed = true;
    return this.cancel();
  }
}
