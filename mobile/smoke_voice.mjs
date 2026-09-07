#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createVoiceHandler, MAX_VOICE_BYTES, transcribeVoice } from './voice_transcription.mjs';

const { outputText } = ts.transpileModule(readFileSync(new URL('./src/services/voiceSession.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
vm.runInNewContext(outputText, { module, exports: module.exports, AbortController, Error });
const { VoiceSession, appendVoiceText } = module.exports;

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function setup(overrides = {}) {
  const calls = [];
  const text = [];
  const session = new VoiceSession({
    prepare: async () => { calls.push('prepare'); },
    record: () => { calls.push('record'); },
    stop: async () => { calls.push('stop'); return 'file:///test.m4a'; },
    cleanup: async () => { calls.push('cleanup'); },
    transcribe: async () => { calls.push('transcribe'); return 'My question.'; },
    onState: () => {},
    onText: (value) => text.push(value),
    ...overrides,
  });
  return { session, calls, text };
}

const basic = setup();
assert.equal(basic.session.state.phase, 'idle');
assert.deepEqual(basic.calls, [], 'mount must not request permission, record or upload');
await Promise.all([basic.session.start(), basic.session.start()]);
assert.deepEqual(basic.calls, ['prepare', 'record'], 'double taps must not start two recordings');
await basic.session.stop();
assert.equal(basic.session.state.phase, 'ready');
assert.ok(!basic.calls.includes('transcribe'), 'stopping alone must not send audio');
await basic.session.transcribe();
assert.deepEqual(basic.text, ['My question.']);
assert.equal(basic.session.state.phase, 'idle');
assert.equal(basic.calls.at(-1), 'cleanup');
assert.equal(appendVoiceText('Existing text.', 'More words.'), 'Existing text.\n\nMore words.');

const denied = setup({ prepare: async () => { throw new Error('Microphone access is off.'); } });
await denied.session.start();
assert.equal(denied.session.state.phase, 'idle');
assert.match(denied.session.state.error, /Microphone/);
assert.ok(!denied.calls.includes('record'));

const permission = deferred();
const earlyCancel = setup({ prepare: () => permission.promise });
const starting = earlyCancel.session.start();
const cancelling = earlyCancel.session.cancel();
assert.equal(earlyCancel.session.state.phase, 'cancelling');
permission.resolve();
await Promise.all([starting, cancelling]);
assert.deepEqual(earlyCancel.calls, ['cleanup'], 'permission arriving after cancellation must not start the mic');

const discarded = setup();
await discarded.session.start();
await discarded.session.stop();
await discarded.session.cancel();
assert.deepEqual(discarded.text, []);
assert.ok(!discarded.calls.includes('transcribe'));

let uploadSignal;
const late = deferred();
const cancelledUpload = setup({ transcribe: (_uri, signal) => { uploadSignal = signal; return late.promise; } });
await cancelledUpload.session.start();
await cancelledUpload.session.stop();
const uploading = cancelledUpload.session.transcribe();
const aborting = cancelledUpload.session.cancel();
assert.equal(uploadSignal.aborted, true);
late.resolve('This late result must be ignored.');
await Promise.all([uploading, aborting]);
assert.deepEqual(cancelledUpload.text, []);
assert.equal(cancelledUpload.session.state.phase, 'idle');

let tries = 0;
const retry = setup({ transcribe: async () => { if (++tries === 1) throw new Error('Network unavailable'); return 'Retried words.'; } });
await retry.session.start();
await retry.session.stop();
await retry.session.transcribe();
assert.equal(retry.session.state.phase, 'ready');
assert.match(retry.session.state.error, /Network/);
await retry.session.transcribe();
assert.deepEqual(retry.text, ['Retried words.']);

const unmounted = setup();
await unmounted.session.start();
await unmounted.session.dispose();
await unmounted.session.start();
assert.deepEqual(unmounted.calls, ['prepare', 'record', 'cleanup']);
assert.deepEqual(unmounted.text, []);

const cleanupFailure = setup({ cleanup: async () => { throw new Error('disk error'); } });
await cleanupFailure.session.cancel();
assert.match(cleanupFailure.session.state.error, /temporary audio file/);

const oldKey = process.env.OPENAI_API_KEY;
const oldProvider = process.env.RHEO_VOICE_PROVIDER;
let browserStatus;
await createVoiceHandler()({ headers: { origin: 'https://untrusted.example' } }, {}, (_res, status) => { browserStatus = status; });
assert.equal(browserStatus, 403, 'web pages must not be allowed to spend the LAN server API quota');
try {
  delete process.env.RHEO_VOICE_PROVIDER;
  await assert.rejects(transcribeVoice(Buffer.from('test audio'), 'audio/mp4'), { status: 503 });
  process.env.RHEO_VOICE_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-key-not-a-secret';
  let sent = 0;
  const provider = async (url, options) => {
    sent++;
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
    assert.equal(options.headers.Authorization, 'Bearer test-key-not-a-secret');
    assert.equal(options.body.get('model'), 'gpt-4o-mini-transcribe');
    assert.deepEqual([...options.body.keys()], ['file', 'model', 'response_format']);
    assert.equal(await options.body.get('file').text(), 'test audio');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ text: '  My spoken question.  ' });
  };
  const result = await transcribeVoice(Buffer.from('test audio'), 'audio/mp4', { fetchImpl: provider });
  assert.deepEqual(result, { text: 'My spoken question.' });
  await assert.rejects(transcribeVoice(Buffer.alloc(MAX_VOICE_BYTES + 1), 'audio/mp4', { fetchImpl: provider }), { status: 413 });
  await assert.rejects(transcribeVoice(Buffer.alloc(0), 'audio/mp4', { fetchImpl: provider }), { status: 413 });
  await assert.rejects(transcribeVoice(Buffer.from('test audio'), 'text/html', { fetchImpl: provider }), { status: 415 });
  assert.equal(sent, 1, 'invalid uploads must never reach OpenAI');
  await assert.rejects(transcribeVoice(Buffer.from('test audio'), 'audio/mp4', {
    fetchImpl: async () => Response.json({ error: 'private provider detail' }, { status: 500 }),
  }), (error) => error.status === 502 && !error.message.includes('private'));
  await assert.rejects(transcribeVoice(Buffer.from('test audio'), 'audio/mp4', {
    fetchImpl: async () => Response.json({ text: '  ' }),
  }), { status: 422 });
} finally {
  if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = oldKey;
  if (oldProvider === undefined) delete process.env.RHEO_VOICE_PROVIDER;
  else process.env.RHEO_VOICE_PROVIDER = oldProvider;
}

console.log('mobile voice smoke PASS | explicit recording/upload | permission denial | cancellation races | retry | cleanup | bounded uploads | server-only key | browser-origin rejection');
