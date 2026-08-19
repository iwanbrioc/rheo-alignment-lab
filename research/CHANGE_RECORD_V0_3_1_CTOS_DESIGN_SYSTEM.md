# Change record — v0.3.1 CTOS design-system integration

**Branch:** `v0.3.1-evaluation-ui-repair`  
**Scope:** presentation layer only; no intended change to the case schema, model prompts, evaluator, provenance logic, safety logic, or research conditions.

## Trigger

Apply the production Coming to Our Senses / CTOS Hub design system to Rheo so it feels like part of the same product family while retaining Rheo’s plain-language flow.

The source design system specifies a split visual language: warm editorial/gradient treatment for public or member-facing hero surfaces, and a dense Linear-inspired “Quiet Authority” treatment for working application surfaces. Shared production tokens use Geist for body/UI, Plus Jakarta Sans for display headings, Geist Mono for metadata/numerals, a periwinkle `#667eea` → purple `#764ba2` signature gradient with teal extension, monochromatic app surfaces, 1px-border depth, sharp radii, restrained shadows, colour as signal, crisp motion, and dark-mode parity.

## Intended presentation changes

1. Replace the existing beige/green visual system with CTOS production colour, typography, radius, border, focus and motion tokens.
2. Use the signature gradient only on the Rheo landing hero and small accent signals; keep wizard/work surfaces monochromatic.
3. Use Geist body/UI, Plus Jakarta Sans display headings and Geist Mono for research metadata where available, with sensible system fallbacks.
4. Change cards, buttons, inputs, disclosures and progress navigation from rounded/bubbly styling to the sharper CTOS Hub geometry.
5. Add dark mode using the production near-black surface system and a small theme control in the header.
6. Give the seven RWB horizon cards restrained colour signals rather than large decorative fills.
7. Restyle the AI review panel with the same tokens instead of bespoke rgba/rounded styling.
8. Update PWA theme colours and cache version so the redesign is not hidden by an older service-worker cache.

## Preserved invariants

- Existing DOM ids used by JavaScript remain unchanged.
- Existing user-facing wording and seven-step flow remain unchanged except for any purely visual accessibility label needed for the theme control.
- Case-record field names and values remain unchanged.
- Model request/response logic remains unchanged.
- Research-condition and granularity controls remain behind progressive disclosure.
- Safety wording and activation logic remain unchanged.
- No CTOS brand illustration or mark is redrawn; absent source image assets are simply not introduced.

## Risks / possible behavioural effects

A visual redesign can change perceived trust, completion friction, salience and retention even if the research representation is unchanged. This branch therefore does **not** treat improved completion, trust or model performance after the redesign as evidence for RWB. Any future behavioural comparison involving pre/post redesign sessions must account for the UI version.

## Non-claims

This design integration does not establish that the new UI is more usable, accessible, trustworthy, safer or more effective. It does not alter or validate the RWB hypothesis.
