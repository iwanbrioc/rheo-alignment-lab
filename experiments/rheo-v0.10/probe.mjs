import { mkdir, writeFile } from 'node:fs/promises';
import { cases } from './cases.mjs';
import { decide } from './engine.mjs';

const output = process.env.RHEO_PROBE_OUTPUT;
if (!output || !process.env.OPENAI_API_KEY) throw new Error('Set RHEO_PROBE_OUTPUT outside frozen evaluation and OPENAI_API_KEY.');
if (output.includes('/evaluation/')) throw new Error('Do not write probes to frozen evaluation.');
await mkdir(output, { recursive: true });
const results = [];
for (const c of cases.filter((c) => !process.env.RHEO_PROBE_CASE || c.id === process.env.RHEO_PROBE_CASE)) {
  const request = { caseId: `v010-${c.id}`, situation: c.situation, localContext: null, review: null };
  const started = Date.now();
  try {
    const result = await decide(request, { provider: 'openai', signal: AbortSignal.timeout(80000) });
    const record = { case: c, durationMs: Date.now() - started, result };
    results.push(record);
    await writeFile(`${output}/${c.id}.json`, JSON.stringify(record, null, 2));
    console.log(`${c.id}: valid response, ${record.durationMs}ms; semantic review still required`);
  } catch (error) {
    results.push({ case: c, durationMs: Date.now() - started, error: error.message, rejectedOutput: error.rejectedOutput });
    console.log(`${c.id}: FAILED ${error.message}`);
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
if (results.some((r) => r.error)) process.exitCode = 1;
