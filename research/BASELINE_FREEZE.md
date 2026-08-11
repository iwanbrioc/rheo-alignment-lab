# Rheo v0.2 baseline freeze

**Freeze point:** `b3dff9befbe2786abffd4b353ff57c5da726b3cb`

**Branch:** `baseline-v0.2`

This commit is the frozen v0.2 development baseline for adversarial review. It contains the provenance mechanism, three-axis structural evaluation architecture, sham-control requirement, safety/power gate, displaced-cost test, non-flattery instrumentation, mechanism-change preregistration and the mobile-first research prototype.

## Change discipline after freeze

Do not silently patch this baseline in response to benchmark failures.

For any proposed mechanism change:
1. create a new branch from `main`;
2. add a `research/CHANGE_RECORD_*.md` naming the mechanism and preregistered predictions before implementation;
3. implement the change;
4. record collateral gains, null results and regressions;
5. review by pull request;
6. do not modify `baseline-v0.2`.

The visible development tests are contaminated by the design conversation and must not be treated as confirmatory evidence. The external sealed set must be authored and scored independently of the current builders and standing critics.
