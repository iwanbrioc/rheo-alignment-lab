#!/usr/bin/env python3
import hashlib, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
FORBIDDEN_FIELDS={'horizons','contractions','powerSafety','viability','moves','admin','commandSignal'}
FORBIDDEN_TEXT=[
 'Reciprocal Wellbeing','Rheocracy','No Self','Re-Enchantment',
 'Transformation · Culture · Values','Creativity · Infrastructure · Affordance',
 'Dialogue · Society · Support','Curiosity · Outer Self · Capacity',
 'Participation · Inner Self · Wellbeing','Nothing/Everything'
]
REQUIRED_KEY_FIELDS={
 'keyVersion','caseId','sealedSource','archetype','historicallySupportedMechanisms',
 'materialisedConsequences','irreversibleThreshold','absentStakeholder','narratorContribution',
 'horizonMismatch','availableActionsAtDecisionPoint','plausibleUnrealisedRisks',
 'irrelevantDistractors','nonTargetHistoricalEvents'
}

def leaf_refs(value,prefix='case'):
 out=set()
 def walk(v,ref):
  if v is None or v=='': return
  if isinstance(v,list):
   for i,item in enumerate(v):
    seg=str(item.get('id',i+1)) if isinstance(item,dict) else str(i+1)
    walk(item,f'{ref}.{seg}')
  elif isinstance(v,dict):
   for k,ch in v.items(): walk(ch,f'{ref}.{k}')
  else: out.add(ref)
 walk(value,prefix); return out

def main():
 errors=[]
 manifest=json.load(open(ROOT/'MANIFEST.json'))
 if manifest.get('corpusVersion')!='1.1': errors.append('manifest corpusVersion must be 1.1')
 if manifest.get('n')!=len(manifest.get('items',[])): errors.append('manifest n mismatch')
 for item in manifest['items']:
  cid=item['caseId']; cp=ROOT/item['case']; kp=ROOT/item['key']
  c=json.load(open(cp)); k=json.load(open(kp))
  if c.get('caseId')!=cid or k.get('caseId')!=cid: errors.append(f'{cid}: case/key id mismatch')
  if c.get('schemaVersion')!='historical-brief-v1.1': errors.append(f'{cid}: wrong case schemaVersion')
  for f in FORBIDDEN_FIELDS:
   if f in c: errors.append(f'{cid}: forbidden model-input field {f}')
  raw=json.dumps(c,ensure_ascii=False)
  for term in FORBIDDEN_TEXT:
   if term.lower() in raw.lower(): errors.append(f'{cid}: framework leakage term in model input: {term}')
  ids=[e.get('id') for e in c.get('evidence',[])]
  if len(ids)!=len(set(ids)) or any(not x for x in ids): errors.append(f'{cid}: evidence ids missing/duplicate')
  calc=hashlib.sha256(json.dumps(c,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:12]
  if calc!=item.get('briefHash'): errors.append(f'{cid}: briefHash mismatch expected {item.get("briefHash")} got {calc}')
  missing=REQUIRED_KEY_FIELDS-set(k)
  if missing: errors.append(f'{cid}: key missing {sorted(missing)}')
  refs=leaf_refs(c)
  for i,a in enumerate(k.get('availableActionsAtDecisionPoint',[]),1):
   if not a.get('action'): errors.append(f'{cid}: available action {i} missing text')
   basis=a.get('basis',[])
   if not basis: errors.append(f'{cid}: available action {i} has no basis refs')
   for ref in basis:
    if ref not in refs: errors.append(f'{cid}: available action {i} basis ref does not resolve: {ref}')
   if a.get('sourceVerified') not in (True,False): errors.append(f'{cid}: available action {i} sourceVerified must be bool')
  if cid.startswith('hist-08') and not k.get('symmetryPair'): errors.append(f'{cid}: mirror key missing symmetryPair')
 if errors:
  print('Historical Corpus v1.1 validation FAILED')
  for e in errors: print('-',e)
  return 1
 print(f'Historical Corpus v1.1 validation OK: {len(manifest["items"])} neutral decision briefs; no RWB input leakage detected.')
 return 0
if __name__=='__main__': sys.exit(main())
