#!/usr/bin/env python3
import json, sys
from pathlib import Path

REQUIRED = ['T0.json','T1.json','T2.json','consent.json']
FORBIDDEN_T0_KEYS = {
    'actualAction','actionRationaleAtTime','outcomeSummary','materialisedConsequences',
    'historicallySupportedMechanisms','irreversibleThresholds','affectedStakeholders',
    'timeHorizonEffects','narratorContribution','availableActionsAtT0',
    'plausibleUnrealisedRisks','irrelevantDistractors'
}
PROVENANCE = {'user_reported_observation','user_interpretation','ai_inference','verified_external','absent_party_account','unknown'}
CONFIDENCE = {'low','medium','high'}

def load(path):
    return json.loads(path.read_text())

def keys_recursive(v):
    out=set()
    if isinstance(v,dict):
        for k,x in v.items(): out.add(k); out |= keys_recursive(x)
    elif isinstance(v,list):
        for x in v: out |= keys_recursive(x)
    return out

def main():
    if len(sys.argv)!=2:
        print('Usage: python3 validate_private_case.py /path/to/case', file=sys.stderr); return 2
    root=Path(sys.argv[1]).expanduser().resolve(); errors=[]
    for name in REQUIRED:
        if not (root/name).is_file(): errors.append(f'missing {name}')
    if errors:
        print('v2 private-case validation FAILED'); [print('-',e) for e in errors]; return 1
    t0,t1,t2,cons=[load(root/n) for n in REQUIRED]
    expected=[('unseen-case-t0-v2',t0),('unseen-case-t1-v2',t1),('unseen-case-t2-v2',t2),('unseen-case-consent-v2',cons)]
    for ver,obj in expected:
        if obj.get('schemaVersion')!=ver: errors.append(f'expected schemaVersion {ver}')
    ids={str(x.get('caseId','')).strip() for x in (t0,t1,t2,cons)}
    if len(ids)!=1 or '' in ids: errors.append('caseId must be non-empty and identical across T0/T1/T2/consent')
    leaked=FORBIDDEN_T0_KEYS & keys_recursive(t0)
    if leaked: errors.append('T0 contains T1/T2-only keys: '+', '.join(sorted(leaked)))
    if not isinstance(t0.get('context'),dict) or not str(t0['context'].get('situation','')).strip(): errors.append('T0.context.situation required')
    ev=t0.get('evidence')
    if not isinstance(ev,list) or not ev: errors.append('T0.evidence must contain at least one item')
    else:
        ids_seen=[]
        for i,e in enumerate(ev):
            if not isinstance(e,dict): errors.append(f'T0.evidence[{i}] must be object'); continue
            eid=str(e.get('id','')).strip(); ids_seen.append(eid)
            if not eid: errors.append(f'T0.evidence[{i}].id required')
            if not str(e.get('text','')).strip(): errors.append(f'T0.evidence[{i}].text required')
            if e.get('provenance') not in PROVENANCE: errors.append(f'T0.evidence[{i}].provenance invalid')
            if e.get('confidence') not in CONFIDENCE: errors.append(f'T0.evidence[{i}].confidence invalid')
        if len(ids_seen)!=len(set(ids_seen)): errors.append('T0 evidence ids must be unique')
    for field in ['contributorAuthorityConfirmed','researchUseConfirmed','personalDataReviewed','t0MayBeSentToModelProvider']:
        if cons.get(field) is not True: errors.append(f'consent.{field} must be true before analysis')
    if not str(t1.get('actualAction','')).strip(): errors.append('T1.actualAction required')
    if not str(t2.get('outcomeSummary','')).strip(): errors.append('T2.outcomeSummary required')
    if errors:
        print('v2 private-case validation FAILED'); [print('-',e) for e in errors]; return 1
    print(f'v2 private-case validation OK: {next(iter(ids))}. T0 is separated from T1/T2 and permissions are affirmative.')
    return 0

if __name__=='__main__': raise SystemExit(main())
