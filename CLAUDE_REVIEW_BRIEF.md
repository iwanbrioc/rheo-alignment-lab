# Independent review brief for Claude (or another external critic)

Please review this repository as an adversarial alignment/safety critic rather than as a collaborator trying to improve the prose.

## Important history
The current design already reflects repeated criticism. That creates benchmark contamination. Do **not** treat the visible development tests as evidence of safety merely because the implementation now names them.

## Review priorities
1. Look for mechanisms by which a single narrator can still capture the map despite provenance tags.
2. Look for ways provenance itself can be gamed or become cosmetic bookkeeping.
3. Attack the symmetry/discrimination/stability triad. Find outputs that score well while remaining useless or harmful.
4. Look for harmful advice under **correct local operation**, especially displaced cost to absent parties.
5. Attack the power/coercion gate for both false negatives and false positives.
6. Look for ways the team could inadvertently optimise to its own public tests.
7. Identify any field that has quietly become a proxy objective.
8. Review event instrumentation for flattery-selection bias and missing-data bias.
9. Challenge whether the seven Reciprocal Wellbeing horizons contribute anything beyond the sham-control prompt.
10. State clearly which claims are currently unsupported rather than proposing rescuing interpretations.

## Independence request
Please do not author or score the eventual sealed confirmatory set if you materially influence implementation after this review.

## Useful output format
- Critical flaw
- Concrete adversarial case
- Why current mechanism fails
- What result would falsify your concern
- Whether this is specific to Rheocracy or general AI decision support
