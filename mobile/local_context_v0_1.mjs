const DEFAULT_RADIUS_M = 5000;
const MAX_RADIUS_M = 10000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();
let lastNominatimRequestAt = 0;

const QUERY_RULES = [
  { test: /wash(ing)? machine|appliance|repair|broken|fix/i, queries: ['appliance repair', 'repair cafe', 'laundrette'] },
  { test: /bike|cycle|cycling|commut|transport|bus|parking/i, queries: ['bicycle repair', 'cycle shop', 'bus station'] },
  { test: /food|grocer|vegetable|produce|bakery|supply/i, queries: ['farm shop', 'greengrocer', 'bakery'] },
  { test: /childcare|after[- ]school|care club/i, queries: ['after school club', 'community centre'] },
  { test: /workshop|maker|studio|workspace/i, queries: ['makerspace', 'coworking space', 'community workshop'] },
  { test: /energy|solar|electricity/i, queries: ['energy advice', 'community centre'] },
  { test: /venue|ticket|theatre|culture|arts/i, queries: ['theatre', 'arts centre', 'community centre'] },
  { test: /flood|drain|storm/i, queries: ['community centre', 'council office'] },
  { test: /reuse|packaging|container|waste/i, queries: ['reuse shop', 'zero waste shop', 'recycling centre'] },
  { test: /equipment|laser cutter|fabrication|learning/i, queries: ['makerspace', 'college', 'adult education centre'] }
];

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function degToRad(x) { return x * Math.PI / 180; }
function distanceM(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const dLat = degToRad(bLat - aLat);
  const dLon = degToRad(bLon - aLon);
  const aa = Math.sin(dLat/2) ** 2 + Math.cos(degToRad(aLat)) * Math.cos(degToRad(bLat)) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
}
function bbox(lat, lon, radiusM) {
  const latDelta = radiusM / 111320;
  const lonDelta = radiusM / (111320 * Math.max(0.2, Math.cos(degToRad(lat))));
  return [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta];
}
function safeNumber(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw Object.assign(new Error(`${name} must be a finite number`), { code: 'invalid_local_context_request' });
  return n;
}
function planQueries(decisionText) {
  const text = String(decisionText || '').trim();
  const found = [];
  for (const rule of QUERY_RULES) if (rule.test.test(text)) found.push(...rule.queries);
  return [...new Set(found)].slice(0, 3);
}
async function throttleNominatim() {
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  lastNominatimRequestAt = Date.now();
}
async function searchNominatim(query, lat, lon, radiusM) {
  const baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
  const userAgent = process.env.NOMINATIM_USER_AGENT || '';
  if (!userAgent) throw Object.assign(new Error('NOMINATIM_USER_AGENT must identify this application when LOCAL_CONTEXT_PROVIDER=nominatim'), { code: 'local_provider_configuration' });
  const [left,bottom,right,top] = bbox(lat,lon,radiusM);
  const key = `${query}|${lat}|${lon}|${radiusM}|${baseUrl}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  await throttleNominatim();
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '4',
    bounded: '1',
    viewbox: `${left},${top},${right},${bottom}`
  });
  const response = await fetch(`${baseUrl.replace(/\/$/,'')}/search?${params}`, {
    headers: { 'user-agent': userAgent, accept: 'application/json' }
  });
  if (!response.ok) throw Object.assign(new Error(`Local provider returned ${response.status}`), { code: 'local_provider_error' });
  const rows = await response.json();
  const value = Array.isArray(rows) ? rows : [];
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function validateLocalContextRequest(body = {}) {
  const decisionText = String(body.decisionText || '').trim();
  if (!decisionText) throw Object.assign(new Error('decisionText is required'), { code: 'invalid_local_context_request' });
  const loc = body.location || {};
  const latitude = safeNumber(loc.latitude, 'location.latitude');
  const longitude = safeNumber(loc.longitude, 'location.longitude');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw Object.assign(new Error('location is outside valid coordinate range'), { code: 'invalid_local_context_request' });
  const radiusM = clamp(Number(body.radiusM) || DEFAULT_RADIUS_M, 500, MAX_RADIUS_M);
  return { decisionText, latitude, longitude, radiusM, areaLabel: typeof loc.areaLabel === 'string' ? loc.areaLabel : null };
}

export async function getLocalAffordanceContext(body = {}) {
  const { decisionText, latitude, longitude, radiusM, areaLabel } = validateLocalContextRequest(body);
  const provider = process.env.LOCAL_CONTEXT_PROVIDER || 'fixture';
  const searchQueries = planQueries(decisionText);
  if (provider === 'fixture') {
    return {
      provider: 'fixture',
      attribution: null,
      areaLabel,
      searchQueries,
      candidates: [],
      warnings: ['Local-context fixture mode returns no real places. Configure a provider before treating local context as evidence.']
    };
  }
  if (provider !== 'nominatim') throw Object.assign(new Error(`Unsupported LOCAL_CONTEXT_PROVIDER: ${provider}`), { code: 'local_provider_configuration' });
  if (!searchQueries.length) {
    return {
      provider: 'nominatim',
      attribution: '© OpenStreetMap contributors',
      areaLabel,
      searchQueries: [],
      candidates: [],
      warnings: ['No decision-relevant local search category could be derived from this first-stage query planner. Rheo should proceed without local-place evidence.']
    };
  }
  const candidates = [];
  const seen = new Set();
  for (const query of searchQueries) {
    const rows = await searchNominatim(query, latitude, longitude, radiusM);
    for (const row of rows) {
      const rLat = Number(row.lat); const rLon = Number(row.lon);
      if (!Number.isFinite(rLat) || !Number.isFinite(rLon)) continue;
      const d = Math.round(distanceM(latitude,longitude,rLat,rLon));
      if (d > radiusM) continue;
      const id = String(row.place_id || `${rLat},${rLon}`);
      if (seen.has(id)) continue;
      seen.add(id);
      const name = row.name || String(row.display_name || '').split(',')[0] || query;
      candidates.push({
        id,
        name,
        category: String(row.type || row.category || query),
        distanceM: d,
        address: row.display_name || null,
        latitude: rLat,
        longitude: rLon,
        source: 'OpenStreetMap / Nominatim',
        sourceUrl: `https://www.openstreetmap.org/?mlat=${encodeURIComponent(rLat)}&mlon=${encodeURIComponent(rLon)}#map=17/${encodeURIComponent(rLat)}/${encodeURIComponent(rLon)}`,
        whyRelevant: `Matched the decision-relevant local search “${query}”. Presence does not establish quality, availability or reciprocal viability.`
      });
      if (candidates.length >= 9) break;
    }
    if (candidates.length >= 9) break;
  }
  candidates.sort((a,b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  return {
    provider: 'nominatim',
    attribution: '© OpenStreetMap contributors',
    areaLabel,
    searchQueries,
    candidates: candidates.slice(0,9),
    warnings: [
      'Local place results are search evidence, not endorsements. Opening hours, accessibility, capacity and suitability may be stale or unknown.',
      'This adapter is intended for low-volume prototyping only; use a production-grade or self-hosted provider before public scale.'
    ]
  };
}
