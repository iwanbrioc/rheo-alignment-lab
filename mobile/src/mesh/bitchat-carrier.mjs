/**
 * Rheo v0.4 text-carrier handoff for the Bitchat app. This does NOT directly control Bluetooth.
 * The two-field TLV below is adapted from public-domain Bitchat source:
 * permissionlesstech/bitchat/bitchat/Protocols/Packets.swift, PrivateMessagePacket.
 * Original Bitchat: Unlicense (public domain). Rheo v0.4 sends plain text via clipboard;
 * Bitchat itself handles the radio framing, routing and any Bitchat session encryption.
 */
import { CATEGORIES, PORTAL_KINDS, validatePortal } from "./model.mjs";
import {
  encodeUTF8,
  decodeUTF8,
  encodeBase64URL,
  decodeBase64URL,
} from "./encoding.mjs";
const encoder = { encode: encodeUTF8 },
  decoder = { decode: decodeUTF8 };
const PREFIX = "RHEO4:";
export function encodeBitchatPrivateTLV(messageId, content) {
  const a = encoder.encode(messageId),
    b = encoder.encode(content);
  if (!a.length || a.length > 255 || b.length > 255)
    throw new Error("Bitchat private-message TLV fields must be 1–255 bytes.");
  return Uint8Array.from([0, a.length, ...a, 1, b.length, ...b]);
}
export function decodeBitchatPrivateTLV(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error("Expected packet bytes.");
  let i = 0;
  const data = {};
  while (i < bytes.length) {
    if (i + 2 > bytes.length) throw new Error("Truncated Bitchat TLV.");
    const type = bytes[i++],
      length = bytes[i++];
    if (
      i + length > bytes.length ||
      !length ||
      type > 1 ||
      data[type] !== undefined
    )
      throw new Error("Invalid Bitchat TLV.");
    data[type] = decoder.decode(bytes.slice(i, i + length));
    i += length;
  }
  if (data[0] === undefined || data[1] === undefined)
    throw new Error("Missing Bitchat message fields.");
  return { messageId: data[0], content: data[1] };
}
function b64url(text) {
  return encodeBase64URL(encodeUTF8(text));
}
function unb64url(text) {
  if (!/^[A-Za-z0-9_-]{1,700}$/.test(text))
    throw new Error("Malformed Rheo token.");
  return decodeUTF8(decodeBase64URL(text));
}
export function makePortalToken(portal) {
  const p = validatePortal(portal);
  if (!p.shareable)
    throw new Error("This portal is not marked appropriate to share.");
  let description = Array.from(p.description).slice(0, 65).join("");
  let token, bytes;
  for (;;) {
    const info = {
      v: 4,
      t: "p",
      p: {
        i: p.id,
        n: p.name,
        c: p.category,
        k: p.kind,
        d: description,
        x: Math.round(p.x),
        y: Math.round(p.y),
      },
    };
    token = PREFIX + b64url(JSON.stringify(info));
    try {
      bytes = encodeBitchatPrivateTLV("rheo-v04", token);
      break;
    } catch (e) {
      if (!description.length)
        throw new Error(
          "This portal name is too long for a single Bitchat-compatible message.",
        );
      description = Array.from(description).slice(0, -1).join("");
    }
  }
  // Bitchat PrivateMessagePacket encodes content in a single-byte length TLV (source parity check).
  const roundtrip = decodeBitchatPrivateTLV(bytes);
  if (roundtrip.content !== token)
    throw new Error("Bitchat framing self-check failed.");
  return {
    text: token,
    byteLength: encoder.encode(token).length,
    framedBytes: bytes.length,
  };
}
export function parsePortalToken(text) {
  if (typeof text !== "string" || text.length > 850)
    throw new Error("Invalid or oversized Rheo token.");
  const token = text.trim();
  if (!token.startsWith(PREFIX)) throw new Error("Expected a RHEO4: token.");
  let data;
  try {
    data = JSON.parse(unb64url(token.slice(PREFIX.length)));
  } catch {
    throw new Error("The Rheo token could not be decoded.");
  }
  if (!data || data.v !== 4 || data.t !== "p" || !data.p)
    throw new Error("Unsupported Rheo token type or version.");
  const p = data.p;
  if (!CATEGORIES.includes(p.c) || !PORTAL_KINDS.includes(p.k))
    throw new Error("Unknown portal category or type.");
  // A Bitchat token does not prove source, steward, accuracy or consent.
  return validatePortal({
    id: p.i,
    name: p.n,
    description: p.d,
    category: p.c,
    kind: p.k,
    steward: "",
    x: p.x,
    y: p.y,
    shareable: false,
    received: true,
  });
}
export function mergeReceivedPortal(state, p) {
  const existing = state.portals.find((v) => v.id === p.id);
  if (existing) {
    if (
      existing.name === p.name &&
      existing.description.startsWith(p.description) &&
      existing.category === p.category
    )
      return { state, added: false };
    throw new Error(
      "A different portal already uses this ID. Nothing was overwritten.",
    );
  }
  if (state.portals.length >= 120)
    throw new Error("The local mesh has reached its demonstration limit.");
  return { state: { ...state, portals: [...state.portals, p] }, added: true };
}
