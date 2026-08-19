# Rheo Historical Corpus v1.1

A repaired development benchmark for retrospective structural detection using historical decision-point cases.

Start here:

```bash
python3 validate_corpus.py
node run_corpus.mjs --base http://localhost:8080 --samples 3 --granularity standard
python3 make_rating_sheet.py sheet
```

See `PROTOCOL.md` for interpretation rules and limitations.

**Do not treat this as a sealed confirmatory benchmark.** The cases and keys were shaped during development/red-teaming.
