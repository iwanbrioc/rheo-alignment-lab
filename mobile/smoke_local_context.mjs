#!/usr/bin/env node
import { getLocalAffordanceContext, validateLocalContextRequest } from './local_context_v0_1.mjs';

process.env.LOCAL_CONTEXT_PROVIDER = 'fixture';

const request = {
  decisionText: 'My washing machine has broken and I need a reliable solution this week.',
  location: { latitude: 51.745, longitude: -2.217, areaLabel: 'Prototype area' },
  radiusM: 5000
};

const validated = validateLocalContextRequest(request);
if (validated.radiusM !== 5000) throw new Error('radius validation failed');
const result = await getLocalAffordanceContext(request);
if (result.provider !== 'fixture') throw new Error('fixture provider not used');
if (!Array.isArray(result.searchQueries) || !result.searchQueries.includes('appliance repair')) throw new Error('decision query planner did not identify repair context');
if (result.candidates.length !== 0) throw new Error('fixture must never invent places');
if (!result.warnings.length) throw new Error('fixture must warn that no real place data was returned');
console.log(`mobile local-context smoke PASS | provider=${result.provider} | queries=${result.searchQueries.join(',')} | candidates=${result.candidates.length}`);
