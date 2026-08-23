# Amendment v0.7a — Structured Output Schema Compatibility

Date: 2026-08-23
Branch: `v0.7-synthetic-action-benchmark`

## Trigger

The first authenticated v0.7 model run reached the OpenAI Responses API but every structured-output call failed before generation. The API rejected both the inherited v0.6 action schema and the v0.7 comparison schema because some property schemas used `const` or `enum` without an explicit `type`.

Observed error:

`Invalid schema for response_format ... schema must have a 'type' key.`

The failed run is apparatus failure only and is not research evidence.

## Amendment

This is a schema/API-compatibility correction, not a change to the RWB mechanism, prompts, cases, comparison conditions, or outcome hypotheses.

1. Give every enum-valued property an explicit JSON type.
2. Replace `const`-only properties with typed single-value enums for Structured Outputs compatibility.
3. Remove schema keywords not needed for model generation where local validation already enforces the invariant.
4. Strengthen preflight so it tests the actual Rheo action structured-output path and the bare comparison structured-output path before launching the 60-attempt benchmark.
5. Preserve exactly-three-actions as both a schema constraint and an application-level invariant.

## Interpretation boundary

No output from a run that fails this preflight is admissible for the v0.7 comparison. The correction does not alter case text, the bare prompt, Rheo diagnosis logic, action taxonomy, blinding, or the planned unit of analysis.
