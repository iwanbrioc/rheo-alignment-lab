import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createExperimentalServer } from '../../experiments/rheo-v0.10/server.mjs';
import { createLocalContextServer } from '../local_context_server.mjs';
import { authenticate, createBudget, parseInvites } from './access.mjs';

const routes = new Map([
  ['/api/v0.10/decision', { core: true, bytes: 48000, cost: 1, type: 'application/json' }],
  ['/api/local-context', { bytes: 20000, cost: 1, type: 'application/json' }],
  ['/api/pathway-plan', { bytes: 12000, cost: 1, type: 'application/json' }],
  ['/api/preparation', { bytes: 12000, cost: 2, type: 'application/json' }],
  ['/api/voice/transcribe', { bytes: 4 * 1024 * 1024, cost: 1, type: 'audio/mp4' }],
]);

export function createBetaServer({ invites, budget, requireHttps = true,
  core = createExperimentalServer(), helperFactory = createLocalContextServer } = {}) {
  if (!invites?.length || !budget) throw new Error('Private-test authentication and limits are required.');
  const helpers = new Map();
  const activeInvites = new Set();
  let active = 0;
  const send = (res, status, body) => {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff', 'strict-transport-security': 'max-age=31536000' });
    res.end(JSON.stringify(body));
  };
  return http.createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 8192 }, (req, res) => {
    // Health is intentionally data-free and does not invoke a provider.
    if (req.method === 'GET' && req.url === '/api/health') return send(res, 200, { ok: true, privateBeta: true, version: '0.10-experimental' });
    if (req.headers.origin || req.headers['sec-fetch-site']) return send(res, 403, { error: 'Use the Rheo phone app.' });
    // Render terminates TLS and sets this header. Do not put this listener directly on the internet.
    if (requireHttps && req.headers['x-forwarded-proto'] !== 'https') return send(res, 403, { error: 'A secure connection is required.' });
    const identity = authenticate(req.headers.authorization, invites);
    if (!identity) return send(res, 401, { error: 'Your test access has expired or is not valid. Open Private test access to enter a new code.' });
    if (req.method === 'GET' && req.url === '/api/beta/access') return send(res, 200, { ok: true, privateBeta: true });
    const route = routes.get(req.url);
    if (!route) return send(res, 404, { error: 'This service is not available in the private test.' });
    if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
    if ((req.headers['content-type'] || '').split(';')[0].toLowerCase() !== route.type) return send(res, 415, { error: 'Unsupported request type.' });
    if (active >= 2 || activeInvites.has(identity)) return send(res, 429, { error: 'Rheo is busy. Please try again shortly.' });
    if (Number(req.headers['content-length']) > route.bytes) return send(res, 413, { error: 'This request is too large.' });
    active++; activeInvites.add(identity);
    let size = 0;
    let released = false;
    const release = () => {
      if (released) return;
      released = true; active--; activeInvites.delete(identity);
      clearTimeout(deadline); clearTimeout(uploadDeadline);
      req.off('data', onData);
    };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > route.bytes) { send(res, 413, { error: 'This request is too large.' }); req.destroy(); }
    };
    const deadline = setTimeout(() => { send(res, 504, { error: 'Rheo took too long. Please try again.' }); req.destroy(); }, 140000);
    const uploadDeadline = setTimeout(() => { send(res, 408, { error: 'The upload took too long.' }); req.destroy(); }, 15000);
    res.once('close', release);
    req.once('end', () => clearTimeout(uploadDeadline));
    // Installing this listener does not yield before the existing handler attaches its reader.
    req.on('data', onData);
    try {
      if (!budget.admit(identity, route.cost)) { release(); return send(res, 429, { error: 'The private test has reached its daily limit. Please try tomorrow.' }); }
      // Internal handlers need neither the bearer code nor the external Host header.
      delete req.headers.authorization;
      req.headers.host = 'localhost';
      if (route.core) core.emit('request', req, res);
      else {
        // Preparation retries/cache are isolated by invitation, not shared across testers.
        if (!helpers.has(identity)) helpers.set(identity, helperFactory());
        helpers.get(identity).emit('request', req, res);
      }
    } catch {
      release(); send(res, 503, { error: 'Private test access is temporarily unavailable. Please try later.' });
    }
  });
}

export function startBetaServer() {
  const invites = parseInvites(process.env.RHEO_BETA_INVITES);
  if (!process.env.RHEO_BETA_USAGE_FILE) throw new Error('A persistent RHEO_BETA_USAGE_FILE is required.');
  if (process.env.RENDER !== 'true') throw new Error('This entry point requires Render TLS termination. Use the test harness for local checks.');
  const server = createBetaServer({ invites, budget: createBudget({ file: process.env.RHEO_BETA_USAGE_FILE }) });
  server.listen(Number(process.env.PORT || 10000), '0.0.0.0', () => console.log('Rheo private test ready; invitation required.'));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startBetaServer();
