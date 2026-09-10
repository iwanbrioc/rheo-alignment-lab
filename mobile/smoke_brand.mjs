import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('@expo/config-plugins/package.json'));
const { parseStringPromise } = expoRequire('xml2js');
const imageRequire = createRequire(require.resolve('@expo/image-utils/package.json'));
const parsePng = imageRequire('parse-png');
const read = (file) => readFileSync(new URL(file, import.meta.url));
const brand = JSON.parse(read('./assets/brand/rheo-brand.generated.json'));
const canonical = read('./assets/brand/rheo-ident-final.svg');
const { svg } = await parseStringPromise(canonical);
assert.equal(brand.sourceSha256, createHash('sha256').update(canonical).digest('hex'));
assert.equal(brand.lotusPath, svg.defs[0].path.find((path) => path.$.id === 'rheo-lotus').$.d);
assert.equal(brand.lotusTransform, svg.g[0].$.transform);
assert.equal(brand.background, svg.rect[0].$.fill);
assert.equal(brand.lotusColor, svg.g[0].$.stroke);
assert.equal(brand.wordmarkColor, svg.text.find((item) => item._ === 'Rheo').$.fill);

const config = JSON.parse(read('./app.json')).expo;
assert.equal(config.icon, './assets/brand/icon.png');
assert.equal(config.android.adaptiveIcon.backgroundColor, brand.background);
const splash = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
assert.equal(splash.backgroundColor, brand.background);
assert.equal(splash.resizeMode, 'contain');
assert.equal(splash.imageWidth, 200);

for (const [file, opaque] of [[config.icon, true], [config.android.adaptiveIcon.foregroundImage, false], [splash.image, false]]) {
  const png = await parsePng(read(file));
  assert.equal(png.width, 1024);
  assert.equal(png.height, 1024);
  let artwork = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const offset = (y * png.width + x) * 4;
      const [r, g, b, a] = png.data.subarray(offset, offset + 4);
      if (opaque) assert.equal(a, 255, 'iOS icon must be opaque');
      if (a > 0 && (r !== 13 || g !== 35 || b !== 40)) {
        artwork++;
        assert.ok(x > 8 && y > 8 && x < 1015 && y < 1015, 'artwork must not clip');
        if (file.includes('adaptive')) {
          assert.ok(Math.hypot(x - 512, y - 512) < 313, 'lotus must fit Android adaptive safe circle');
        }
      }
    }
  }
  assert.ok(artwork > 10000, `${file} must not be blank`);
}
const wordmark = await parsePng(read('./assets/brand/wordmark.png'));
assert.ok(wordmark.width >= 600 && wordmark.height >= 180, 'wordmark must be crisp at 3x header size');
assert.ok(wordmark.data.some((value, index) => index % 4 === 3 && value === 0), 'wordmark needs transparency');
assert.ok(wordmark.data.some((value, index) => index % 4 === 3 && value === 255), 'wordmark must not be blank');
for (let y = 0; y < wordmark.height; y++) for (let x = 0; x < wordmark.width; x++) {
  if (x < 12 || y < 12 || x >= wordmark.width - 12 || y >= wordmark.height - 12) {
    assert.equal(wordmark.data[(y * wordmark.width + x) * 4 + 3], 0, 'wordmark needs clear edges so no letter can clip');
  }
}

const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (initial) => [initial, () => {}],
};
const native = { StyleSheet: { create: (styles) => styles }, View: 'View', Text: 'Text', TextInput: 'TextInput' };
let components;
function load(file) {
  const { outputText } = ts.transpileModule(read(file).toString(), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require: (name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', G: 'G', Path: 'Path' };
      if (name === 'expo-image') return { Image: 'Image' };
      if (name.endsWith('.generated.json')) return brand;
      if (name.endsWith('.png')) return name;
      if (name.endsWith('/RheoBrand')) return components;
      if (name.endsWith('/theme')) return { colors: {}, radii: {}, spacing: {} };
      if (name.endsWith('/utils/decisionSession')) return { getChosenAction: () => null, describeChoice: () => 'Not yet' };
      if (name.endsWith('/utils/format')) return { formatDateTime: () => 'Today' };
      if (name.endsWith('/utils/preparation')) return { chosenPreparationStep: () => null, latestPreparation: () => null, preparationTasks: () => [] };
      if (name.startsWith('.')) return {};
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return module.exports;
}
function findAll(node, type) {
  if (!node?.props) return [];
  return [ ...(node.type === type ? [node] : []), ...node.props.children.flat(Infinity).flatMap((child) => findAll(child, type)) ];
}
components = load('./src/components/RheoBrand.tsx');
for (const width of [40, 56]) {
  const lotus = components.RheoLotus({ width });
  assert.ok(Math.abs(lotus.props.width / lotus.props.height - 320 / 224) < 1e-12);
  assert.equal(lotus.props.preserveAspectRatio, 'xMidYMid meet');
  assert.equal(lotus.props.accessibilityLabel, 'Rheo lotus');
  for (const path of findAll(lotus, 'Path')) assert.equal(path.props.d, brand.lotusPath);
}
for (const compact of [false, true]) {
  const lockup = components.RheoBrand({ compact });
  assert.equal(lockup.props.accessibilityLabel, 'Rheo');
  assert.equal(lockup.props.accessibilityRole, 'image');
  const art = lockup.props.children[0];
  assert.equal(art.props.accessibilityElementsHidden, true);
  assert.equal(art.props.importantForAccessibility, 'no-hide-descendants');
  assert.equal(findAll(art, components.RheoLotus)[0].props.decorative, true);
  const image = findAll(art, 'Image')[0];
  assert.equal(image.props.contentFit, 'contain');
  assert.equal(image.props.accessible, false);
}
for (const [name, props, compact] of [
  ['AskScreen', { situation: '', recentCount: 0 }, false],
  ['AskScreen', { situation: '', recentCount: 100 }, false],
  ['AdviceScreen', { recommendation: { actions: [] } }, true],
  ['ConfirmationScreen', { session: {} }, true],
  ['RecentDecisionsScreen', { sessions: [] }, true],
]) {
  const Screen = load(`./src/screens/${name}.tsx`)[name];
  const screen = Screen(props);
  const marks = findAll(screen, components.RheoBrand);
  assert.equal(marks.length, 1, `${name} must show one brand`);
  assert.equal(Boolean(marks[0].props.compact), compact);
  if (name !== 'AdviceScreen') {
    assert.equal(screen.props.children[0].props.style.flexWrap, 'wrap', 'header must wrap for narrow screens/large text');
  }
}

console.log('mobile brand smoke PASS | canonical SVG path/hash | icon/splash pixels and safe zone | accessible lockups | all four screens | wrapping headers');
