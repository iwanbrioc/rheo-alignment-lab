# Rheo mobile brand

`rheo-ident-final.svg` is the approved source of truth. Keep it unchanged; do not
redraw the lotus or substitute the earlier circle-R or animation artwork.

- `rheo-brand.generated.json`: exact source lotus path, transform, palette and SHA-256.
- `wordmark.png`: transparent, high-resolution crop of the source Rheo text, using
  its original font stack, bold weight and proportions. Rendered with an installed
  source-stack fallback on macOS; no font file is bundled. Only its fill changes
  to source dark teal for contrast against the app's warm-neutral background.
  The full source canvas is rasterized before trimming; a 16-pixel transparent
  border keeps every letter clear of image edges. The smoke checks that border.
- `icon.png`: opaque 1024-square lotus-only icon on source dark teal.
- `adaptive-icon.png`: transparent 1024-square lotus within Android's safe circle.
- `splash.png`: transparent 1024-square source lotus and Rheo, without the subtitle,
  displayed on source dark teal by the Expo splash plugin.

`RheoLotus` draws the exact path with `react-native-svg`; its small header treatment
uses a non-scaling 0.85-point stroke for legibility and dark teal on the existing
light UI. Scaling is uniform. `RheoBrand` pairs it with the source-derived wordmark,
announced once as "Rheo"; the inner artwork is hidden from assistive technology.
The source subtitle is deliberately absent from the decision screens.

## Regeneration

Normal installs, tests and builds use the committed files and need no image tools.
For a deliberate brand-source update, use Node, the mobile dependencies and Sharp:

```sh
node scripts/generate_brand_assets.mjs /absolute/path/to/sharp
npm run smoke:local
```

Append `--wordmark-only` after the Sharp path to regenerate just `wordmark.png`
without rewriting the icon, splash or generated source metadata.

The optional argument selects an already-installed Sharp module; otherwise the
script resolves `sharp` normally. Use a machine with a font from the source stack
(Inter, Helvetica Neue, Helvetica, Arial). The script uses Expo's existing XML
parser and never rewrites the source SVG. Visually review regenerated text because
font fallback can differ between machines. No new dependency is needed at runtime
for the PNG files, and there is no SVG transformer.
