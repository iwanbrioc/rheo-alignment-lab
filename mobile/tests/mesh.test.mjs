import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  sampleState,
  validateState,
  newPortal,
  connect,
  proposeSession,
  togglePath,
  pathHasOverlap,
} from "../src/mesh/model.mjs";
import {
  locatedPortals,
  geographicConnections,
  initialRegion,
  sampleOverlay,
} from "../src/mesh/geography.mjs";
import { sharedMesh, mergeMesh, parseMesh } from "../src/mesh/exchange.mjs";
const empty = () => ({
  version: 4,
  portals: [],
  links: [],
  sessions: [],
  myPath: [],
});
const details = (name = "Real portal", location = null, shareable = false) => ({
  name,
  description: "A consented invitation and sustaining care",
  category: "Learning",
  kind: "Place",
  steward: "Local steward",
  shareable,
  location,
});
test("v0.4 browser sample imports with its complete matrix", () => {
  const s = validateState(sampleState());
  assert.equal(s.portals.length, 10);
  assert.equal(s.links.length, 13);
  assert.equal(s.sessions.length, 9);
  assert.equal(locatedPortals(s).length, 0);
});
test("real locations are preserved, but conceptual x/y never become coordinates", () => {
  const s = newPortal(
    sampleState(),
    details("Workshop", { latitude: 52.04, longitude: -4.31 }),
  );
  assert.equal(locatedPortals(s).length, 1);
  assert.deepEqual(validateState(s).portals.at(-1).location, {
    latitude: 52.04,
    longitude: -4.31,
  });
  assert.equal(locatedPortals(sampleState()).length, 0);
});
test("fictional portals and malformed coordinates cannot enter the geographic layer", () => {
  for (const location of [
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: 181 },
    { latitude: NaN, longitude: 0 },
    { latitude: "52", longitude: 0 },
  ])
    assert.throws(() => newPortal(empty(), details("Bad location", location)));
  const s = sampleState();
  s.portals[0].location = { latitude: 52, longitude: -4 };
  assert.throws(() => validateState(s), /real, valid coordinates/);
});
test("map connections require both endpoints to have real positions", () => {
  let s = newPortal(
    sampleState(),
    details("A", { latitude: 52, longitude: -4 }),
  );
  const a = s.portals.at(-1).id;
  s = connect(s, a, "p1", "One conceptual endpoint");
  assert.equal(geographicConnections(s).length, 0);
  s = newPortal(s, details("B", { latitude: 52.1, longitude: -4.1 }));
  s = connect(s, a, s.portals.at(-1).id, "Shared tools");
  assert.equal(geographicConnections(s).length, 1);
});
test("map bounds handle a single point, no points and the antimeridian", () => {
  const s = newPortal(empty(), details("A", { latitude: 52, longitude: -4 }));
  assert.equal(initialRegion(s.portals).latitude, 52);
  assert.equal(initialRegion([]).latitude, 20);
  const points = [
    { location: { latitude: 1, longitude: 179 } },
    { location: { latitude: 2, longitude: -179 } },
  ];
  assert.ok(initialRegion(points).longitudeDelta < 4);
});
test("shared export excludes private coordinates, dependent activities, connections and My Path", () => {
  let s = newPortal(
    sampleState(),
    details("Private", { latitude: 52, longitude: -4 }),
  );
  const id = s.portals.at(-1).id;
  s = connect(s, id, "p1", "A private connection");
  s = proposeSession(s, {
    portalId: id,
    title: "Private meeting",
    start: "10:00",
    end: "11:00",
    space: "Private place",
    description: "",
  });
  s = togglePath(s, "s1");
  const shared = sharedMesh(s);
  assert.ok(!JSON.stringify(shared).includes("Private"));
  assert.deepEqual(shared.myPath, []);
  assert.equal(shared.portals.length, 10);
});
test("receive and replay are idempotent, unverified and private by default", () => {
  const incoming = newPortal(
    empty(),
    details("A", { latitude: 52, longitude: -4 }, true),
  );
  const received = mergeMesh(empty(), incoming);
  assert.equal(received.portals[0].shareable, false);
  assert.equal(received.portals[0].received, true);
  assert.deepEqual(mergeMesh(received, incoming), received);
  assert.equal(sharedMesh(received).portals.length, 0);
});
test("conflicting imports fail before overwriting any existing record", () => {
  const s = sampleState(),
    incoming = sampleState();
  incoming.portals[0].name = "Changed claim";
  const before = JSON.stringify(s);
  assert.throws(() => mergeMesh(s, incoming), /Conflicting portal IDs/);
  assert.equal(JSON.stringify(s), before);
});
test("import preserves local My Path and does not import another person’s path", () => {
  const local = togglePath(sampleState(), "s1"),
    remote = togglePath(sampleState(), "s2");
  assert.deepEqual(mergeMesh(local, remote).myPath, ["s1"]);
});
test("matrix sessions, optional choices and overlaps remain explicit", () => {
  let s = proposeSession(sampleState(), {
    portalId: "p1",
    title: "New session",
    start: "11:00",
    end: "12:00",
    space: "Kitchen",
    description: "",
  });
  assert.equal(s.sessions.length, 10);
  s = togglePath(togglePath(s, "s1"), "s2");
  assert.equal(pathHasOverlap(s), true);
  assert.throws(() =>
    proposeSession(s, {
      portalId: "p1",
      title: "Bad",
      start: "11:15",
      end: "12:00",
      space: "Kitchen",
      description: "",
    }),
  );
});
test("bounded parsing rejects oversized UTF-8 files and invalid references", () => {
  assert.throws(() => parseMesh("x".repeat(400001)), /400 KB/);
  assert.throws(() => parseMesh("🌱".repeat(100001)), /400 KB/);
  const s = sampleState();
  s.links[0].to = "missing";
  assert.throws(() => parseMesh(JSON.stringify(s)));
});
test("the existing installed app identity is preserved and no AI invitation is required", async () => {
  const config = JSON.parse(
    await readFile(new URL("../app.json", import.meta.url), "utf8"),
  ).expo;
  assert.equal(config.ios.bundleIdentifier, "org.rheo.mobile");
  assert.equal(config.owner, "rheocracy");
  assert.equal(
    config.extra.eas.projectId,
    "94482de9-a319-413d-a0ce-d9ec44d675f3",
  );
  const entry = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(entry, /src\/mesh\/MeshApp/);
  const store = await readFile(
    new URL("../src/mesh/storage.ts", import.meta.url),
    "utf8",
  );
  assert.match(store, /@rheo\/native-mesh\/v0.4/);
  assert.doesNotMatch(store, /removeItem|decision-sessions/);
});

import {
  encodeUTF8,
  decodeUTF8,
  encodeBase64URL,
  decodeBase64URL,
} from "../src/mesh/encoding.mjs";
import {
  makePortalToken,
  parsePortalToken,
  mergeReceivedPortal,
} from "../src/mesh/bitchat-carrier.mjs";
test("native encoding matches browser bytes for multilingual text", () => {
  for (const text of ["Care", "Gofal ↔ care", "こんにちは 🌱", "Привіт"]) {
    const bytes = new TextEncoder().encode(text);
    assert.deepEqual(encodeUTF8(text), bytes);
    assert.equal(decodeUTF8(bytes), text);
    const b64 = Buffer.from(bytes).toString("base64url");
    assert.equal(encodeBase64URL(bytes), b64);
    assert.deepEqual(decodeBase64URL(b64), bytes);
  }
  assert.throws(() => decodeUTF8(Uint8Array.of(255)));
});
test("native text tokens retain v0.4 compatibility and omit GPS/steward", () => {
  const state = newPortal(
    empty(),
    details("Local tools", { latitude: 52.04, longitude: -4.31 }, true),
  );
  const portal = state.portals[0],
    token = makePortalToken(portal);
  assert.ok(token.byteLength <= 255);
  const decoded = parsePortalToken(token.text);
  assert.equal(decoded.name, portal.name);
  assert.equal(decoded.location, null);
  assert.equal(decoded.steward, "");
  assert.equal(decoded.shareable, false);
  assert.equal(decoded.received, true);
  assert.equal(mergeReceivedPortal(empty(), decoded).state.portals.length, 1);
  assert.throws(() => makePortalToken({ ...portal, shareable: false }));
});

import { editPortal } from "../src/mesh/model.mjs";
test("adding a geographic position keeps the existing relationships and activities", () => {
  let s = newPortal(sampleState(), details("Real workshop"));
  const id = s.portals.at(-1).id;
  s = connect(s, id, "p1", "Tools for the kitchen");
  s = proposeSession(s, {
    portalId: id,
    title: "Repair",
    start: "11:00",
    end: "12:00",
    space: "Workshop",
    description: "",
  });
  const edited = editPortal(
    s,
    id,
    details("Real workshop", { latitude: 52, longitude: -4 }),
  );
  assert.equal(edited.portals.length, s.portals.length);
  assert.deepEqual(edited.links, s.links);
  assert.deepEqual(edited.sessions, s.sessions);
  assert.equal(locatedPortals(edited).length, 1);
  assert.throws(() => editPortal(s, "p1", details()), /fictional examples/);
});


test("local sample overlay stays fictional, nearby and outside saved/shared coordinates", () => {
  const state = sampleState();
  const before = JSON.stringify(state);
  const area = { latitude: 51.5, longitude: -0.1 };
  const pins = sampleOverlay(state, area);
  assert.equal(pins.length, state.portals.length);
  for (const pin of pins) {
    assert.equal(pin.demo, true);
    assert.ok(Math.abs(pin.location.latitude - area.latitude) < 0.01);
    assert.ok(Math.abs(pin.location.longitude - area.longitude) < 0.02);
  }
  assert.equal(JSON.stringify(state), before);
  assert.equal(locatedPortals(state).length, 0);
  assert.ok(sharedMesh(state).portals.every(p => !p.location));
  assert.deepEqual(sampleOverlay(state, null), []);
  assert.deepEqual(sampleOverlay(state, {latitude: NaN, longitude: 0}), []);
  for (const pin of sampleOverlay(state, {latitude: 89.999, longitude: 179.999})) {
    assert.ok(pin.location.latitude <= 90);
    assert.ok(pin.location.longitude >= -180 && pin.location.longitude <= 180);
  }
});


test("calendar export uses chosen local date and labels fictional sessions", async () => {
  const { calendarEvent } = await import('../src/mesh/calendarEvent.mjs');
  const session = {title: 'Repair', start: '10:00', end: '11:00', space: 'Workshop', description: 'Bring tools', demo: false};
  const event = calendarEvent(session, '2026-11-15');
  assert.equal(event.startDate.getFullYear(), 2026);
  assert.equal(event.startDate.getMonth(), 10);
  assert.equal(event.startDate.getDate(), 15);
  assert.equal(event.startDate.getHours(), 10);
  assert.equal(event.endDate.getHours(), 11);
  assert.equal(event.location, 'Workshop');
  assert.throws(() => calendarEvent(session, '2026-02-30'));
  assert.throws(() => calendarEvent(session, '15/11/2026'));
  assert.throws(() => calendarEvent({...session, end: '09:00'}, '2026-11-15'));
  const demo = calendarEvent({...session, demo: true}, '2026-11-15');
  assert.match(demo.title, /Illustrative/);
  assert.doesNotMatch(demo.location, /Workshop/);
});
