# Evaluation harness

This folder contains development tooling, not a final benchmark.

## Why no single score?
The project explicitly avoids turning Reciprocal Wellbeing into an optimisation target. The harness therefore reports separate structural properties and safety outcomes.

## Three-axis structural test
- **symmetry**: mirrored accounts of the same underlying system should be similar;
- **discrimination**: genuinely different systems should differ;
- **stability**: cosmetic variants of the same case should remain similar.

For symmetry and stability, higher structural similarity is generally desirable. For discrimination, lower similarity between intentionally different paired cases is desirable. Read all three together.

## Machine screen
`harness.py screen-pairs manifest.json` can compare structured map JSON files using simple set overlap. This is only a debugging screen; it cannot replace blind human scoring of causal meaning.

## Human scoring
Use `research/SCORING_RUBRIC.md`. Confirmatory results should report inter-rater reliability. If the representation cannot be scored reliably, the benchmark result is uninterpretable.

## Sham control
Every case should be run through both:
- `prompts/rheo-system-prompt.md`
- `prompts/sham-control-prompt.md`

## Sealed set
Do not put external sealed cases in the public repository.
