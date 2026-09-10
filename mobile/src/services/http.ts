import { fetch } from 'expo/fetch';

type RequestOptions = { signal?: AbortSignal; timeoutMs?: number };

export async function postJson<T>(baseUrl: string, path: string, body: unknown, { signal, timeoutMs = 90_000 }: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) abort();
  const timer = setTimeout(() => { timedOut = true; abort(); }, timeoutMs);
  try {
    if (controller.signal.aborted) throw new Error('Request stopped');
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error : `Request failed: ${response.status}`;
      throw new Error(message);
    }
    return data as T;
  } catch (error) {
    if (signal?.aborted) throw Object.assign(new Error('Request stopped. Your question is still here.'), { name: 'AbortError' });
    if (timedOut) throw Object.assign(new Error('Rheo took too long to reply. Your question is still here. Please try again.'), { name: 'TimeoutError' });
    if (error instanceof SyntaxError) throw new Error('Rheo sent a reply that could not be read. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
