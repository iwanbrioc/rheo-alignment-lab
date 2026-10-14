import { CATEGORIES, HORIZONS, materialize, pathways, assess, sharedPacket } from './mesh-engine.mjs';
import { MeshStore } from './mesh-store.mjs';
import { BluetoothBridge, MAX_TRANSFER } from './mesh-transport.mjs';
import { demoOffers } from './mesh-demo.mjs';
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = { All: '◌', Essentials: '＋', Belonging: '○', Learning: '↗', Creativity: '◇', Nature: '✳', Purpose: '✧' };
const descriptions = { Essentials: 'Food, shelter, safety and dignity. Help is available without having to earn it.', Belonging: 'Company, listening and places where you can be yourself.', Learning: 'Skills, curiosity and knowledge passed between people.', Creativity: 'Make, play, express and transform what is possible.', Nature: 'Reconnect with and care for the living world.', Purpose: 'Find a meaningful contribution that matters to you.' };
const names = { ready: 'Available to approach', confirm: 'Confirm first', blocked: 'Needs renewal or repair' };
let store, bridge, demo = false, category = 'All', query = '', origin = null, selected = null, recordKind = null, editing = null, view = 'explore';
let demoData = demoOffers();
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').hidden = true, 6500); }
function errorMessage(error) { return error?.name === 'NotAllowedError' ? 'Permission was not granted. Your existing map is unchanged.' : error?.message || 'The operation could not be completed.'; }
function offers() { return demo ? demoData : materialize(store?.events || []); }
function filtered() { return pathways(offers(), { category, query, origin, relationships: store?.relationships || [] }); }
function setView(next) {
  view = next;
  for (const id of ['explore', 'pathways', 'mesh']) $(id + '-view').hidden = next !== id;
  document.querySelectorAll('[data-view]').forEach(button => { button.classList.toggle('active', button.dataset.view === next); if (button.dataset.view === next) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  if (next !== 'explore') render();
}
function render() {
  $('demo-banner').hidden = !demo;
  $('categories').innerHTML = ['All', ...CATEGORIES].map(c => `<button class="filter ${category === c ? 'active' : ''}" data-category="${c}" aria-pressed="${category === c}">${escape(c)}</button>`).join('');
  const rows = filtered();
  $('result-count').textContent = `${rows.length} ${rows.length === 1 ? 'possibility' : 'possibilities'}`;
  $('sort-note').textContent = origin ? 'Availability first, then straight-line distance. These are not walking routes.' : 'Available pathways first. Distance when you choose a location.';
  $('offers').innerHTML = rows.length ? rows.map(({ offer: o, state, distance, corroborated, trustedWitness }, index) => `<button class="offer-card" data-offer="${escape(o.id)}"><div class="offer-top"><span class="category-label"><span class="category-icon">${icons[o.category]}</span>${escape(o.category)} · ${index + 1}</span><span class="status ${state}">${names[state]}</span></div><h3>${escape(o.title)}</h3><p>${escape(o.description.slice(0, 120))}${o.description.length > 120 ? '…' : ''}</p><div class="offer-bottom"><span>${escape(o.location.label)}</span><span>${distance !== null ? distance < 1 ? Math.round(distance * 1000) + ' m' : distance.toFixed(1) + ' km' : '↗'}</span></div><div class="small" style="margin-top:8px">${o.demo ? 'Illustrative · no endorsements' : trustedWitness ? 'Availability witness you trust · inspect context' : corroborated ? 'Another device confirms availability · inspect context' : 'Steward’s claim · inspect context'}${o.visibility === 'private' && !o.demo ? ' · Private' : ''}</div></button>`).join('') : `<div class="list-empty">${query || category !== 'All' ? 'No possibilities match this view. Try another pathway or add an invitation.' : 'Your map is yours to grow. Add a possibility or explore the illustrative map.'}</div>`;
  renderMap(rows);
  $('pathway-groups').innerHTML = CATEGORIES.map(c => {
    const group = pathways(offers(), { category: c, origin });
    const available = group.filter(r => r.state !== 'blocked').length;
    return `<button class="pathway-tile" data-pathway="${c}"><span class="category-icon">${icons[c]}</span><h3>${c}</h3><p>${descriptions[c]}</p><span class="small">${available} pathways to approach · ${group.length - available} need repair →</span></button>`;
  }).join('');
  $('horizons').innerHTML = HORIZONS.map(([domain, horizon, term]) => `<div><strong>${escape(domain)}</strong><span>${escape(horizon)}</span><span>↔ ${escape(term)}</span></div>`).join('');
  $('fingerprint').textContent = store?.identity.actor || 'Device identity unavailable';
  $('exchange-count').textContent = store ? `${sharedPacket(store.events).events.length} signed shared records · ${store.events.length} total records stored on this device.` : '';
  const own = store ? store.events.filter(e => e.actor === store.identity.actor) : [];
  $('contribution-list').innerHTML = own.length ? own.slice().reverse().map(e => {
    const target = offers().find(o => o.revision === e.body.target || o.id === e.body.recordId);
    return `<div class="contribution"><span><strong>${escape(e.kind === 'offer' ? e.body.title : e.kind === 'retract' ? 'Record withdrawn' : e.body.note)}</strong><br><span class="small">${escape(e.kind)} · ${escape(e.body.visibility)} · ${escape(new Date(e.at).toLocaleString())}${target && e.kind !== 'offer' ? ' · ' + escape(target.title) : ''}</span></span>${target ? `<button class="text-button" data-offer="${escape(target.id)}">Inspect →</button>` : ''}</div>`;
  }).join('') : '<p class="small">Your possibilities, contextual trust records and participation experiences will appear here.</p>';
  $('relationships').innerHTML = store?.relationships?.length ? store.relationships.map(r => `<div class="contribution"><span><strong>${escape(r.name)}</strong><br><span class="small">${escape(r.scope)} · ${escape(materialize(store.events).find(o => o.id === r.recordId)?.title || 'Opportunity not held here')} · ${Date.parse(r.expires) > Date.now() ? 'review by' : 'expired'} ${escape(new Date(r.expires).toLocaleString())}<br>${escape(r.actor)}</span></span><button class="text-button danger" data-remove-relationship="${escape(r.actor)}" data-record="${escape(r.recordId)}" data-scope="${escape(r.scope)}">Remove</button></div>`).join('') : '<p class="small">Inspect a contextual record to recognise its author. Trust stays specific and can be withdrawn.</p>';
  if (selected && $('detail-dialog').open) renderDetail(selected);
}
function renderMap(rows) {
  const svg = $('map');
  const points = rows.map(r => r.offer);
  $('map-empty').hidden = offers().length > 0;
  $('map-title').textContent = demo ? 'Illustrative possibilities · Llandysul' : 'Your local possibilities';
  let minLat, maxLat, minLon, maxLon;
  if (points.length) {
    minLat = Math.min(...points.map(p => p.location.lat)); maxLat = Math.max(...points.map(p => p.location.lat));
    minLon = Math.min(...points.map(p => p.location.lon)); maxLon = Math.max(...points.map(p => p.location.lon));
    const centerLat = (minLat + maxLat) / 2, centerLon = (minLon + maxLon) / 2;
    const cos = Math.max(.1, Math.cos(centerLat * Math.PI / 180));
    const latRange = Math.max(.009, (maxLat - minLat) * 1.6, (maxLon - minLon) * cos * 1.6 * 460 / 680);
    const lonRange = latRange * 680 / 460 / cos;
    minLat = centerLat - latRange / 2; maxLat = centerLat + latRange / 2; minLon = centerLon - lonRange / 2; maxLon = centerLon + lonRange / 2;
  } else { const center = origin || {lat:52.042,lon:-4.312}; minLat = center.lat - .008; maxLat = center.lat + .008; minLon = center.lon - .015; maxLon = center.lon + .015; }
  const project = p => ({ x: 60 + (p.lon - minLon) / (maxLon - minLon) * 680, y: 70 + (maxLat - p.lat) / (maxLat - minLat) * 460 });
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const x = 60 + i * 170, y = 70 + i * 115;
    grid += `<path d="M${x} 65V535 M55 ${y}H745" stroke="#cad6c4" stroke-width=".7" stroke-dasharray="3 6"/><text x="${x}" y="551" text-anchor="middle" fill="#758574" font-size="9">${(minLon + (maxLon - minLon) * i / 4).toFixed(4)}°</text><text x="40" y="${y + 3}" text-anchor="end" fill="#758574" font-size="9">${(maxLat - (maxLat - minLat) * i / 4).toFixed(3)}°</text>`;
  }
  const visibleOrigin = origin && origin.lat >= minLat && origin.lat <= maxLat && origin.lon >= minLon && origin.lon <= maxLon ? project(origin) : null;
  svg.innerHTML = `<defs><radialGradient id="map-wash"><stop offset="0" stop-color="#f5f5e9"/><stop offset="1" stop-color="#e5ecde"/></radialGradient></defs><rect width="800" height="580" fill="url(#map-wash)"/>${grid}<text x="746" y="62" text-anchor="middle" fill="#607765" font-size="10">N ↑</text>${visibleOrigin ? `<circle cx="${visibleOrigin.x}" cy="${visibleOrigin.y}" r="16" fill="#5487a322"/><circle cx="${visibleOrigin.x}" cy="${visibleOrigin.y}" r="5" fill="#5487a3" stroke="white" stroke-width="2"/><text x="${visibleOrigin.x}" y="${visibleOrigin.y + 28}" text-anchor="middle" font-size="10" fill="#385d74">You</text>` : ''}${rows.map(({ offer: o, state }, index) => {
    const p = project(o.location), color = state === 'blocked' ? '#947260' : state === 'confirm' ? '#9c804f' : '#2c695a';

    return `<g class="map-marker" data-offer="${escape(o.id)}" role="button" tabindex="0" aria-label="${escape(o.title)}, ${names[state]}"><circle cx="${p.x}" cy="${p.y}" r="29" fill="${color}" opacity=".08"/><circle cx="${p.x}" cy="${p.y}" r="18" fill="${color}" stroke="#fffef9" stroke-width="2"/><text x="${p.x}" y="${p.y + 5}" fill="white" text-anchor="middle" font-size="16">${index + 1}</text></g>`;
  }).join('')}`;
  const widthKm = (maxLon - minLon) * 111.32 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  $('map-scale').textContent = `${widthKm.toFixed(1)} km across · approximate straight-line positions`;
}
function renderDetail(id) {
  const o = offers().find(item => item.id === id);
  if (!o) { $('detail-dialog').close(); return; }
  const a = assess(o, offers(), { origin, relationships: store?.relationships || [] });
  const own = !o.demo && o.actor === store.identity.actor;
  const recorded = o.evidence.map(e => `<article class="trust-item"><div class="small">${e.kind === 'attestation' ? escape(e.body.scope) + ' · ' + escape(e.body.verdict) : 'Experience · ' + escape(e.body.result)} · ${e.actor === o.actor ? 'Steward’s own record' : 'Another device’s report'}</div><p>${escape(e.body.note)}</p><div class="small">${escape(new Date(e.at).toLocaleString())} · ${e.body.target !== o.revision ? 'Earlier revision; not current evidence' : e.kind === 'attestation' && Date.parse(e.body.expires) <= Date.now() ? 'Expired; not current evidence' : 'Current revision'}<br>Author <code>${escape(e.actor.slice(0,16))}…</code> · signature verified${store.relationships?.find(r => r.actor === e.actor && r.scope === e.body.scope && r.recordId === o.id && Date.parse(r.expires) > Date.now()) ? '<br>You trust this author in this context' : ''}${e.kind === 'attestation' ? '<br>Valid until ' + escape(new Date(e.body.expires).toLocaleString()) : ''}</div>${e.actor !== store.identity.actor ? `<button class="text-button" data-recognise="${escape(e.actor)}" data-record="${escape(o.id)}" data-scope="${escape(e.body.scope || 'availability')}">Recognise / trust this author in context</button>` : ''}${e.actor === store.identity.actor ? `<button class="text-button danger" data-withdraw="${escape(e.id)}">Withdraw my record</button>` : ''}</article>`).join('');
  $('detail-content').innerHTML = `<div class="detail-meta"><span class="category-label"><span class="category-icon">${icons[o.category]}</span>${escape(o.category)}</span><span class="status ${a.state}">${names[a.state]}</span><span class="tag">${o.demo ? 'Illustrative' : o.visibility === 'shared' ? 'Shared record' : 'Private record'}</span></div><h2>${escape(o.title)}</h2><p class="detail-lead">${escape(o.description)}</p><div class="detail-box"><h3>Where & with whom</h3><p>${escape(o.location.label)}<br>${o.location.lat.toFixed(5)}, ${o.location.lon.toFixed(5)}${o.location.w3w ? '<br>///' + escape(o.location.w3w) + ' · supplied, unverified label' : ''}<br>Steward: ${escape(o.steward)}<br>${o.capacity} places or uses offered · valid until ${escape(new Date(o.expires).toLocaleString())}</p><p>${escape(o.conditions)}</p></div>${a.blocks.length || a.checks.length ? `<div class="detail-box warning-box"><h3>${a.blocks.length ? 'What needs renewal or repair' : 'Before you participate'}</h3><ul>${[...a.blocks, ...a.checks].map(r => `<li>${escape(r)}</li>`).join('')}</ul></div>` : '<p class="small">Approach under the stated conditions. This is an invitation, not a booking or a guarantee.</p>'}<div class="detail-box"><h3>Care keeps this possible</h3><p>${escape(o.care)}</p><h3>Meaning & contribution</h3><p>${escape(o.purpose)}</p></div><div class="detail-actions">${o.demo ? '<button class="secondary" id="demo-add">Create a real possibility</button>' : `<button class="primary" id="participate" ${a.state === 'blocked' ? 'disabled' : ''}>Record participation</button><button class="secondary" id="attest">Add a trust record</button>${own ? '<button class="quiet" id="edit-offer">' + (o.conflict ? 'Resolve revisions' : 'Edit / renew') + '</button>' : ''}`}</div><p class="small">Participation describes what happened; it does not reserve a place. No trust balance is earned or spent.</p><h3 class="detail-trust-title">Contextual trust & experience</h3><p class="small">${o.demo ? 'This illustrative opportunity has no real endorsements.' : a.corroborated ? 'Another device has confirmed availability for this revision. Review who, what and when before relying on it.' : 'Availability is the steward’s own claim. No current availability confirmation from another device is held here.'} Signatures establish origin, not truth or real-world identity.</p>${recorded || '<p class="small">No contextual records yet.</p>'}<div class="detail-footer">${o.demo ? 'Fictional example. Do not use this map to find real services.' : 'Steward device: <code>' + escape(o.actor) + '</code><br>Revision: <code>' + escape(o.revision) + '</code><br>Updated ' + escape(new Date(o.updatedAt).toLocaleString())}</div>`;
  $('participate')?.addEventListener('click', () => openRecord('outcome', o));
  $('attest')?.addEventListener('click', () => openRecord('attestation', o));
  $('edit-offer')?.addEventListener('click', () => { $('detail-dialog').close(); openOffer(o); });
  $('demo-add')?.addEventListener('click', () => { $('detail-dialog').close(); demo = false; render(); openOffer(); });
}
function showDetail(id) { selected = id; renderDetail(id); if (!$('detail-dialog').open) $('detail-dialog').showModal(); }
function localDate(offsetDays = 7) {
  const d = new Date(Date.now() + offsetDays * 86400000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16);
}
function openOffer(o = null) {
  if (!store) { toast('Device storage is unavailable.'); return; }
  editing = o; const form = $('offer-form'); form.reset(); $('offer-error').textContent = '';
  $('offer-form-title').textContent = o ? o.conflict ? 'Resolve conflicting revisions' : 'Edit / renew possibility' : 'Add a possibility';
  form.elements.expires.value = localDate();
  if (origin) { form.elements.lat.value = origin.lat; form.elements.lon.value = origin.lon; }
  form.elements.visibility.disabled = !!o;
  if (o) {
    for (const key of ['recordId','title','description','category','steward','access','capacity','status','conditions','care','purpose','visibility']) form.elements[key].value = key === 'recordId' ? o.id : o[key];
    form.elements.place.value = o.location.label; form.elements.lat.value = o.location.lat; form.elements.lon.value = o.location.lon; form.elements.w3w.value = o.location.w3w || '';
    const d = new Date(o.expires); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); form.elements.expires.value = d.toISOString().slice(0,16);
    form.elements.needs.value = o.needs.join('\n');
  }
  $('dependencies').innerHTML = materialize(store.events).filter(item => item.id !== o?.id && (o?.visibility !== 'shared' || item.visibility === 'shared')).map(item => `<option value="${escape(item.id)}" ${o?.dependencies.includes(item.id) ? 'selected' : ''}>${escape(item.title)}</option>`).join('');
  $('offer-dialog').showModal();
}
function openRecord(kind, o) {
  selected = o.id; recordKind = kind; const form = $('record-form'); form.reset(); $('record-error').textContent = '';
  $('record-title').textContent = kind === 'attestation' ? 'Trust in this context' : 'Record your experience';
  for (const id of ['scope-label','verdict-label','trust-expiry-label']) $(id).hidden = kind !== 'attestation';
  $('result-label').hidden = kind !== 'outcome';
  form.elements.expires.required = kind === 'attestation'; form.elements.expires.value = localDate();
  $('record-sharing').textContent = o.visibility === 'shared' ? 'This signed record will be shared with the opportunity. Describe only what you have permission to distribute.' : 'This signed record stays private with this opportunity.';
  $('record-dialog').showModal();
}
async function getLocation(forForm = false) {
  if (!navigator.geolocation) { toast('Geolocation is unavailable. You can enter coordinates yourself.'); return; }
  $('location-status').textContent = 'Requesting your location…';
  navigator.geolocation.getCurrentPosition(position => {
    origin = { lat: position.coords.latitude, lon: position.coords.longitude };
    $('location-status').textContent = `Location set · accuracy ±${Math.round(position.coords.accuracy)} m`;
    if (forForm) { const f = $('offer-form'); f.elements.lat.value = origin.lat; f.elements.lon.value = origin.lon; }
    render();
  }, error => { $('location-status').textContent = 'Location stays on your device.'; toast(error.code === 1 ? 'Location permission was not granted. Enter coordinates manually or explore without distance.' : 'Location could not be obtained. You can enter coordinates manually.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}
function confirmation(title, description, action, label = 'Continue') {
  $('confirm-title').textContent = title; $('confirm-description').textContent = description; $('confirm-action').textContent = label;
  $('confirm-action').onclick = async () => { $('confirm-action').disabled = true; try { await action(); $('confirm-dialog').close(); } catch (error) { toast(errorMessage(error)); } finally { $('confirm-action').disabled = false; } };
  $('confirm-dialog').showModal();
}
async function exportFile() {
  const text = store.export(); const packet = JSON.parse(text);
  if (!packet.events.length) { toast('There are no shared records to export. Private records and the illustrative map stay on this device.'); return; }
  const blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `rheo-shared-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast(`${packet.events.length} shared records exported. Your private records and signing key are excluded.`);
}
function updateBridge() {
  const connected = bridge?.status === 'connected';
  $('bluetooth-status').textContent = connected ? `Connected to ${bridge.device.name || 'a Rheo-compatible bridge'}. Shared records can be sent; received packets are verified before merging.` : navigator.bluetooth ? 'Bluetooth connection is supported. Pair with a Rheo-compatible peripheral to exchange shared records.' : 'Web Bluetooth is unavailable in this browser. Use offline file exchange on this device.';
  $('connect').disabled = !store || connected || !navigator.bluetooth; $('send').disabled = !connected; $('disconnect').hidden = !connected;
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.addEventListener('click', async event => {
  const offer = event.target.closest('[data-offer]'); if (offer) { showDetail(offer.dataset.offer); return; }
  const filter = event.target.closest('[data-category]'); if (filter) { category = filter.dataset.category; render(); return; }
  const pathway = event.target.closest('[data-pathway]'); if (pathway) { category = pathway.dataset.pathway; query = ''; $('search').value = ''; setView('explore'); render(); return; }
  const recognise = event.target.closest('[data-recognise]');
  if (recognise) {
    const form = $('relationship-form'); form.reset(); form.elements.actor.value = recognise.dataset.recognise; form.elements.recordId.value = recognise.dataset.record; form.elements.scope.value = recognise.dataset.scope; form.elements.expires.value = localDate(30); $('relationship-fingerprint').textContent = 'Author fingerprint: ' + recognise.dataset.recognise; $('relationship-error').textContent = ''; $('relationship-dialog').showModal(); return;
  }
  const remove = event.target.closest('[data-remove-relationship]');
  if (remove) { try { await store.removeRelationship(remove.dataset.removeRelationship, remove.dataset.scope, remove.dataset.record); toast('Local trust relationship removed.'); } catch (error) { toast(errorMessage(error)); } return; }
  const withdraw = event.target.closest('[data-withdraw]'); if (withdraw) {
    const target = store.events.find(e => e.id === withdraw.dataset.withdraw);
    if (target?.actor !== store.identity.actor) return;
    confirmation('Withdraw this record?', 'Peers will see the withdrawal after receiving a new shared packet. Existing copies cannot be erased remotely.', async () => { await store.add('retract', { target: target.id, visibility: target.body.visibility }); toast('Withdrawal recorded. Exchange updates so peers can see it.'); }, 'Withdraw record');
  }
});
$('map').addEventListener('keydown', event => { if (['Enter',' '].includes(event.key) && event.target.closest('[data-offer]')) { event.preventDefault(); showDetail(event.target.closest('[data-offer]').dataset.offer); } });
$('search').addEventListener('input', event => { query = event.target.value; render(); });
$('add-offer').addEventListener('click', () => { if (demo) { demo = false; render(); } openOffer(); });
$('location-button').addEventListener('click', () => getLocation()); $('form-location').addEventListener('click', () => getLocation(true));
$('show-demo').addEventListener('click', () => { demo = true; category = 'All'; query = ''; $('search').value = ''; render(); });
$('leave-demo').addEventListener('click', () => { demo = false; render(); });
$('form-category').innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join('');
$('offer-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target, f = form.elements, button = form.querySelector('[type=submit]'); button.disabled = true;
  try {
    const dependencies = [...f.dependencies.selectedOptions].map(o => o.value), visibility = editing?.visibility || f.visibility.value;
    const all = materialize(store.events);
    if (visibility === 'shared' && dependencies.some(id => all.find(o => o.id === id)?.visibility !== 'shared')) throw new Error('A shared possibility cannot refer to a private dependency. Share the dependency separately or remove the link.');
    const body = { recordId: editing?.id || crypto.randomUUID(), parents: editing?.heads || [], title:f.title.value.trim(), description:f.description.value.trim(), category:f.category.value, steward:f.steward.value.trim(), location: {lat:Number(f.lat.value),lon:Number(f.lon.value),label:f.place.value.trim(),w3w:f.w3w.value.trim().replace(/^\/+/, '')}, access:f.access.value, capacity:Number(f.capacity.value), expires:new Date(f.expires.value).toISOString(), status:f.status.value, conditions:f.conditions.value.trim(), care:f.care.value.trim(), purpose:f.purpose.value.trim(), needs:f.needs.value.split('\n').map(s=>s.trim()).filter(Boolean), dependencies, visibility };
    await store.add('offer', body); $('offer-dialog').close(); demo = false; render(); showDetail(body.recordId); toast(editing ? 'Possibility updated. Earlier endorsements do not automatically apply to this revision.' : 'Possibility saved on this device.');
  } catch (error) { $('offer-error').textContent = errorMessage(error); } finally { button.disabled = false; }
});
$('record-form').addEventListener('submit', async event => {
  event.preventDefault(); const f = event.target.elements, button = event.target.querySelector('[type=submit]'); button.disabled = true;
  try {
    const o = materialize(store.events).find(item => item.id === selected); if (!o) throw new Error('The opportunity is no longer available.');
    if (o.conflict) throw new Error('Resolve the opportunity’s conflicting revisions before attaching new evidence.');
    if (recordKind === 'attestation' && new Date(f.expires.value).getTime() <= Date.now()) throw new Error('Choose a future expiry for a current trust record.');
    const body = { target:o.revision, note:f.note.value.trim(), visibility:o.visibility, ...(recordKind === 'attestation' ? { scope:f.scope.value, verdict:f.verdict.value, expires:new Date(f.expires.value).toISOString() } : { result:f.result.value }) };
    await store.add(recordKind, body); $('record-dialog').close(); toast('Signed contextual record saved.');
  } catch (error) { $('record-error').textContent = errorMessage(error); } finally { button.disabled = false; }
});
$('relationship-form').addEventListener('submit', async event => {
  event.preventDefault(); const f = event.target.elements, button = event.target.querySelector('[type=submit]'); button.disabled = true;
  try {
    if (new Date(f.expires.value).getTime() <= Date.now()) throw new Error('Choose a future review date.');
    const name = f.name.value.trim(); if (!name) throw new Error('Enter a name you recognise.');
    await store.trustRelationship({actor:f.actor.value, recordId:f.recordId.value, name, scope:f.scope.value, expires:new Date(f.expires.value).toISOString()});
    $('relationship-dialog').close(); toast('Contextual trust saved privately on this device.');
  } catch(error) { $('relationship-error').textContent = errorMessage(error); } finally { button.disabled = false; }
});
$('export').addEventListener('click', () => exportFile().catch(error => toast(errorMessage(error))));
$('import').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > MAX_TRANSFER) throw new Error('Exchange file exceeds 2 MB.');
    const count = await store.import(await file.text()); demo = false; render(); toast(`${count} new signed records merged. Inspect their sources before relying on them.`);
  } catch (error) { toast(errorMessage(error)); }
});
$('connect').addEventListener('click', async () => { try { await bridge.connect(); } catch (error) { toast(errorMessage(error)); } });
$('send').addEventListener('click', async () => {
  $('send').disabled = true;
  try { if (!sharedPacket(store.events).events.length) throw new Error('There are no shared records to send.'); await bridge.send(store.export()); toast('Shared packet written to the bridge. Receipt by another peer is not yet confirmed.'); }
  catch (error) { toast(errorMessage(error)); } finally { updateBridge(); }
});
$('disconnect').addEventListener('click', () => bridge.disconnect());
$('my-records').addEventListener('click', () => $('contributions').scrollIntoView({behavior:'smooth'}));
$('clear').addEventListener('click', () => confirmation('Erase this device’s data?', 'This permanently deletes your private map, shared copies and signing identity from this browser. Export shared records first if you need them. Other devices retain their own copies.', () => store.clear(), 'Erase device data'));
try {
  store = await new MeshStore().open(); store.addEventListener('change', render);
  bridge = new BluetoothBridge(async text => { const count = await store.import(text); toast(`${count} signed records received through the bridge.`); });
  bridge.addEventListener('change', updateBridge); bridge.addEventListener('error', event => toast(errorMessage(event.detail)));
} catch (error) {
  store = null; $('storage-warning').hidden = false; $('storage-warning').textContent = 'Device storage is unavailable. You can explore the illustrative map, but new records cannot be saved. ' + errorMessage(error);
  for (const id of ['add-offer','export','connect','clear']) $(id).disabled = true; $('import').disabled = true;
}
updateBridge(); render();
setInterval(render, 60000); // Expiry affects the map even without a new event.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => toast('Offline caching could not be enabled. Device records still remain in local storage.'));
