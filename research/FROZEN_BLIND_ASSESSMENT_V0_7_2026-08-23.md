# Frozen blind assessment — v0.7 synthetic action benchmark

Date: 2026-08-23
Run: `2026-08-23T17-39-29-607Z`
Evaluator: ChatGPT (GPT-5.6 Sol)
Status: frozen before private condition reveal

## Materials inspected

- 60 files from the run's `BLINDED` folder (`M001`–`M060`), six outputs per synthetic case.
- The frozen case corpus in `evaluation/synthetic-action-v0.7/CASES.json`.
- The private blinding key was **not** inspected.

## Important blinding limitation

The nominally blinded outputs fall into two trivially distinguishable stylistic families. This is recorded separately in `AMENDMENT_V0_7_BLINDING_LEAK_2026-08-23.md` and means that treatment-level preference counts from this run cannot be described as clean unbiased blinded evidence.

This assessment therefore freezes blind-ID judgments while explicitly declining to infer or record condition assignments.

## Evaluation frame

For each case I made two separate judgments rather than collapsing everything into one score:

1. **Practical preference** — which response I would most readily hand to a real decision-maker as the best next-step advice, considering fit to the vignette, clarity, proportionality, decision horizon, and burden.
2. **Diagnostic/generative depth** — which response most strongly tests assumptions, exposes generating conditions, preserves future options, identifies displaced costs, and creates useful learning or capability.

These axes are deliberately separated because a response can be diagnostically richer but less usable as immediate advice, or vice versa.

## Frozen case-level judgments

| Case | Practical preference | Runner-up | Diagnostic / generative depth | Rationale |
|---|---|---|---|---|
| SYN-001 Remote-work policy | **M031** | M034 | **M031** | M031 gives a concrete activity-based pilot with remote-access and non-retaliation safeguards while still producing decision-relevant evidence. M034 is substantially more concise and remains strong practical advice. |
| SYN-002 Creative project partnership | **M052** | M025 | **M025** | M052 is the cleanest real-world contract strategy: define authority, run a scenario, set a walk-away threshold. M025 goes further in testing decision rights and building adaptation capability, but at greater procedural cost. |
| SYN-003 Software migration | **M041** | M033 | **M033** | M041 directly addresses the known failure mode: agree process/ownership, negotiate the vendor deadline, then pilot. M033 gives the strongest diagnostic workflow test and alternative explanations, but is heavier than necessary for immediate advice. |
| SYN-004 University course closure | **M039** | M043 | **M043** | M039 is a crisp counterfactual sequence: compare closure/continuation/restructure, then improve or close conditionally. M043 adds the strongest system-boundary and capability-loss analysis, but is more elaborate. |
| SYN-005 Museum collections storage | **M047** | M002 | **M002** | M047 efficiently addresses the source of recurring pressure while keeping shared storage, new build and governed deaccessioning in play. M002 most thoroughly connects the immediate capital decision to collections-flow and stewardship structure. |
| SYN-006 Farm succession | **M048** | M014 | **M014** | M048 best sequences family-goal clarification, financial comparison and a reversible land arrangement before the seasonal deadline. M014 is stronger at separating operating, ownership, inheritance and viability hypotheses. |
| SYN-007 Local food procurement | **M013** | M027 | **M027** | M013 is highly actionable: assess readiness, build supplier capability, then pilot redesigned procurement. M027 better stress-tests the procurement system and creates reusable interfaces, but with more machinery. |
| SYN-008 Festival growth | **M055** | M017 | **M017** | M055 is the clearest immediate answer: negotiate value/capacity protections, otherwise decline or accept knowingly. M017 more explicitly tests ownership, workload and participation conditions and creates a stewardship mechanism. |
| SYN-009 Small charity merger | **M006** | M011 | **M011** | M006 gives a balanced time-limited assessment with merger, partnership and safeguarded-merger routes. M011 more rigorously verifies funder conditions and complementary capabilities before allowing governance conflict to dominate. |
| SYN-010 Employee ownership transition | **M024** | M001 | **M001** | M024 gives a proportionate comparison of employee ownership and private sale followed by conditional pathways. M001 provides deeper financial/governance testing and capability-building, but at higher complexity. |

## Cross-case qualitative observations

### Family A: concise decision advice

One family of outputs is consistently shorter and usually follows a familiar pattern: assess or negotiate the immediate issue, then present two or three clear strategic routes. Its strengths are proportionality, legibility, speed and decision usefulness. It often identifies the central issue correctly with little conceptual overhead.

Its recurring weaknesses are that it can remain at the presenting-problem level, treat alternatives as static choices rather than discriminating experiments, and provide thinner analysis of power, displaced burden, irreversibility and mechanisms by which the situation might change.

### Family B: diagnostic / experimental advice

The other family repeatedly converts the decision into bounded tests, explicit alternative hypotheses, review gates, reversible experiments, stop conditions and reusable capabilities. It is generally stronger at identifying hidden dependencies, displaced costs, power or participation risks and ways later evidence could overturn the initial interpretation.

Its recurring weaknesses are equally clear: it is often almost twice as long, more bureaucratic, and prone to creating facilitators, registers, design cells, stewardship groups, compensated panels, decision gates and documentation systems when a competent actor may simply need a clear negotiation, comparison or pilot. Some outputs feel designed for research traceability rather than for the cognitive bandwidth of a real decision-maker.

## Most important developmental finding before reveal

The benchmark appears to be testing a genuine trade-off, not simply 'good versus bad' advice.

The richer family often adds mechanisms that the concise family omits: explicit disconfirmation, option preservation, burden mapping and capability-building. But those gains frequently come with procedural mass. In several cases the concise response is the one I would actually choose to use, because it captures the central move with far less friction.

That suggests the next design question should not simply be whether the richer method produces more analysis. It should be whether it can retain its distinctive diagnostic value while becoming **much smaller, faster and less procedural**.

## Judgments intentionally not made before reveal

- No blind ID was assigned to Bare or Rheo.
- No condition-level win count was calculated.
- No superiority claim was made.
- No inferential statistics were performed.

The condition key may now be revealed if the purpose is to compare these already-frozen judgments with actual assignment, but the blinding-leak amendment must remain attached to any interpretation.