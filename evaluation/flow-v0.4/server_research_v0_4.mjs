#!/usr/bin/env node
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Research-only shared-map server for v0.4 continuity reruns.
// It preserves the frozen structural-map schema and existing comparison prompts.
// The explicit Rheo physiology is used internally only by rheo_v0_4.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SOURCE = path.join(ROOT, 'server.mjs');
const TEMP = path.join(ROOT, '.flow-v0-4-research-server.tmp.mjs');

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
  `const PROMPTS = {\n  rheo: path.join(HERE, 'prompts', 'rheo-v0.3-system-prompt.md'),\n  rheo_v0_4: path.join(HERE, 'prompts', 'rheo-v0.4-flow-system-prompt.md'),\n  control: path.join(HERE, 'prompts', 'control-v0.3-system-prompt.md'),\n  future_generations: path.join(HERE, 'prompts', 'future-generations-v0.3-system-prompt.md')\n};`,
  'research prompt paths'
);

text = replaceOnce(
  text,
  `const [schemaText, rheoPrompt, controlPrompt] = await Promise.all([\n  readFile(SCHEMA_PATH, 'utf8'),\n  readFile(PROMPTS.rheo, 'utf8'),\n  readFile(PROMPTS.control, 'utf8')\n]);\nconst schema = JSON.parse(schemaText);\nconst prompts = { rheo: rheoPrompt, control: controlPrompt };`,
  `const [schemaText, rheoPrompt, rheoV04Prompt, controlPrompt, futureGenerationsPrompt] = await Promise.all([\n  readFile(SCHEMA_PATH, 'utf8'),\n  readFile(PROMPTS.rheo, 'utf8'),\n  readFile(PROMPTS.rheo_v0_4, 'utf8'),\n  readFile(PROMPTS.control, 'utf8'),\n  readFile(PROMPTS.future_generations, 'utf8')\n]);\nconst schema = JSON.parse(schemaText);\nconst prompts = { rheo:rheoPrompt, rheo_v0_4:rheoV04Prompt, control:controlPrompt, future_generations:futureGenerationsPrompt };`,
  'research prompt loading'
);

text = replaceOnce(
  text,
  `const condition = body.condition === 'control' ? 'control' : body.condition === 'rheo' ? 'rheo' : null;\n      if (!condition) return json(res, 400, {error:'condition must be rheo or control', errorCode:'invalid_condition'});`,
  `const condition = ['rheo','rheo_v0_4','control','future_generations'].includes(body.condition) ? body.condition : null;\n      if (!condition) return json(res, 400, {error:'invalid shared-map research condition', errorCode:'invalid_condition'});`,
  'research condition parser'
);

text = text.replace(`Rheo v0.3.1 server listening`, `Rheo v0.4 shared-map research server listening`);

await writeFile(TEMP, text, 'utf8');
try {
  await import(`${pathToFileURL(TEMP).href}?v=${Date.now()}`);
  await unlink(TEMP).catch(() => {});
} catch (err) {
  await unlink(TEMP).catch(() => {});
  throw err;
}
