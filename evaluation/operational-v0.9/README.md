# Rheo v0.9 operational development smoke test

## Status

Development-only probe for the canonical operational implementation.

This is **not** confirmatory benchmark evidence. `DEV-001` deliberately resembles a known v0.8 failure pattern so that the implementation can be checked against a previously observed weakness before any new v0.9 benchmark cases are generated.

Do not use the result of this smoke test as evidence that v0.9 outperforms v0.8, matched control, or bare advice.

## What it checks

The smoke test starts `server_v0_9.mjs`, then exercises:

1. `GET /api/health`
2. `POST /api/rheo-flow`
3. the v0.9 reciprocal-map handoff
4. `POST /api/rheo-actions`
5. exactly three distinct action kinds
6. the required observable-relationship / discriminating-question / falsifier fields
7. absence of the specific dead-label formulations identified after v0.8, such as `relocate toward Capacity`

In fixture mode it checks plumbing and schema handling only.

In OpenAI mode it is also a behavioural development probe of whether the new operational grammar is being expressed by the model.

## Fixture smoke

```bash
npm run smoke:v0.9
```

Expected ending:

```text
v0.9 smoke PASS
provider=fixture
...
Fixture mode validates plumbing/schema only.
```

## Behavioural development smoke with OpenAI

Set `OPENAI_API_KEY` locally first. Do not commit or paste the key into logs or chat.

```bash
export RHEO_MODEL_PROVIDER=openai
export OPENAI_MODEL=gpt-5.6
npm run smoke:v0.9
```

The smoke prints the primary triplet, discriminating question, smallest release and the three actions so they can be inspected before any benchmark is designed.

## Development interpretation

For the `DEV-001` library-style case, a promising v0.9 output should normally recognise that a cheap external clarification can dominate more elaborate internal analysis: ask what forms of saving satisfy the council requirement before consuming the three-week window.

That expectation is a **development check derived from already-seen v0.8 material**, not a blind or confirmatory prediction.

The output should also avoid using canonical terms as substitutes for causal explanation. Canonical labels may appear in diagnostic fields, but practical action fields should remain actionable to a decision-maker who does not know the ontology.

## Freeze boundary

Do not create the v0.9 confirmatory case corpus until:

- fixture smoke passes;
- OpenAI smoke passes structurally;
- the behavioural output has been inspected for canonical/actionable fidelity;
- any implementation defect found by the smoke has been fixed;
- the implementation is then frozen before new benchmark outputs are generated.
