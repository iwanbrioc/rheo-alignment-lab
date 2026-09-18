import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { digestCode } from './access.mjs';

const output = process.argv[2];
if (!output) throw new Error('Provide an ignored, private output path for the invitation.');
const code = `rb1_${randomBytes(32).toString('base64url')}`;
const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
writeFileSync(resolve(output), JSON.stringify({ code, expiresAt, serverEntry: { hash: digestCode(code), expiresAt } }, null, 2), { mode: 0o600, flag: 'wx' });
console.log('A 14-day invitation was written to the requested private file. Share only its code with the tester; put only serverEntry in RHEO_BETA_INVITES.');
