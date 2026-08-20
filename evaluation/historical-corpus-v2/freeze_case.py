#!/usr/bin/env python3
import hashlib, json, sys
from datetime import datetime, timezone
from pathlib import Path

FILES=['T0.json','T1.json','T2.json','consent.json']

def sha256(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def main():
    if len(sys.argv)!=2:
        print('Usage: python3 freeze_case.py /path/to/case',file=sys.stderr); return 2
    root=Path(sys.argv[1]).expanduser().resolve()
    missing=[n for n in FILES if not (root/n).is_file()]
    if missing: print('Missing: '+', '.join(missing),file=sys.stderr); return 1
    objs={n:json.loads((root/n).read_text()) for n in FILES}
    ids={str(o.get('caseId','')).strip() for o in objs.values()}
    if len(ids)!=1 or '' in ids: print('caseId mismatch',file=sys.stderr); return 1
    cid=next(iter(ids)); consent=objs['consent.json']
    record={
      'freezeVersion':'unseen-case-freeze-v2',
      'caseId':cid,
      'frozenAt':datetime.now(timezone.utc).isoformat(),
      'files':{n:{'sha256':sha256(root/n)} for n in FILES},
      'publicHashRecordAllowed':bool(consent.get('publicHashRecordAllowed',False))
    }
    out=root/'freeze-record.json'; out.write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record,indent=2))
    print(f'\nWrote private freeze record: {out}')
    if not record['publicHashRecordAllowed']:
        print('Do not publish this freeze record without contributor permission.')
    return 0

if __name__=='__main__': raise SystemExit(main())
