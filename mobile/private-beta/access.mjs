import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const digestCode = (code) => createHash('sha256').update(code).digest('hex');

export function parseInvites(value) {
  let entries;
  try { entries = JSON.parse(value); } catch { throw new Error('Set RHEO_BETA_INVITES to an array of hashed, expiring invitations.'); }
  if (!Array.isArray(entries) || !entries.length || entries.length > 50
    || entries.some((entry) => !entry || !/^[a-f0-9]{64}$/.test(entry.hash)
      || typeof entry.expiresAt !== 'string' || !Number.isFinite(Date.parse(entry.expiresAt)))
    || new Set(entries.map((entry) => entry.hash)).size !== entries.length) {
    throw new Error('Invalid RHEO_BETA_INVITES configuration.');
  }
  return entries;
}

export function authenticate(header, invites, now = Date.now()) {
  if (typeof header !== 'string' || !/^Bearer rb1_[A-Za-z0-9_-]{43}$/.test(header)) return null;
  const hash = digestCode(header.slice(7));
  const bytes = Buffer.from(hash, 'hex');
  const entry = invites.find((candidate) => timingSafeEqual(bytes, Buffer.from(candidate.hash, 'hex')));
  return entry && Date.parse(entry.expiresAt) > now ? hash : null;
}

// Counts only, never questions, audio, locations, IPs or raw access codes.
// Synchronous atomic replacement serializes admissions in this single-instance beta.
export function createBudget({ file, perInvite = 20, total = 100, now = Date.now } = {}) {
  let state = { day: '', total: 0, invites: {} };
  if (file && existsSync(file)) {
    try {
      state = JSON.parse(readFileSync(file, 'utf8'));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(state.day) || !Number.isSafeInteger(state.total) || state.total < 0
        || !state.invites || typeof state.invites !== 'object' || Array.isArray(state.invites)
        || Object.entries(state.invites).some(([key, count]) => !/^[a-f0-9]{64}$/.test(key) || !Number.isSafeInteger(count) || count < 0)) throw new Error();
    } catch { throw new Error('The private-test usage file could not be read. Refusing to reset limits.'); }
  }
  return { admit(hash, cost = 1) {
    const day = new Date(now()).toISOString().slice(0, 10);
    if (state.day > day) throw new Error('Clock moved backwards. Refusing to reset limits.');
    const current = state.day === day ? state : { day, total: 0, invites: {} };
    if (current.total + cost > total || (current.invites[hash] || 0) + cost > perInvite) return false;
    const next = { day, total: current.total + cost, invites: { ...current.invites, [hash]: (current.invites[hash] || 0) + cost } };
    if (file) {
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
      writeFileSync(`${file}.tmp`, JSON.stringify(next), { mode: 0o600 });
      renameSync(`${file}.tmp`, file);
    }
    state = next;
    return true;
  } };
}
