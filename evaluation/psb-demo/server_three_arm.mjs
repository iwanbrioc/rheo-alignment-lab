#!/usr/bin/env node
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Development-only wrapper for PSB-DEMO-003.
// It does not alter the Rheo or matched-control prompts. It creates a temporary
// copy of the existing server with one additional comparison condition wired in.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SOURCE = path.join(ROOT, 'server.mjs');
const TEMP = path.join(ROOT, '.psb-demo-three-arm-server.tmp.mjs');

let text = await readFile(SOURCE, 'utf8');

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`Could not patch ${label}: expected server.mjs marker not found`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`Could not patch ${label}: marker occurs more than once`);
  return source.replace(from, to);
}

text = replaceOnce(
  text,
  `const PROMPTS = {\n  rheo: path.join(HERE, 'prompts', 'rheo-v0.3-system-prompt.md'),\n  control: path.join(HERE, 'prompts', 'control-v0.3-system-prompt.md')\n};`,
  `const PROMPTS = {\n  rheo: path.join(HERE, 'prompts', 'rheo-v0.3-system-prompt.md'),\n  control: path.join(HERE, 'prompts', 'control-v0.3-system-prompt.md'),\n  future_generations: path.join(HERE, 'prompts', 'future-generations-v0.3-system-prompt.md')\n};`,
  'PROMPTS'
);

text = replaceOnce(
  text,
  `const [schemaText, rheoPrompt, controlPrompt] = await Promise.all([\n  readFile(SCHEMA_PATH, 'utf8'),\n  readFile(PROMPTS.rheo, 'utf8'),\n  readFile(PROMPTS.control, 'utf8')\n]);\nconst schema = JSON.parse(schemaText);\nconst prompts = { rheo: rheoPrompt, control: controlPrompt };`,
  `const [schemaText, rheoPrompt, controlPrompt, futureGenerationsPrompt] = await Promise.all([\n  readFile(SCHEMA_PATH, 'utf8'),\n  readFile(PROMPTS.rheo, 'utf8'),\n  readFile(PROMPTS.control, 'utf8'),\n  readFile(PROMPTS.future_generations, 'utf8')\n]);\nconst schema = JSON.parse(schemaText);\nconst prompts = { rheo: rheoPrompt, control: controlPrompt, future_generations: futureGenerationsPrompt };`,
  'prompt loading'
);

text = replaceOnce(
  text,
  `const condition = body.condition === 'control' ? 'control' : body.condition === 'rheo' ? 'rheo' : null;\n      if (!condition) return json(res, 400, {error:'condition must be rheo or control', errorCode:'invalid_condition'});`,
  `const condition = ['rheo','control','future_generations'].includes(body.condition) ? body.condition : null;\n      if (!condition) return json(res, 400, {error:'condition must be rheo, control, or future_generations', errorCode:'invalid_condition'});`,
  'condition parser'
);

await writeFile(TEMP, text, 'utf8');
try {
  await import(`${pathToFileURL(TEMP).href}?v=${Date.now()}`);
  // The module has loaded and the HTTP server owns its runtime state; the
  // temporary source file is no longer needed.
  await unlink(TEMP).catch(() => {});
} catch (err) {
  await unlink(TEMP).catch(() => {});
  throw err;
}
