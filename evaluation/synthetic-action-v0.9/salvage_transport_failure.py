#!/usr/bin/env python3
import json, shutil, sys
from pathlib import Path

USAGE = (
    'Usage: python3 evaluation/synthetic-action-v0.9/salvage_transport_failure.py '
    '<base-run-dir> <donor-run-dir>'
)

if len(sys.argv) != 3:
    raise SystemExit(USAGE)

base = Path(sys.argv[1]).resolve()
donor = Path(sys.argv[2]).resolve()
if not base.is_dir() or not donor.is_dir():
    raise SystemExit('Both base and donor run directories must exist.')

base_log_path = base / '_run_log.json'
if not base_log_path.exists():
    raise SystemExit('Base run is missing _run_log.json.')
base_log = json.loads(base_log_path.read_text())
if base_log.get('experiment') != 'synthetic-action-v0.9':
    raise SystemExit('Base run is not synthetic-action-v0.9.')

failures = [x for x in base_log.get('log', []) if not x.get('ok')]
expected_failure = ('SYN-209', 'matched', 1)
if len(failures) != 1:
    raise SystemExit(f'Expected exactly one base-run failure; found {len(failures)}.')
f = failures[0]
if (f.get('caseId'), f.get('condition'), int(f.get('sample', -1))) != expected_failure:
    raise SystemExit(f'Unexpected failed cell: {f.get("caseId")}/{f.get("condition")}/s{f.get("sample")}')
if 'fetch failed' not in str(f.get('error', '')).lower():
    raise SystemExit('Base failure is not the documented transport-level fetch failure.')

base_files = sorted(base.glob('SYN-*.json'))
if len(base_files) != 119:
    raise SystemExit(f'Expected 119 successful base output files; found {len(base_files)}.')

# Mechanical donor choice fixed by the protocol amendment.
donor_name = 'SYN-209.matched.s01.json'
donor_file = donor / donor_name
if not donor_file.exists():
    raise SystemExit(f'Missing predetermined donor file: {donor_file}')

donor_data = json.loads(donor_file.read_text())
checks = {
    'experiment': donor_data.get('experiment') == 'synthetic-action-v0.9',
    'caseId': donor_data.get('caseId') == 'SYN-209',
    'condition': donor_data.get('condition') == 'matched',
    'sample': int(donor_data.get('sample', -1)) == 1,
    'researchUsable': donor_data.get('researchUsable') is True,
}
failed_checks = [k for k, ok in checks.items() if not ok]
if failed_checks:
    raise SystemExit('Predetermined donor failed metadata checks: ' + ', '.join(failed_checks))

# Cross-check that donor case hash matches the base run's other SYN-209 outputs.
base_209 = [json.loads(p.read_text()) for p in base_files if p.name.startswith('SYN-209.')]
base_hashes = {d.get('caseHash') for d in base_209 if d.get('caseHash')}
if len(base_hashes) != 1:
    raise SystemExit(f'Base SYN-209 case hash is not unique: {base_hashes}')
if donor_data.get('caseHash') not in base_hashes:
    raise SystemExit('Donor caseHash does not match base SYN-209 caseHash.')

# Cross-check model/provider against the base run declaration.
if donor_data.get('provider') != base_log.get('provider'):
    raise SystemExit('Donor provider differs from base run provider.')
base_model = str(base_log.get('model', ''))
donor_model = str(donor_data.get('model', ''))
if base_model and not donor_model.startswith(base_model):
    raise SystemExit(f'Donor model {donor_model!r} does not match base run model {base_model!r}.')

out = base.parent / f'{base.name}-SALVAGED'
if out.exists():
    raise SystemExit(f'Refusing to overwrite existing salvage directory: {out}')
out.mkdir()

for p in base_files:
    shutil.copy2(p, out / p.name)
shutil.copy2(donor_file, out / donor_name)

# Verify 120 distinct cells and exact 3-per-condition balance.
records = [json.loads(p.read_text()) for p in sorted(out.glob('SYN-*.json'))]
if len(records) != 120:
    raise SystemExit(f'Salvage copy produced {len(records)} output files instead of 120.')
conditions = tuple(base_log.get('design', {}).get('conditions', []))
if not conditions:
    raise SystemExit('Base run does not declare conditions.')
case_ids = sorted({d['caseId'] for d in records})
if len(case_ids) != 10:
    raise SystemExit(f'Expected 10 cases; found {len(case_ids)}.')
for case_id in case_ids:
    for condition in conditions:
        cells = [d for d in records if d.get('caseId') == case_id and d.get('condition') == condition]
        samples = sorted(int(d.get('sample', -1)) for d in cells)
        if samples != [1, 2, 3]:
            raise SystemExit(f'Unbalanced salvage for {case_id}/{condition}: samples={samples}')

# Create a clean verification log for the derived dataset, preserving source provenance.
new_log = dict(base_log)
new_log['runId'] = out.name
new_log['salvaged'] = True
new_log['salvageProtocol'] = 'SALVAGE_PROTOCOL_2026-08-26.md'
new_log['salvage'] = {
    'baseRun': str(base),
    'donorRun': str(donor),
    'originalFailedCell': {'caseId': 'SYN-209', 'condition': 'matched', 'sample': 1, 'error': f.get('error')},
    'replacementFile': str(donor_file),
    'replacementRule': 'same missing case, condition and nominal sample; selected before content inspection',
}

# Replace the failed log entry with a provenance-marked successful derived cell.
clean_log = [x for x in base_log.get('log', []) if x.get('ok')]
clean_log.append({
    'caseId': 'SYN-209',
    'condition': 'matched',
    'sample': 1,
    'ok': True,
    'file': donor_name,
    'provider': donor_data.get('provider'),
    'model': donor_data.get('model'),
    'researchUsable': donor_data.get('researchUsable'),
    'salvagedFromRun': str(donor),
    'salvagedFromFile': donor_name,
    'technicalReplacement': True,
})
new_log['log'] = clean_log
(out / '_run_log.json').write_text(json.dumps(new_log, indent=2, ensure_ascii=False) + '\n')

(out / 'SALVAGE_README.txt').write_text(
    'Protocol-amended v0.9 confirmatory dataset.\n'
    '119 files come unchanged from the base run.\n'
    'SYN-209.matched.s01.json comes from the donor run as a predetermined transport-failure replacement.\n'
    'See evaluation/synthetic-action-v0.9/SALVAGE_PROTOCOL_2026-08-26.md before interpretation.\n'
)

print(f'Salvage PASS: {out}')
print('120 balanced outputs | 1 predetermined technical replacement | 0 missing cells')
print('Next: run blind_outputs.py on the SALVAGED directory; do not inspect output JSON content first.')
