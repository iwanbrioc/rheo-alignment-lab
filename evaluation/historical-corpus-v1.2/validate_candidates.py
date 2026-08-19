#!/usr/bin/env python3
import json,re,sys
from pathlib import Path
P=Path(__file__).resolve().parent/'CANDIDATES.json'
FORBIDDEN_FIELDS={'horizons','contractions','powerSafety','viability','moves','admin','commandSignal','outcome','actualOutcome','historicalOutcome','materialisedConsequences'}
FORBIDDEN_FRAMEWORK=['Reciprocal Wellbeing','Rheocracy','No Self','Re-enchantment','Transformation · Culture · Values','Creativity · Infrastructure · Affordance','Dialogue · Society · Support','Curiosity · Outer Self · Capacity','Participation · Inner Self · Wellbeing','Nothing/Everything']
SOURCE_IDENTIFIERS=['FiReControl','BBC','Digital Media Initiative','e-Borders','Metronet','Novopay','Phoenix pay','Home Insulation Program','Green Loans','Montara','Havelock North','Taum Sauk','Buncefield','Longford','London Capital','Kids Company','Project Verde','Co-operative Bank','Pike River','Muskrat Falls','North Battleford','orange roughy','ABN AMRO','Challenger','Macondo','Flint']
ALLOWED_PROVENANCE={'user_reported_observation','user_interpretation','ai_inference','verified_external','absent_party_account','unknown'}
def fields(v,path='candidate'):
 if isinstance(v,dict):
  for k,ch in v.items():
   yield path,k
   yield from fields(ch,f'{path}.{k}')
 elif isinstance(v,list):
  for i,ch in enumerate(v): yield from fields(ch,f'{path}[{i}]')
def main():
 d=json.loads(P.read_text()); errors=[]
 if d.get('corpusVersion')!='1.2-screen': errors.append('corpusVersion must be 1.2-screen')
 if d.get('stage')!='recognition-only': errors.append('stage must be recognition-only')
 cs=d.get('candidates',[])
 if d.get('n')!=len(cs): errors.append('n does not match candidates length')
 ids=[c.get('caseId') for c in cs]
 if len(ids)!=len(set(ids)) or any(not x for x in ids): errors.append('candidate ids missing or duplicated')
 for c in cs:
  cid=c.get('caseId','?'); raw=json.dumps(c,ensure_ascii=False)
  if not isinstance(c.get('context'),dict) or not isinstance(c.get('evidence'),list): errors.append(f'{cid}: missing context/evidence')
  for path,k in fields(c):
   if k in FORBIDDEN_FIELDS: errors.append(f'{cid}: forbidden field {path}.{k}')
  for term in FORBIDDEN_FRAMEWORK:
   if term.lower() in raw.lower(): errors.append(f'{cid}: framework leakage: {term}')
  for term in SOURCE_IDENTIFIERS:
   if term.lower() in raw.lower(): errors.append(f'{cid}: source identity leakage: {term}')
  years=sorted(set(re.findall(r'\b(?:18|19|20)\d{2}\b',raw)))
  if years: errors.append(f'{cid}: four-digit year fingerprint: {years}')
  ev=c.get('evidence',[]); eids=[e.get('id') for e in ev]
  if len(eids)!=len(set(eids)) or any(not x for x in eids): errors.append(f'{cid}: evidence ids missing/duplicate')
  for i,e in enumerate(ev,1):
   if not str(e.get('text','')).strip(): errors.append(f'{cid}: evidence {i} missing text')
   if e.get('provenance') not in ALLOWED_PROVENANCE: errors.append(f'{cid}: evidence {i} bad provenance')
 if errors:
  print('Historical Corpus v1.2 candidate validation FAILED')
  for e in errors: print('-',e)
  return 1
 print(f'Historical Corpus v1.2 candidate validation OK: {len(cs)} recognition-only neutral briefs; no listed framework/source identity leakage or year fingerprints detected.')
 return 0
if __name__=='__main__': sys.exit(main())
