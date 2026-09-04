#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('./src/location.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
let permission = 'granted';
let servicesEnabled = true;
let gpsUnavailable = false;
let geocodeUnavailable = false;
let positionCalls = 0;
let geocodeInput;
const location = {
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: permission }),
  hasServicesEnabledAsync: async () => servicesEnabled,
  getCurrentPositionAsync: async () => {
    positionCalls++;
    if (gpsUnavailable) return new Promise(() => {});
    return { coords: { latitude: 51.745123, longitude: -2.217456, accuracy: 30 }, timestamp: 1000 };
  },
  reverseGeocodeAsync: async (input) => {
    geocodeInput = input;
    if (geocodeUnavailable) return new Promise(() => {});
    return [{ city: 'Test town', country: 'Test country' }];
  },
};
const module = { exports: {} };
vm.runInNewContext(outputText, {
  module,
  exports: module.exports,
  require: (name) => {
    assert.equal(name, 'expo-location');
    return location;
  },
  setTimeout: (callback, milliseconds) => setTimeout(callback, Math.min(milliseconds, 25)),
  clearTimeout,
});
const { getDecisionLocation } = module.exports;

const result = await getDecisionLocation();
assert.equal(result.latitude, 51.745);
assert.equal(result.longitude, -2.217);
assert.equal(geocodeInput.latitude, 51.745, 'reverse geocoding must not receive precise GPS');
assert.equal(geocodeInput.longitude, -2.217);
assert.equal(result.areaLabel, 'Test town, Test country');

permission = 'denied';
await assert.rejects(getDecisionLocation(), /permission was not granted/);
assert.equal(positionCalls, 1, 'denied permission must prevent GPS lookup');
permission = 'granted';
servicesEnabled = false;
await assert.rejects(getDecisionLocation(), /Location services are off/);
assert.equal(positionCalls, 1);
servicesEnabled = true;
gpsUnavailable = true;
await assert.rejects(getDecisionLocation(), /not available in time/);
gpsUnavailable = false;
geocodeUnavailable = true;
const unnamedArea = await getDecisionLocation();
assert.equal(unnamedArea.areaLabel, null);
assert.equal(unnamedArea.latitude, 51.745, 'area-name failure must not block nearby search');
console.log('mobile location smoke PASS | rounded before geocoding | permission denial | services off | GPS timeout | area-name fallback');
