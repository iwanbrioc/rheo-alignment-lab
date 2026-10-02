# Public website assets

Brand assets are copied, unchanged, from the approved mobile brand at product
commit d320c234976f06a0ae96612b9b11a4cb1b81c5da:

- `rheo-ident-final.svg`: canonical lotus and wordmark; do not redraw or substitute.
- `wordmark.png`: source-derived transparent wordmark with unclipped padding.
- `icon.png`: source-derived lotus app icon and share image.
- `lotus.svg`: exact source lotus path and transform from the app's generated
  brand metadata, using the app header viewBox and 0.85-pixel stroke treatment.

The two `rheo-v010-*.png` files are existing development screenshots from
`docs/screenshots/rheo-v0.10/` at the same commit. They use a synthetic work and
transport scenario, not a participant's personal information. They are not
testimonials or evidence of effectiveness. They are published without alteration.

The previous animated ident remains in the separate `codex/rheo-lotus-ident`
worktree. This update does not publish that older artwork or alter that worktree.
No external fonts, trackers, scripts or embeds are used by this website.

## Favicons

`favicon-lotus.svg` uses the exact approved lotus path and transform, with a
tighter square viewBox and a stronger, opaque stroke for browser-tab sizes. The
dark teal background and light lotus use the source palette; no petals are redrawn.
`favicon-lotus-32.png` is rasterized from this SVG. The root `favicon.ico` contains
16- and 32-pixel versions. The root `apple-touch-icon.png` is a 180-pixel resize of
the unchanged app icon. Both public pages declare all variants.

These are generated assets with no added runtime dependency. To regenerate, use
an existing Sharp installation and Python with Pillow:

```sh
node -e "const s=require(process.argv[1]); (async()=>{await s('assets/favicon-lotus.svg').resize(32,32).png().toFile('assets/favicon-lotus-32.png');await s('assets/icon.png').resize(180,180).png().toFile('apple-touch-icon.png')})().catch(e=>{console.error(e);process.exitCode=1})" /absolute/path/to/sharp
python3 -c "from PIL import Image; Image.open('assets/favicon-lotus-32.png').save('favicon.ico', sizes=[(16,16),(32,32)])"
```
