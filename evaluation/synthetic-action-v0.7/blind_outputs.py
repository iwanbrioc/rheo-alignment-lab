#!/usr/bin/env python3
import json, random, sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Usage: python evaluation/synthetic-action-v0.7/blind_outputs.py /path/to/model-runs/<run-id>')

src = Path(sys.argv[1]).resolve()
if not src.is_dir():
    raise SystemExit(f'Not a directory: {src}')

records = []
for p in sorted(src.glob('SYN-*.json')):
    if p.name.startswith('_'):
        continue
    d = json.loads(p.read_text())
    if d.get('experiment') != 'synthetic-action-v0.7':
        continue
    records.append((p, d))

if not records:
    raise SystemExit('No synthetic-action-v0.7 outputs found.')

seed = random.SystemRandom().randrange(1 << 63)
rng = random.Random(seed)
rng.shuffle(records)

out = src / 'BLINDED'
out.mkdir(exist_ok=False)
key = {'experiment':'synthetic-action-v0.7','sourceRun':str(src),'seed':seed,'items':[]}

for i,(p,d) in enumerate(records,1):
    label=f'M{i:03d}'
    public={
        'blindId':label,
        'caseId':d['caseId'],
        'caseTitle':d.get('caseTitle'),
        'comparison':d['comparison']
    }
    (out/f'{label}.json').write_text(json.dumps(public,indent=2,ensure_ascii=False)+'\n')
    key['items'].append({
        'blindId':label,
        'sourceFile':p.name,
        'caseId':d['caseId'],
        'condition':d['condition'],
        'sample':d['sample'],
        'provider':d.get('provider'),
        'model':d.get('model')
    })

(out/'README.txt').write_text(
    'Blinded v0.7 outputs. Files contain only case identity and the ontology-neutral comparison object.\n'
    'Do not inspect the private key until ratings/comparisons are frozen.\n'
)
key_path=src/f'_BLINDING_KEY_PRIVATE_{src.name}.json'
key_path.write_text(json.dumps(key,indent=2,ensure_ascii=False)+'\n')
print(f'Wrote {len(records)} blinded outputs to {out}')
print(f'Private reveal key: {key_path}')
