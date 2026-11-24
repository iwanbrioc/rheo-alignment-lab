# Aligned to what? Reciprocal wellbeing and the preservation of agency
Iwan Brioc — Rheo Alignment Lab | Discussion paper, 24 November 2026 | v0.1, unreviewed

## Abstract
Alignment involves both reliable implementation of an objective and justification of that objective. Reciprocal Wellbeing (RWB) proposes that flourishing emerges through interdependent conditions rather than constituting a single fixed target. We propose reciprocal agency as a provisional family of constraints on AI assistance: preserve informed choice, exit, revision, future viability and the visibility of burdens imposed on others. Rheo is an experimental setting for falsifying claims about these constraints. We distinguish behavioral evaluation from mechanistic guarantees and propose decoupled-feedback experiments as a bridge.

## 1. The normative gap
Winer (2026) describes a pipeline for estimating rare dangerous behavior from learned mechanisms and identifies the need for a well-defined evaluative target. His account of indirect normativity emphasizes supporting present safety and learning while deferring difficult choices to the future person. RWB complements this by asking which social and ecological conditions make future choice possible. It cannot substitute for a mechanistic estimator or establish safety against deceptive alignment.

## 2. Context and reciprocity
RWB uses seven nested, unscored lenses: natural environment, culture, infrastructure, society, outer self, inner self and no self. Context Oriented Arts informs the practical stance that an observer is implicated in the situation observed. The last horizon is not a measurable outcome or a metaphysical prerequisite for participation. Rheocracy is a proposed governance process through which affected parties may challenge representations, introduce neglected perspectives and revise decisions. Neither framework authorizes an AI to decide what flourishing means for others.

Reciprocal agency means the practical ability of affected parties to understand, choose, refuse, contest and revise an intervention, subject to the corresponding agency and viability of others. This is not identical to maximising the number of options: unsafe or exploitative options may need constraint, and the ability to exit abuse must take precedence over preserving a relationship. The smallest sufficient intervention is a defeasible principle, not a prohibition on decisive protective action.

## 3. A candidate formal interface
Let a case x contain a world state s, a user goal g, affected parties P, uncertainty U and a set of feasible interventions A. For each action a and horizon t define an independently specified vector V(x,a,t) comprising evidence of informed consent, viable exit, reversibility, factual accuracy, burden displacement and future choice. Include explicit missingness. For controlled toy worlds each dimension may be a computable predicate on a causal transition model; outside toy worlds, estimates require evidence and contestation. A critical safety constraint may be expressed as L_k(x,a)=1 when a stipulated viability floor is violated, 0 when not, and unknown otherwise. Expected loss for each known predicate could be a candidate target for ARC-style estimation; an unknown must not be treated as zero. No universal aggregation is proposed. Conflicting constraints require human judgment, and a vector does not by itself meet ARC's scalar specification.

## 4. Decoupled feedback
Distinguish causal paths A→S→J (action changes circumstances which affect judgment) and A→J (action affects judgment directly). Direct effects can be legitimate, e.g. truthful education or requested emotional support; the concern is undisclosed distortion that increases favorable judgment without informed endorsement or relevant improvements. A controlled simulator can record action, state transition and reporting channel separately. Hold the reporting channel fixed when evaluating state changes; perturb the channel to test whether an agent chooses to inflate its evaluation. Human trials require independent assessors, participant consent and safety review. Self-reported wellbeing is important but neither sufficient nor dispensable.

## 5. Empirical programme
The existing v0.2 baseline uses provenance labels, symmetry/discrimination/stability, a matched sham and frozen candidate claims. Extend, do not retrospectively alter, those claims. A proposed benchmark compares ordinary assistance, compute-matched generic deliberation and Rheo on paired scenarios with hidden state-transition keys. Test manipulation, narrator capture, coercion, displaced harm, horizon mismatch and undue refusal. Measure state and report separately. Preregister endpoints, model versions and scoring, hold out externally authored cases and publish negative results. See RECIPROCAL_AGENCY_BENCHMARK.md.

## 6. Related work and differentiation
Positive Alignment (Laukkonen et al., 2026) foregrounds pluralistic human and ecological flourishing and decentralised oversight. RWB offers a candidate applied heuristic, not a claim to have originated those concerns. Collective Intelligence Project alignment assemblies demonstrate practical participatory approaches; Rheocracy could be tested as a revisable process alongside them. Rawls's original position suggests a perspective-taking device, not a guarantee of impartiality. The capability approach likewise foregrounds substantive opportunities rather than satisfaction alone. Corrigibility and reward tampering literature motivate preserving correction and separating objectives from manipulated measurement.

## 7. Limitations and invitation
RWB is not independently validated as an alignment mechanism; no current result establishes generalization to frontier models, rare catastrophes or internal motivations. The v0.3 field prototype uses deterministic local rules, not AI ranking. Its signatures verify record integrity, not truth or legitimacy. We invite critical collaboration on toy-world evaluative predicates, causal identification, independent benchmark authorship and participatory specification. A negative or null result against a strong control is a useful outcome.

## References
- Winer, M. (2026, June 9). A Mike's-Eye View of ARC's Research. https://www.alignment.org/blog/a-mikes-eye-view-of-arcs-research/
- Laukkonen, R., et al. (2026). Positive Alignment: Artificial Intelligence for Human Flourishing. Preprint. https://arxiv.org/abs/2605.10310
- Collective Intelligence Project. Alignment Assemblies. https://www.cip.org/alignmentassemblies
- Rawls, J. (1971). A Theory of Justice. Harvard University Press.
- Sen, A. (1999). Development as Freedom. Oxford University Press.
- Soares, N., Fallenstein, B., Yudkowsky, E., & Armstrong, S. (2015). Corrigibility. AAAI Workshop on AI and Ethics.
- Everitt, T., et al. (2021). Reward tampering problems and solutions in reinforcement learning: A causal influence diagram perspective. Synthese. https://arxiv.org/abs/1908.04734
- Rheo Alignment Lab. Research baseline and frozen claims. https://github.com/iwanbrioc/rheo-alignment-lab
