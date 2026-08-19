const DEFAULT_REALTIME_MODEL = 'gpt-realtime';
const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';

function asError(message, code = 'realtime_error') {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function realtimeSessionConfig({
  realtimeModel = DEFAULT_REALTIME_MODEL,
  transcriptionModel = DEFAULT_TRANSCRIPTION_MODEL
} = {}) {
  return {
    type: 'realtime',
    model: realtimeModel,
    output_modalities: ['text'],
    audio: {
      input: {
        noise_reduction: { type: 'near_field' },
        transcription: {
          model: transcriptionModel,
          language: 'en',
          prompt: 'British English. Expect terms including Rheo, Rheocracy, Reciprocal Wellbeing, CoArts, wellbeing, safeguarding, affordance and dialogue.'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 450,
          create_response: false,
          interrupt_response: false
        }
      }
    }
  };
}

export async function createRealtimeWebRTCCall({
  sdp,
  apiKey,
  realtimeModel = DEFAULT_REALTIME_MODEL,
  transcriptionModel = DEFAULT_TRANSCRIPTION_MODEL
}) {
  if (!apiKey) throw asError('OPENAI_API_KEY is not configured', 'missing_openai_key');
  if (typeof sdp !== 'string' || !sdp.includes('v=0')) {
    throw asError('A valid WebRTC SDP offer is required', 'invalid_sdp');
  }
  if (sdp.length > 250_000) throw asError('SDP offer is too large', 'invalid_sdp');

  const session = realtimeSessionConfig({ realtimeModel, transcriptionModel });
  const form = new FormData();
  form.append('sdp', new Blob([sdp], { type: 'application/sdp' }), 'offer.sdp');
  form.append('session', new Blob([JSON.stringify(session)], { type: 'application/json' }), 'session.json');

  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form
  });
  const answerSdp = await response.text();
  if (!response.ok) {
    let message = answerSdp;
    try { message = JSON.parse(answerSdp)?.error?.message || answerSdp; } catch {}
    throw asError(`OpenAI Realtime API ${response.status}: ${message}`, 'openai_realtime_error');
  }
  if (!answerSdp.includes('v=0')) throw asError('OpenAI returned an invalid SDP answer', 'invalid_realtime_answer');

  const location = response.headers.get('location') || '';
  const callId = location ? location.split('/').filter(Boolean).at(-1) : null;
  return { answerSdp, callId, realtimeModel, transcriptionModel };
}
