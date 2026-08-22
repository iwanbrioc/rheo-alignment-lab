# Change record — Rheo v0.5 adaptive testimony interview

Status: preregistered before implementation changes on `v0.5-adaptive-interview`.

## Why this change

The v0.4 app correctly encodes the clarified RWB flow physiology, but the primary UX is still a form/wizard organised around the model. That is onerous for users and risks leading testimony toward the theory.

v0.5 changes the primary interaction from **model-first questionnaire** to **testimony-first adaptive interview**.

## Core UX hypothesis

A user should be able to begin with an ordinary account of what is happening, preferably by voice. Rheo should then ask one neutral question at a time, chosen to reduce uncertainty between competing explanations of where flow may be restricted. The RWB model runs behind the interview rather than being taught to the participant in advance.

The visible experience is:

`tell the story → one adaptive question at a time → emergent pattern → inspect evidence → working flow diagnosis → smallest sufficient intervention → later revisit`

The existing v0.4 wizard is retained as a research/debug interface, not removed.

## Non-leading interview constraints

1. Do not ask the participant to label an RWB organ, intervention horizon or activator during testimony collection.
2. Do not expose the model's current preferred restriction hypothesis before sufficient discriminating evidence exists.
3. Questions should use ordinary language grounded in what the participant has already said.
4. Prefer questions that distinguish two or more plausible explanations over questions that merely gather more detail about the leading explanation.
5. Seek contradiction explicitly. The interviewer must periodically ask for evidence that would weaken its current interpretation.
6. Preserve missing accounts as missing. Do not infer another person's motives where their testimony or independent evidence is absent.
7. Distinguish testimony/observation, participant interpretation, Rheo inference and missing account in the interview record.
8. Frame relocation is permitted as a neutral question about perspective or problem-framing, not as blame.
9. Safety/autonomy can override the normal interview path. Do not encourage confrontation, disclosure or dialogue where coercion or inability to refuse may be present.

## Hidden working model

After each participant turn, Rheo may internally maintain competing hypotheses for the seven downsweep organs:

- Resources
- Values
- Affordance
- Support
- Capacity
- Wellbeing
- Everything / Nothing

Each remains `flowing`, `restricted`, `severed` or `uncertain` with confidence and evidence refs.

Question selection should aim to reduce uncertainty between these hypotheses and to distinguish a visible symptom from a primary restriction.

The fixed paired interventions remain:

- Resources ↔ Re-enchantment
- Values ↔ Transformation
- Affordance ↔ Creativity
- Support ↔ Dialogue
- Capacity ↔ Curiosity
- Wellbeing ↔ Participation
- Everything / Nothing ↔ Nothing / Everything

The Seven Wellbeing Activators remain qualities of intervention, not interview categories and not a score.

## Stopping rule

The interview may propose a working diagnosis when all of the following are satisfied, or explicitly say why they cannot yet be satisfied:

- one primary restriction is better supported than the nearest alternatives, or uncertainty remains honestly unresolved;
- at least one plausible competing explanation has been actively tested;
- important missing perspectives/accounts are named;
- the narrator/problem-frame has been checked at least once where relevant;
- sufficient evidence exists to formulate a smallest-sufficient intervention hypothesis;
- another question is unlikely to materially change the working map.

The user may also stop at any time.

## Emergent graphic

The participant sees a restrained visual flow map that begins largely neutral/uncertain and becomes more legible as evidence accumulates. It must communicate uncertainty rather than certainty theatrically.

The graphic may show:

- evidence-supported flow becoming clearer;
- uncertainty remaining faint;
- a probable restriction narrowing the flow;
- the aligned upsweep intervention becoming visible only when a working diagnosis is ready;
- alternate hypotheses remaining inspectable.

It must not display a scalar wellbeing or blockage score.

## Research record

The raw/edited transcript is preserved separately from Rheo's derived interpretation so the same testimony can later be analysed blind by another framework or human reviewer.

Each interview turn should retain:

- participant utterance/transcript;
- optional participant edits;
- proposition/evidence extraction with provenance;
- question asked;
- reason-for-question in research metadata only;
- competing-hypothesis state before and after the answer;
- whether the question was discriminating, contradiction-seeking, frame-relocating or safety-related.

The user-facing interface should not expose research-only hypothesis metadata by default.

## Evaluation boundary

This UX change is not evidence for RWB. It creates a more ecologically valid elicitation instrument and a cleaner separation between testimony and theory-derived analysis.

Future model-side evaluation must compare analyses of the same frozen testimony, not reward Rheo for eliciting the vocabulary it later scores.

## Implementation plan

- add a dedicated adaptive-interview API endpoint and strict schema;
- add an interview-system prompt distinct from the final v0.4 flow-diagnosis prompt;
- make the interview the primary home experience;
- retain the v0.4 wizard behind an `Advanced / research form` option;
- reuse realtime voice transcription where possible;
- add a simple emergent clockwise flow visual;
- preserve transcript + interview metadata in export;
- on stop/readiness, call the existing explicit v0.4 flow endpoint over the accumulated case/evidence record;
- add fixture-mode smoke tests before any real-model run.

## Falsifiers / failure modes for the interface

- participants report that questions suggest answers or teach the model before testimony emerges;
- interview repeatedly converges on a restriction because its questions preferentially elaborate the current leader;
- users cannot see or correct transcription/interpretation errors;
- the emergent graphic creates false certainty or pressures participants to agree;
- the interview is slower or more onerous than the wizard for ordinary cases;
- raw testimony cannot be cleanly separated from model interpretation for later blind analysis.
