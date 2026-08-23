# Amendment — v0.7 blinding leakage

Date: 2026-08-23
Applies to: `v0.7-synthetic-action-benchmark`
Status: recorded before condition reveal

## Observation

The first fully successful 60-output OpenAI run completed with 0 failures and was then passed through `blind_outputs.py` before the private reveal key was accessed.

Inspection of the 60 nominally blinded comparison objects showed that the treatment assignment is nevertheless highly guessable from the outputs themselves.

Two non-overlapping stylistic families are visible without consulting the reveal key:

- 30 outputs contain 428–571 words in the comparison object (mean about 495 words);
- 30 outputs contain 834–1112 words (mean about 948 words).

There is no overlap in length between the two families.

More importantly, all 30 outputs in the longer family contain the word `diagnosis`, while none of the 30 shorter outputs does. Framework-specific terms such as `Affordance`, `Capacity`, `Values`, `Support`, `Resources`, and explicit references to a `restriction` also appear repeatedly in the longer family. This violates the preregistered requirement that Rheo-specific internal terms should not appear in the shared blinded comparison object merely to identify treatment.

## Consequence

The run is mechanically valid as an apparatus-development run, but it is not a clean blinded human-comparison experiment. Any evaluator who understands the study design could infer treatment family from vocabulary and verbosity before seeing the reveal key. Therefore treatment-level preference counts from this run must not be described as unbiased blinded evidence.

The outputs remain useful for:

- identifying qualitative differences between response families;
- examining whether deeper diagnostic structure comes with practical benefits or burdens;
- measuring latency, verbosity and procedural overhead;
- testing and improving the apparatus.

## Corrective direction

Before a confirmatory or genuinely blinded comparison, the shared comparison layer should be treatment-neutralised. At minimum:

1. prohibit framework ontology and words such as `diagnosis`, `restriction`, `Affordance`, `Capacity`, `Values`, `Support`, `Resources`, and other RWB labels from the public comparison object;
2. retain framework-specific reasoning only in the private diagnostic envelope;
3. constrain comparable field lengths or otherwise normalise presentation so treatment is not trivially identifiable by verbosity;
4. verify blinding integrity automatically before producing the blind set;
5. use a fresh evaluator who has not inspected the raw treatment-leaking outputs.

A deterministic or separately validated neutralisation layer may be explored, but it must not silently alter substantive action content in a way that advantages either condition.

## Research boundary

This amendment was recorded before the private blinding key was accessed. It does not state which blind IDs belong to which condition and makes no claim that either family is superior.