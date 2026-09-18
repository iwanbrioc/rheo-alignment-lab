#!/usr/bin/env node
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { getLocalAffordanceContext } from './local_context_v0_1.mjs';
import { createVoiceHandler } from './voice_transcription.mjs';
import { createPreparationHandler, preparationEnabled } from './preparation_agent.mjs';
import { createPlainLanguageHandler } from './plain_language.mjs';
import { createPathwayHandler, pathwayEnabled } from './pathway_planner.mjs';

export function createLocalContextServer() {
const handleVoice = createVoiceHandler();
const handlePreparation = createPreparationHandler();
const handlePlainLanguage = createPlainLanguageHandler();
const handlePathway = createPathwayHandler();

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(text);
}
async function readJsonBody(req, max = 200_000) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Object.assign(new Error('request too large'), { code:'request_too_large' });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('invalid JSON'), { code:'invalid_json' }); }
}

return http.createServer(async (req,res) => {
  if (req.method === 'OPTIONS') return json(res,204,{});
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'POST' && url.pathname === '/api/pathway-plan') {
      return await handlePathway(req, res, json);
    }
    if (req.method === 'GET' && url.pathname === '/api/pathway-plan/health') {
      return json(res, 200, { enabled: pathwayEnabled(), capability: 'pathway-possibility-v1', externalActions: false });
    }
    if (req.method === 'POST' && url.pathname === '/api/plain-actions') {
      return await handlePlainLanguage(req, res, json);
    }
    if (req.method === 'POST' && url.pathname === '/api/preparation') {
      return await handlePreparation(req, res, json);
    }
    if (req.method === 'GET' && url.pathname === '/api/preparation/health') {
      return json(res, 200, { enabled: preparationEnabled(), capability: 'research-and-draft-v1', externalActions: false });
    }
    if (req.method === 'POST' && url.pathname === '/api/voice/transcribe') {
      return await handleVoice(req, res, json);
    }
    if (req.method === 'GET' && url.pathname === '/api/voice/health') {
      return json(res, 200, { enabled: process.env.RHEO_VOICE_PROVIDER === 'openai' && Boolean(process.env.OPENAI_API_KEY) });
    }
    if (req.method === 'GET' && url.pathname === '/api/local-health') {
      return json(res,200,{ version:'0.1.0', provider:process.env.LOCAL_CONTEXT_PROVIDER || 'fixture', storesLocation:false });
    }
    if (req.method === 'POST' && url.pathname === '/api/local-context') {
      const body = await readJsonBody(req);
      const result = await getLocalAffordanceContext(body);
      return json(res,200,{ ...result, retrievedAt:new Date().toISOString() });
    }
    return json(res,404,{ error:'not found', errorCode:'not_found' });
  } catch (e) {
    const status = ['invalid_json','request_too_large','invalid_local_context_request'].includes(e.code) ? 400 : e.code === 'local_provider_configuration' ? 503 : 502;
    return json(res,status,{ error:e.message,errorCode:e.code || 'local_context_error' });
  }
});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const PORT = Number(process.env.LOCAL_CONTEXT_PORT || 8081);
  createLocalContextServer().listen(PORT, () => {
    console.log(`Rheo local-context prototype listening on http://localhost:${PORT} (provider=${process.env.LOCAL_CONTEXT_PROVIDER || 'fixture'})`);
  });
}
