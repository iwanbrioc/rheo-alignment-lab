import test from "node:test";
import assert from "node:assert/strict";
import { findPortals, distanceKm } from "../src/mesh/discovery.mjs";
import { newPortal, sampleState } from "../src/mesh/model.mjs";
const empty = () => ({
  version: 4,
  researchArm: null,
  portals: [],
  links: [],
  sessions: [],
  myPath: [],
});
const details = (
  name,
  description = "Ask the host",
  location = null,
  category = "Essentials",
) => ({
  name,
  description,
  location,
  category,
  kind: "Resource",
  steward: "Host",
  shareable: false,
});
test("essential shortcuts match descriptions without treating all essentials as available food", () => {
  let state = newPortal(
    empty(),
    details("Spare blankets", "Warm clothing; call first"),
  );
  state = newPortal(state, details("Drinking water refill"));
  assert.equal(
    findPortals(state, { topic: "warmth" })[0].portal.name,
    "Spare blankets",
  );
  assert.equal(findPortals(state, { topic: "water" }).length, 1);
  assert.deepEqual(findPortals(state, { topic: "food" }), []);
});
test("fictional emergency resources stay out of Find; examples remain an explicit map choice", () => {
  assert.deepEqual(findPortals(sampleState()), []);
  assert.ok(findPortals(sampleState(), { includeExamples: true }).length > 0);
});
test("care, creativity and growing remain discoverable without location permission", () => {
  let state = newPortal(
    empty(),
    details("Open mic", "Poetry and music", null, "Creativity"),
  );
  state = newPortal(
    state,
    details("Caring circle", "Listen and meet neighbours", null, "Belonging"),
  );
  state = newPortal(
    state,
    details("Community garden", "Share growing skills", null, "Nature"),
  );
  assert.equal(
    findPortals(state, { topic: "creative" })[0].portal.name,
    "Open mic",
  );
  assert.equal(
    findPortals(state, { topic: "care" })[0].portal.name,
    "Caring circle",
  );
  assert.equal(
    findPortals(state, { topic: "garden" })[0].portal.name,
    "Community garden",
  );
});
test("distance orders equally matching real records without turning proximity into a trust or safety score", () => {
  const position = { latitude: 51.5, longitude: -0.1 };
  let state = newPortal(
    empty(),
    details("Food farther", "Shared meals", {
      latitude: 51.6,
      longitude: -0.1,
    }),
  );
  state = newPortal(
    state,
    details("Food nearer", "Shared meals", {
      latitude: 51.501,
      longitude: -0.1,
    }),
  );
  state = newPortal(state, details("Food unlocated", "Shared meals"));
  const before = JSON.stringify(state);
  const found = findPortals(state, { query: "food", position });
  assert.equal(found[0].portal.name, "Food nearer");
  assert.equal(found.at(-1).distance, null);
  assert.equal(found[0].portal.shareable, false);
  assert.equal(JSON.stringify(state), before);
  assert.ok(
    distanceKm(
      { latitude: 0, longitude: 179.9 },
      { latitude: 0, longitude: -179.9 },
    ) < 23,
  );
  assert.deepEqual(findPortals(state, { query: "food missing" }), []);
});

test("essential shortcuts do not mistake substrings for resources", () => {
  let state = newPortal(
    empty(),
    details(
      "Embedded arts",
      "Watercolour workshop with partners",
      null,
      "Creativity",
    ),
  );
  assert.deepEqual(findPortals(state, { topic: "shelter" }), []);
  assert.deepEqual(findPortals(state, { topic: "water" }), []);
  state = newPortal(state, details("Spare blankets"));
  assert.equal(findPortals(state, { topic: "warmth" }).length, 1);
});
