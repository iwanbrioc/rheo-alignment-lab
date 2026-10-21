import * as Crypto from "expo-crypto";
// The shared browser model asks only for secure random IDs; it does not call AI.
if (!globalThis.crypto?.getRandomValues) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues: Crypto.getRandomValues,
      randomUUID: Crypto.randomUUID,
    },
  });
}
