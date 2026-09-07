import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

const VOICE_API_URL = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || 'http://localhost:8081';

export async function transcribeVoiceNote(uri: string, signal: AbortSignal): Promise<string> {
  const file = new File(uri);
  if (!file.exists || file.size === 0 || file.size > 4 * 1024 * 1024) {
    throw new Error('The recording is unavailable or too large. Record again or type instead.');
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);
  if (signal.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetch(`${VOICE_API_URL}/api/voice/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'audio/mp4' },
      body: file,
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Voice transcription is unavailable. You can type instead.');
    }
    if (typeof data?.text !== 'string' || !data.text.trim()) {
      throw new Error('No words came back. Record again or type instead.');
    }
    return data.text.trim();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Voice transcription was cancelled or took too long. You can try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', onAbort);
  }
}
