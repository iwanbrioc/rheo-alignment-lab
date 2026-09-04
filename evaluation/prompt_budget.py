#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    'rheo': ROOT / 'prompts' / 'rheo-v0.3-system-prompt.md',
    'control': ROOT / 'prompts' / 'control-v0.3-system-prompt.md',
}

def word_count(path):
    return len(re.findall(r"\b[\w’'-]+\b", path.read_text(encoding='utf-8')))

counts = {k: word_count(v) for k,v in FILES.items()}
longer = max(counts.values()); shorter = min(counts.values())
delta = (longer - shorter) / shorter if shorter else 1.0
print(f"prompt word counts: {counts}; relative delta={delta:.3%}")
if delta > 0.10:
    raise SystemExit('Prompt budget mismatch exceeds the v0.3 development ceiling of 10%. This ceiling does not establish control fairness; an independently authored adversarial control is still required.')
