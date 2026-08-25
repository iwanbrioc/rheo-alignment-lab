#!/usr/bin/env python3
import json, random, sys, zipfile
from collections import Counter
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Usage: python3 evaluation/synthetic-action-v0.9/blind_outputs.py /path/to/model-runs/<run-id>')

src = Path(sys.argv[1]).resolve()
if not src.is_dir():
    raise SystemExit(f'Not a directory: {src}')

run_log_path = src / '_run_log.json'
if not run_log_path.exists():
    raise SystemExit('Missing _run_log.json; refusing to blind an unverified run.')
run_log = json.loads(run_log_path.read_text())
if run_log.get('experiment') != 'synthetic-action-v0.9':
    raise SystemExit('Run log is not synthetic-action-v0.9.')
if any(not x.get('ok') for x in run_log.get('log', [])):
    raise SystemExit('Run contains failures; refusing to create a blinded evaluation package.')

records=[]
for p in sorted(src.glob('SYN-*.json')):
    if p.name.startswith('_'): continue
    d=json.loads(p.read_text())
    if d.get('experiment')=='synthetic-action-v0.9': records.append((p,d))
if not records: raise SystemExit('No synthetic-action-v0.9 outputs found.')

samples=int(run_log.get('samplesPerCondition',3))
conditions=tuple(run_log.get('design',{}).get('conditions',[]))
if not conditions: raise SystemExit('Run log does not declare hidden conditions.')
case_ids=sorted({d['caseId'] for _,d in records})
expected=len(case_ids)*len(conditions)*samples
if len(records)!=expected: raise SystemExit(f'Incomplete run: found {len(records)} outputs, expected {expected}.')
counts=Counter((d['caseId'],d['condition']) for _,d in records)
for case_id in case_ids:
    for condition in conditions:
        if counts[(case_id,condition)]!=samples:
            raise SystemExit(f'Unbalanced run for {case_id}/{condition}: {counts[(case_id,condition)]}, expected {samples}.')

seed=random.SystemRandom().randrange(1<<63)
rng=random.Random(seed);rng.shuffle(records)
out=src/'BLINDED'
if out.exists(): raise SystemExit(f'{out} already exists; refusing to overwrite a frozen blind.')
out.mkdir()
key={'experiment':'synthetic-action-v0.9','sourceRun':str(src),'seed':seed,'items':[]}

for i,(p,d) in enumerate(records,1):
    label=f'M{i:03d}'
    public={'blindId':label,'caseId':d['caseId'],'caseTitle':d.get('caseTitle'),'comparison':d['comparison']}
    (out/f'{label}.json').write_text(json.dumps(public,indent=2,ensure_ascii=False)+'\n')
    key['items'].append({'blindId':label,'sourceFile':p.name,'caseId':d['caseId'],'condition':d['condition'],'sample':d['sample'],'provider':d.get('provider'),'model':d.get('model')})

(out/'README.txt').write_text(
    'Blinded v0.9 practical-decision outputs. Files contain only case identity and an ontology-neutral comparison object.\n'
    'Outputs come from hidden generation conditions. Do not infer or guess condition identities or grouping.\n'
    'Do not inspect the private reveal key until every independent rating is frozen.\n'
)
key_path=src/f'_BLINDING_KEY_PRIVATE_{src.name}.json'
key_path.write_text(json.dumps(key,indent=2,ensure_ascii=False)+'\n')
zip_path=src/'BLINDED.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for p in sorted(out.iterdir()): z.write(p,arcname=f'BLINDED/{p.name}')

print(f'Wrote {len(records)} blinded outputs to {out}')
print(f'Wrote evaluator archive: {zip_path}')
print(f'Private reveal key: {key_path}')
