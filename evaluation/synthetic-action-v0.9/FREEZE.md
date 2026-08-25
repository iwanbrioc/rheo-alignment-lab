# Synthetic Action Benchmark v0.9 — Operational Freeze

## Frozen implementation

The clarified Rheo v0.9 operational implementation was frozen **before** construction of the confirmatory `SYN-201`–`SYN-210` case corpus.

Frozen branch:

`v0.9-operational-freeze`

Frozen commit:

`2f6f6a72403b068cbb8908aa40ccc26c6b555eb8`

The freeze contains:

- `docs/RHEO_CANONICAL_OPERATIONAL_LEXICON_v0.9.md`
- `prompts/rheo-v0.9-flow-system-prompt.md`
- `prompts/rheo-actions-v0.9-system-prompt.md`
- `schemas/rheo-flow-v0.9.schema.json`
- `schemas/rheo-actions-v0.9.schema.json`
- `server_v0_9.mjs`
- `evaluation/operational-v0.9/smoke_v0_9.mjs`

No implementation file above may be changed on the confirmatory benchmark branch after this freeze. The v0.9 preflight checks for drift against `origin/v0.9-operational-freeze`.

## Development smoke result immediately before freeze

The OpenAI development smoke passed structurally and behaviourally using `gpt-5.6-sol`.

Observed development result:

- working horizons: 4
- primary triplet: `Curiosity → Outer Self → Capacity`
- primary discriminating question: whether the council would accept a quantified, auditable rota-based reduction toward the required saving and what documentation would make it admissible
- smallest release: ask that question immediately rather than spend the available window designing a rota first
- learning action: use eight representative weeks of payroll/rota evidence to calculate the maximum plausible avoidable-overtime saving and compare that upper bound with the target before designing a rota
- generative action: create only a conditional, time-limited authority to test a revised rota if the external clarification makes that option relevant

The smoke case deliberately resembled a previously seen v0.8 failure pattern. It is **development evidence only** and must not be treated as confirmatory support for v0.9.

## Last implementation change before freeze

The final prompt change tightened `learning_action` validity so that it must acquire, expose or compare evidence capable of discriminating between materially different causal explanations or constraints. Merely documenting contingencies, preparing a decision tree, or rehearsing the smallest release does not qualify.

No further prompt tuning is permitted from inspection of `SYN-201`–`SYN-210` outputs.
