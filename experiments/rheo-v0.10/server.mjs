import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { decide } from './engine.mjs';
import { validateRequest } from './validation.mjs';

export function createExperimentalServer({ run = decide, timeoutMs = 80000 } = {}) {
  let active = 0;
  const starts = [];
  return http.createServer({ requestTimeout: 15000, headersTimeout: 10000 }, async (req, res) => {
    const send = (status, data) => {
      if (!res.destroyed && !res.writableEnded) {
        res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify(data));
      }
    };
    if (req.headers.origin) return send(403, { error: 'Browser requests are not enabled for this local alpha server.' });
    if (req.url === '/api/health' && req.method === 'GET') return send(200, { version: '0.10-experimental', provider: process.env.RHEO_MODEL_PROVIDER || 'fixture', researchUsable: false });
    if (req.url !== '/api/v0.10/decision') return send(404, { error: 'Unknown endpoint.' });
    if (req.method !== 'POST') return send(405, { error: 'Use POST.' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(415, { error: 'Use JSON.' });
    while (starts.length && Date.now() - starts[0] > 3600000) starts.shift();
    if (active >= 2 || starts.length >= 40) return send(429, { error: 'Rheo is busy. Please try again later.' });
    active += 1;
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    const timer = setTimeout(() => { controller.abort(); send(504, { error: 'Rheo took too long. Please try again.' }); }, timeoutMs);
    const uploadTimer = setTimeout(() => { controller.abort(); send(408, { error: 'Request upload took too long.' }); req.destroy(); }, 15000);
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 48000) { send(413, { error: 'This question is too large.' }); return; }
        chunks.push(chunk);
      }
      clearTimeout(uploadTimer);
      let request;
      try { request = validateRequest(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (error) { return send(400, { error: error instanceof SyntaxError ? 'Invalid JSON.' : error.message }); }
      if (controller.signal.aborted) return;
      starts.push(Date.now());
      const result = await run(request, { signal: controller.signal });
      if (!controller.signal.aborted) send(200, result);
    } catch {
      if (!controller.signal.aborted) send(502, { error: 'Rheo could not produce checked options. Your question is still here. Please try again.' });
    } finally {
      clearTimeout(timer);
      clearTimeout(uploadTimer);
      res.off('close', disconnect);
      active -= 1;
    }
  });
}
export function startExperimentalServer() {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8080);
  const server = createExperimentalServer();
  server.listen(port, host, () => console.log(`Rheo 0.10 experimental listening on ${host}:${port}; no authentication, trusted development network only.`));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startExperimentalServer();
