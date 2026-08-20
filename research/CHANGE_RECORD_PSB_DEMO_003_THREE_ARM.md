# Change record — PSB-DEMO-003 three-arm development comparison

**Branch:** `psb-demo-003-three-arm`  
**Status:** development/demo apparatus only; no claim of validation.  
**Mechanism change:** none to Rheo.

## Trigger

PSB-DEMO-001 and PSB-DEMO-002 both showed that the existing matched general-reasoning control is extremely strong on public-service systems cases. The eventual Welsh Public Services Board use-case is not whether Rheo beats weak reasoning: PSBs are already legally required to use the Well-being of Future Generations (Wales) Act 2015.

## Pre-run research question

On a PSB-relevant decision containing genuine cross-goal trade-offs, does Rheo reveal consequential structure that is not reliably surfaced by (1) strong general structural reasoning or (2) an AI condition explicitly applying the Well-being of Future Generations framework?

## Three conditions

All conditions receive identical frozen T0 and return the identical ontology-neutral `structural-map-v0.3` schema.

- `control`: existing strong general-reasoning prompt; unchanged.
- `future_generations`: uses the seven well-being goals and five ways of working (long-term, prevention, integration, collaboration, involvement) as a practical decision lens; it must not use RWB/Rheocracy/No Self concepts.
- `rheo`: existing Rheo prompt; unchanged.

## Case

Carmarthenshire anchor food procurement, early 2021. The contemporaneous record states an explicit strategic choice between continuing predominantly sector-led procurement and intentionally joining procurement locally across anchor organisations to stimulate local production, processing and distribution. The same record warns that procurement is only a small share of total food demand and should support a wider food-system strategy rather than become the target itself.

## T0/T1/T2 discipline

T0 may use only early-2021 information. Later Bwyd Sir Gâr, Sustainable Food Place recognition, Food Systems Development, Bremenda Isaf public-land-to-public-plate activity, Future Generations Menu and the later Local Food Strategy are excluded from T0. T1 records the direction taken. T2 records later developments separately.

## Pre-run predictions

The `future_generations` arm is expected to be strong on cross-goal integration, long-term effects, prevention, collaboration and involvement.

Rheo is only potentially distinctive if it more consistently surfaces one or more of these without generic overprediction:

- procurement as one lever embedded in a larger regenerative food system;
- authority/resource/capability mismatch between demand, supply, processing, logistics and procurement rules;
- nominal local sourcing versus usable local productive capacity;
- displaced costs from accreditation, seasonality, price pressure, aggregation or centralisation;
- thresholds/path dependence that can lock buyers or small suppliers into brittle structures;
- reciprocal effects where one apparent gain depletes another unless sequencing changes;
- public buyers' own role in creating the market conditions they describe as external constraints;
- future affordance preserved through staged market-building rather than a simple local-purchasing target.

## Expected null

A null is plausible and informative. The Future Generations framework is already systemic and long-term. If the `future_generations` arm and Rheo produce the same consequential map, record the null rather than changing the scoring target.

## Guardrails

Do not score framework vocabulary as insight. Do not assume local means lower carbon. Do not assume centralisation/economies of scale are harmful. Distinguish public-procurement leverage from the much larger household/commercial food economy. Preserve procurement-law, food-safety, accreditation, seasonality and capacity constraints. No scalar RWB or Future Generations score. Repeated samples are not independent cases.

## Claim boundary

PSB-DEMO-003 is public historical development material and may be present in model training. It may support demonstration and research design, but not scientific validation or a claim that Rheo outperforms the statutory Future Generations framework.
