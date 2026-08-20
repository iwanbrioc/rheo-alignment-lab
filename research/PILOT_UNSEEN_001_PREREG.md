# Pilot preregistration — unseen-001

**Branch:** `historical-corpus-v2-unseen`  
**Status:** workflow pilot only; excluded from evidential/confirmatory claims.  
**Mechanism change:** none.

## Purpose

Exercise the Historical Corpus v2 unseen-case apparatus on one completed, non-public organisational decision before recruiting a benchmark set. The pilot tests temporal separation, privacy, anonymisation, freeze integrity and executable Rheo/comparison runs. It is not selected or retained based on model performance.

## Decision cutoff

T0 is frozen at **24 September 2009**, after the final contemporaneous evidence item admitted to the brief and before later outcome/governance material. No source dated after this cutoff may be used to construct T0.

The private source register may contain real names, organisations and message identifiers. The model-facing T0 must use neutral role labels and remove unnecessary names, places, programme names and distinctive public identifiers while preserving causal structure.

## Temporal separation

- T0 contains only information available by the cutoff.
- T1 records what was actually decided/done after the cutoff.
- T2 records later outcomes and consequential mechanisms.
- T1/T2 remain unavailable to the model-analysis path until all T0 outputs are frozen.
- Retrospective interpretations are not allowed into T0 merely because they are now known to be important.

## Pilot integrity checks

Before any model run:

1. private-case validator passes;
2. T0 evidence items resolve to contemporaneous sources in the private register;
3. no T1/T2-only field or later fact appears in T0;
4. contributor/research/provider permissions are affirmative;
5. T0/T1/T2/consent hashes are frozen;
6. model-facing text contains no unnecessary direct identifiers.

After analysis:

1. both Rheo and comparison conditions must receive the same frozen T0;
2. repeated outputs are frozen before T1/T2 unsealing;
3. failures/missingness are retained;
4. scoring is blind to condition where feasible;
5. no target is rewritten because a model happened to mention it.

## Exploratory pilot question

Can the apparatus preserve enough contemporaneous structure to make a real organisational decision intelligible while preventing later outcome knowledge from entering the model input?

A secondary exploratory annotation may examine whether a map notices changes in the available option set or the cost of delaying clarification. This is **not** a preregistered RWB advantage claim and must not be scored by inventing a post-hoc target after outputs are seen.

## Non-claims

This first case is a workflow pilot. Regardless of result, it does not count toward the Historical Corpus v2 evidence base and cannot establish that Rheo outperforms general reasoning, would have changed the historical decision, or would have improved the outcome.