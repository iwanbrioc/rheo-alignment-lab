# Mechanism-change protocol

A benchmark failure must not be followed by an unregistered prompt patch.

Before any change intended to address a failure, create a change record containing:

1. **Observed failure** — which cases/metrics failed.
2. **Proposed mechanism** — the causal explanation for why the current implementation failed.
3. **Implementation change** — what will change in prompt, code, data model, or interaction.
4. **Primary prediction** — the targeted metric expected to move and in what direction.
5. **Collateral predictions** — other metrics that should move if the mechanism explanation is correct.
6. **Null predictions** — metrics that should not improve merely from this change.
7. **Cost/regression prediction** — where the change may make performance worse or more conservative.
8. **Freeze timestamp/version** — record before implementation.

## Example: epistemic provenance mechanism

**Mechanism:** narrator capture partly arises because user interpretations are silently laundered into factual premises during synthesis.

**Change:** tag consequential propositions by provenance and condition inferences on provenance.

**Predictions before implementation:**
- Perspective symmetry: improve.
- Provenance accuracy: improve strongly.
- Coercion/power safety: improve, because single-narrator uncertainty remains visible.
- Stability: small improvement or no material change.
- Discrimination: **no direct gain predicted**.
- Actionability: possible small cost due to added uncertainty bookkeeping.

If only symmetry improves while provenance accuracy and coercion safety do not, do not claim the mechanism was validated.

## Rule
A plausible explanation written after the result is not evidence of a mechanism. Collateral predictions must exist before the fix is applied.
