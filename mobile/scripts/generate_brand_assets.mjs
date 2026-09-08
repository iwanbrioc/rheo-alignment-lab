import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Reuse Expo's XML parser. Sharp is only needed to regenerate committed artwork.
const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('@expo/config-plugins/package.json'));
const { parseStringPromise, Builder } = expoRequire('xml2js');
const sharp = require(process.argv[2] || 'sharp');
const directory = new URL('../assets/brand/', import.meta.url);
const source = await readFile(new URL('rheo-ident-final.svg', directory), 'utf8');
const { svg } = await parseStringPromise(source);
const path = svg.defs[0].path.find((item) => item.$.id === 'rheo-lotus').$;
const wordmark = svg.text.find((item) => item._ === 'Rheo');
assert.ok(path.d && wordmark);
const background = svg.rect[0].$.fill;
const builder = new Builder({ headless: true, renderOpts: { pretty: false } });
const document = (content, viewBox = '0 0 1024 1024') => builder.buildObject({ svg: {
  $: { xmlns: 'http://www.w3.org/2000/svg', viewBox }, ...content,
} });
const lotus = { ...svg.g[0], use: undefined, path: svg.g[0].use.map(({ $ }) => ({
  $: { d: path.d, 'stroke-width': $['stroke-width'], opacity: $.opacity },
})) };
delete lotus.use;

await writeFile(new URL('rheo-brand.generated.json', directory), JSON.stringify({
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  lotusPath: path.d,
  background,
  lotusColor: svg.g[0].$.stroke,
  wordmarkColor: wordmark.$.fill,
  lotusTransform: svg.g[0].$.transform,
}, null, 2) + '\n');

const icon = (scale, opaque) => document({
  ...(opaque ? { rect: [{ $: { width: 1024, height: 1024, fill: background } }] } : {}),
  g: [{ $: { transform: `translate(512 512) scale(${scale}) translate(-340 -161)` }, g: [lotus] }],
});
await sharp(Buffer.from(icon(2.25, true))).resize(1024, 1024).flatten({ background }).png()
  .toFile(fileURLToPath(new URL('icon.png', directory)));
await sharp(Buffer.from(icon(1.8, false))).resize(1024, 1024).png()
  .toFile(fileURLToPath(new URL('adaptive-icon.png', directory)));
await sharp(Buffer.from(document({ g: [lotus], text: [wordmark] }, '150 26 380 380')))
  .resize(1024, 1024).png().toFile(fileURLToPath(new URL('splash.png', directory)));

// Crop only the approved wordmark, keeping its font stack, weight and proportions.
const wordmarkSvg = document({ text: [{ ...wordmark, $: { ...wordmark.$, fill: background } }] }, '220 280 240 85');
const raster = await sharp(Buffer.from(wordmarkSvg)).resize(960, 340).trim().png().toBuffer();
await writeFile(new URL('wordmark.png', directory), raster);
console.log('Generated Rheo artwork from rheo-ident-final.svg');
