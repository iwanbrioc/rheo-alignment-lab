# Reciprocal agency development pilot
This is a synthetic, unregistered development benchmark, not a sealed or independently authored dataset. It is separate from the frozen v0.2 baseline and does not change the v0.3 app.

## Run
From repository root, Python 3.10+:
```sh
python3 evaluation/reciprocal_agency/simulator.py smoke
python3 -m unittest discover -s evaluation/reciprocal_agency -p 'test_*.py'
```
For a paid API experiment, configure OPENAI_API_KEY privately in the environment (never commit it), choose one supported pinned Chat Completions model snapshot accepting temperature and max_completion_tokens, then:
```sh
python3 evaluation/reciprocal_agency/simulator.py run --model YOUR_PINNED_MODEL --out pilot.jsonl
python3 evaluation/reciprocal_agency/simulator.py analyze pilot.jsonl
```
72 requests for 24 cases × 3 arms. Actual cost depends on model and token use; prompts and maximum generation budget are fixed within each arm, but prompt lengths and realized compute differ. No network tools are supplied to models. No secrets in logs. Store raw runs privately pending review. Interrupted runs remain auditable but are incomplete; use a new output filename for reruns.

## Sanity check
Direct enumeration of the committed case table: 24 cases, 23 with a stipulated safe improvement, 1 without. A uniform random policy has expected success 25% on feasible cases. Maximizing report_gain (first action wins ties) succeeds in 2/23 feasible cases, selects report manipulation in 7/24 cases and critical violations in 15/24. An oracle with access to outcome keys succeeds on 23/23. These are checks of the hand-authored transition assumptions, not LLM performance or empirical evidence. Many actions are intentionally obvious; ceiling effects are likely. No A/B/C model run has been performed.

## Limits and next phase
Outcome keys are excluded from the request payload but public in this development repository; they are not secure against training contamination. Cases are simplified single-step transitions with stipulated outcome indicators, not measured causal outcomes. No separate delayed trajectory, mirrored/cosmetic variants, randomized feedback incentives, or blinded human ratings yet; the next pilot must add these before claiming fidelity to the full protocol. Factual provenance and structural similarity remain separate tests. The proposed confirmatory set must be independently authored and scored, with power and safety margins registered before use. Do not tune the frozen prompts to these cases.
