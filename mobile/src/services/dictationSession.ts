import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import type { NativeSpeech } from './nativeSpeech';

export type DictationState = {
  phase: 'idle' | 'starting' | 'listening' | 'stopping' | 'cancelling';
  error: string | null;
};

export const DICTATION_OPTIONS = {
  lang: 'en-GB',
  interimResults: true,
  continuous: true,
  maxAlternatives: 1,
  addsPunctuation: true,
  iosTaskHint: 'dictation',
  recordingOptions: { persist: false },
} as const;

export function dictationError(code: string): string {
  switch (code) {
    case 'not-allowed': return 'Microphone or speech access is off. Check your phone settings, or type instead.';
    case 'no-speech': case 'speech-timeout': return 'No clear speech was heard. Try again or type instead.';
    case 'network': return 'Dictation lost its connection. Your text is still here. Try again or type instead.';
    case 'language-not-supported': return 'English dictation is not available on this phone. You can type instead.';
    case 'service-not-allowed': return 'Speech recognition is not available on this phone. You can type instead.';
    case 'interrupted': return 'Dictation was interrupted. Your text is still here.';
    default: return 'Dictation could not continue. Your text is still here. Try again or type instead.';
  }
}

export class DictationSession {
  state: DictationState = { phase: 'idle', error: null };
  private generation = 0;
  private disposed = false;
  private blocked = false;
  private started = false;
  private base = '';
  private complete: string[] = [];
  private partial = '';
  private listeners: { remove: () => void }[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private limit: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private engine: NativeSpeech,
    private onText: (text: string) => void,
    private onState: (state: DictationState) => void,
  ) {}

  get hasStarted() { return this.started; }

  private cancelled() { return this.state.phase === 'cancelling'; }

  private update(phase: DictationState['phase'], error = this.state.error) {
    this.state = { phase, error };
    if (!this.disposed) this.onState(this.state);
  }

  private finish() {
    clearTimeout(this.timer);
    clearTimeout(this.limit);
    this.listeners.forEach((listener) => listener.remove());
    this.listeners = [];
    this.started = false;
    this.generation++;
    this.update('idle');
  }

  async start(text: string): Promise<void> {
    if (this.disposed || this.blocked || this.state.phase !== 'idle') return;
    if (text.length >= 12_000) {
      this.update('idle', 'Your question is already long. Shorten it before adding more speech.');
      return;
    }
    const generation = ++this.generation;
    const current = () => generation === this.generation && !this.disposed;
    this.base = text;
    this.complete = [];
    this.partial = '';
    this.update('starting', null);
    try {
      if (!this.engine.isRecognitionAvailable()) {
        this.update('idle', dictationError('service-not-allowed'));
        return;
      }
      const permission = await this.engine.requestPermissionsAsync();
      if (!current()) return;
      if (this.cancelled()) { this.finish(); return; }
      if (!permission.granted) {
        this.update('idle', dictationError('not-allowed'));
        return;
      }
      this.listeners = [
        this.engine.addListener('start', () => {
          if (!current() || this.state.phase !== 'starting') return;
          clearTimeout(this.timer);
          this.update('listening');
          this.limit = setTimeout(() => this.stop(), 120_000);
        }),
        this.engine.addListener('result', (event) => { if (current()) this.result(event); }),
        this.engine.addListener('error', (event) => {
          if (!current() || this.state.phase === 'cancelling') return;
          this.cancel(dictationError(event.error));
        }),
        this.engine.addListener('nomatch', () => { if (current()) this.cancel(dictationError('no-speech')); }),
        this.engine.addListener('end', () => { if (current()) this.finish(); }),
      ];
      this.started = true;
      this.timer = setTimeout(() => this.cancel('Dictation did not start. Try again or type instead.'), 10_000);
      this.engine.start(DICTATION_OPTIONS);
    } catch {
      if (!current()) return;
      if (this.started) this.cancel(dictationError('unknown'));
      else { this.update('idle', dictationError('unknown')); this.finish(); }
    }
  }

  private result(event: ExpoSpeechRecognitionResultEvent) {
    if (!['starting', 'listening', 'stopping'].includes(this.state.phase)) return;
    const transcript = event.results[0]?.transcript.trim();
    // Empty final events must not erase words already shown on screen.
    if (!transcript) {
      if (event.isFinal && this.partial) { this.complete.push(this.partial); this.partial = ''; }
      return;
    }
    const spoken = [...this.complete, transcript].join(' ');
    const next = this.base ? `${this.base}\n\n${spoken}` : spoken;
    if (next.length > 12_000) {
      this.stop();
      this.update(this.state.phase, 'The question has reached its length limit. Check the text before asking Rheo.');
      return;
    }
    this.partial = transcript;
    if (event.isFinal) { this.complete.push(transcript); this.partial = ''; }
    this.onText(next);
  }

  stop() {
    if (this.state.phase === 'starting') { this.cancel(); return; }
    if (this.state.phase !== 'listening') return;
    clearTimeout(this.limit);
    this.update('stopping');
    this.timer = setTimeout(() => this.cancel('Dictation stopped before the last words were confirmed. Please check the text.'), 5_000);
    try { this.engine.stop(); }
    catch { this.cancel(dictationError('unknown')); }
  }

  cancel(message: string | null = null) {
    if (this.state.phase === 'idle' || this.state.phase === 'cancelling') return;
    clearTimeout(this.timer);
    clearTimeout(this.limit);
    this.update('cancelling', message);
    // Wait for an outstanding permission prompt without ever starting the mic.
    if (!this.started) return;
    this.timer = setTimeout(() => {
      // Native events have no session IDs. Do not start again without an end acknowledgement.
      this.blocked = true;
      this.update('cancelling', 'Dictation did not close cleanly. Reopen Rheo before speaking again. You can still type.');
      this.finish();
    }, 3_000);
    try { this.engine.abort(); }
    catch { /* The watchdog makes this recoverable through typing without another mic session. */ }
  }

  dispose() {
    this.disposed = true;
    if (this.started) {
      try { this.engine.abort(); } catch { /* Do not let teardown overwrite the existing question. */ }
    }
    this.finish();
  }
}
