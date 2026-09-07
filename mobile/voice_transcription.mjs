export const MAX_VOICE_BYTES = 4 * 1024 * 1024;
const formats = new Map([['audio/mp4', 'm4a'], ['audio/webm', 'webm'], ['audio/wav', 'wav']]);

function failure(message, status = 502) {
  return Object.assign(new Error(message), { status, code: 'voice_transcription_error' });
}

export async function transcribeVoice(audio, contentType, { signal, fetchImpl = fetch } = {}) {
  const extension = formats.get(contentType);
  if (!extension) throw failure('Unsupported recording format. Try recording again or type instead.', 415);
  if (!audio.length || audio.length > MAX_VOICE_BYTES) {
    throw failure('Record a short voice note, up to two minutes.', 413);
  }
  if (process.env.RHEO_VOICE_PROVIDER !== 'openai' || !process.env.OPENAI_API_KEY) {
    throw failure('Voice transcription is not configured. You can still type your question.', 503);
  }

  const form = new FormData();
  form.append('file', new Blob([audio], { type: contentType }), `voice.${extension}`);
  form.append('model', 'gpt-4o-mini-transcribe');
  form.append('response_format', 'json');
  const timeout = AbortSignal.timeout(45_000);
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch {
    throw failure('Voice transcription could not connect. Try again or type instead.');
  }
  if (!response.ok) {
    // Never echo provider responses, which may contain private request details.
    throw failure('Voice transcription is unavailable. Try again or type instead.', response.status === 429 ? 429 : 502);
  }
  let data;
  try { data = await response.json(); }
  catch { throw failure('The transcription was unreadable. Try again or type instead.'); }
  if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 12_000) {
    throw failure('No usable words came back. Try again or type instead.', 422);
  }
  return { text: data.text.trim() };
}

// Bounded in-memory uploads only. No audio or transcripts are written to disk or logs.
export function createVoiceHandler() {
  let active = 0;
  let nextRequestAt = 0;
  return async function handleVoice(req, res, json) {
    // Native clients send no Origin. A web page must not spend the LAN server's API quota.
    if (req.headers.origin) {
      return json(res, 403, { error: 'Voice transcription is available from the mobile app only.' });
    }
    if (active >= 2 || Date.now() < nextRequestAt) {
      return json(res, 429, { error: 'Voice transcription is busy. Please try again shortly.' });
    }
    const contentType = (req.headers['content-type'] || '').split(';')[0];
    if (!formats.has(contentType)) return json(res, 415, { error: 'Unsupported recording format.' });
    if (Number(req.headers['content-length']) > MAX_VOICE_BYTES) {
      return json(res, 413, { error: 'The voice note is too large. Record up to two minutes.' });
    }
    active++;
    nextRequestAt = Date.now() + 1000;
    const abort = new AbortController();
    const onClose = () => { if (!res.writableEnded) abort.abort(); };
    res.on('close', onClose);
    const uploadTimeout = setTimeout(() => req.destroy(), 20_000);
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_VOICE_BYTES) {
          json(res, 413, { error: 'The voice note is too large. Record up to two minutes.' });
          return;
        }
        chunks.push(chunk);
      }
      clearTimeout(uploadTimeout);
      const result = await transcribeVoice(Buffer.concat(chunks), contentType, { signal: abort.signal });
      if (!res.destroyed) json(res, 200, result);
    } catch (error) {
      if (!res.destroyed) json(res, error.status || 502, { error: error.status ? error.message : 'Voice transcription failed. Try again or type instead.' });
    } finally {
      clearTimeout(uploadTimeout);
      res.removeListener('close', onClose);
      active--;
    }
  };
}
