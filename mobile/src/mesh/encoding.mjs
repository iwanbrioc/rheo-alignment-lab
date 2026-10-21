// Small bounded-packet UTF-8/base64 helpers, independent of browser globals.
export function encodeUTF8(text) {
  const encoded = encodeURIComponent(text),
    out = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === "%") {
      out.push(parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else out.push(encoded.charCodeAt(i));
  }
  return Uint8Array.from(out);
}
export function decodeUTF8(bytes) {
  return decodeURIComponent(
    Array.from(bytes, (b) => "%" + b.toString(16).padStart(2, "0")).join(""),
  );
}
const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export function encodeBase64URL(bytes) {
  let out = "",
    buffer = 0,
    bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += alphabet[(buffer >> bits) & 63];
    }
  }
  if (bits) out += alphabet[(buffer << (6 - bits)) & 63];
  return out;
}
export function decodeBase64URL(text) {
  if (text.length % 4 === 1 || !/^[A-Za-z0-9_-]*$/.test(text))
    throw new Error("Malformed base64.");
  const out = [];
  let buffer = 0,
    bits = 0;
  for (const c of text) {
    buffer = (buffer << 6) | alphabet.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 255);
    }
  }
  return Uint8Array.from(out);
}
