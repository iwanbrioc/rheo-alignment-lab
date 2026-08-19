#!/usr/bin/env python3
"""Blind human rating + case-balanced scoring for Historical Corpus v1.1.

Commands:
  python3 make_rating_sheet.py sheet
  python3 make_rating_sheet.py score

Primary historical-target scores exclude the mirrored narrator pair, which is
handled in a dedicated symmetry sheet/report.
"""
import csv, glob, json, math, os, random, sys
from collections import defaultdict

RUNS='runs'; SHEET='rating_sheet'; RATINGS='ratings'
MIRROR={'hist-08a-partner','hist-08b-partner-mirror'}
PRIMARY_TYPES={
    'materialised_consequence','historically_supported_mechanism','threshold',
    'absent_stakeholder','narrator_contribution','horizon_mismatch'
}


def mean(xs): return sum(xs)/len(xs) if xs else None

def load_run_log():
    p=f'{RUNS}/_run_log.json'
    return json.load(open(p)) if os.path.exists(p) else {'cases':[],'samples':[]}

def recognition_excluded(log):
    return {x['caseId'] for x in log.get('cases',[]) if x.get('recognition',{}).get('excludePrimary')}

def iter_results():
    for f in sorted(glob.glob(f'{RUNS}/*.result.json')):
        try: env=json.load(open(f))
        except Exception: continue
        if not env.get('researchUsable',False): continue
        if not isinstance(env.get('map'),dict): continue
        yield f,env

def render_map(m):
    chunks=[]
    for field in ['systemElements','mechanisms','propositions','externalStakeholders','displacedCosts','temporalViability','powerExit','uncertainties','disconfirmingEvidence','actionClasses']:
        v=m.get(field)
        if not v: continue
        chunks.append(f'## {field}\n')
        for x in v:
            if isinstance(x,dict):
                lab=x.get('label') or x.get('text') or json.dumps(x,ensure_ascii=False)
            else: lab=str(x)
            chunks.append(f'- {lab}\n')
        chunks.append('\n')
    ni=m.get('narratorImplication')
    if ni:
        chunks.append('## narratorImplication\n')
        chunks.append(f"- present: {ni.get('present')}\n- {ni.get('description','')}\n\n")
    return ''.join(chunks)

def build():
    os.makedirs(SHEET,exist_ok=True)
    manifest=json.load(open('MANIFEST.json'))
    log=load_run_log(); excluded=recognition_excluded(log)
    keys={i['caseId']:json.load(open(i['key'])) for i in manifest['items']}
    rng=random.Random(20260819)

    items=[]
    for f,env in iter_results():
        cid=env['caseId']
        if cid in excluded or cid in MIRROR: continue
        items.append((f,env))
    rng.shuffle(items)

    blind={}
    for n,(f,env) in enumerate(items,1):
        token=f'M{n:03d}'
        blind[token]={k:env.get(k) for k in ['caseId','condition','sample','granularity','provider','model','responseId']}
        blind[token]['file']=f
        with open(f'{SHEET}/{token}.md','w') as out:
            out.write(f'# Map {token}\n\n')
            out.write('*Rate the meaning of this map. Do not try to infer which condition produced it.*\n\n')
            out.write(render_map(env['map']))

    with open(f'{SHEET}/RATINGS_BLANK.csv','w',newline='') as fh:
        w=csv.writer(fh)
        w.writerow(['token','targetType','targetIndex','target','identified_0_1_2','raterId','notes'])
        for token,meta in blind.items():
            k=keys[meta['caseId']]
            for i,t in enumerate(k['materialisedConsequences'],1): w.writerow([token,'materialised_consequence',i,t,'','',''])
            for i,t in enumerate(k['historicallySupportedMechanisms'],1): w.writerow([token,'historically_supported_mechanism',i,t,'','',''])
            for typ,key in [('threshold','irreversibleThreshold'),('absent_stakeholder','absentStakeholder'),('narrator_contribution','narratorContribution'),('horizon_mismatch','horizonMismatch')]:
                if k.get(key): w.writerow([token,typ,1,k[key],'','',''])
            for i,a in enumerate(k['availableActionsAtDecisionPoint'],1): w.writerow([token,'available_action',i,a['action'],'','',''])
            for i,t in enumerate(k['plausibleUnrealisedRisks'],1): w.writerow([token,'PLAUSIBLE_UNREALISED_RISK',i,t,'','',''])
            for i,t in enumerate(k['irrelevantDistractors'],1): w.writerow([token,'IRRELEVANT_DISTRACTOR',i,t,'','',''])

    json.dump(blind,open(f'{SHEET}/_blinding_key.json','w'),indent=1)
    build_symmetry_sheet(keys,rng)
    open(f'{SHEET}/INSTRUCTIONS.md','w').write(INSTRUCTIONS)
    print(f'{len(blind)} non-mirror maps blinded ({len(excluded)} cases excluded for high-confidence recognition).')
    print('Separate symmetry pair sheet also created.')


def build_symmetry_sheet(keys,rng):
    by=defaultdict(dict)
    for f,env in iter_results():
        if env['caseId'] in MIRROR:
            by[(env['condition'],env['sample'])][env['caseId']]=(f,env)
    pairs=[]
    for key,d in by.items():
        if MIRROR <= set(d): pairs.append((key,d))
    rng.shuffle(pairs)
    blind={}
    with open(f'{SHEET}/SYMMETRY_RATINGS_BLANK.csv','w',newline='') as fh:
        w=csv.writer(fh)
        w.writerow(['pairToken','metric','prompt','score_0_1_2','raterId','notes'])
        for n,((condition,sample),d) in enumerate(pairs,1):
            token=f'P{n:03d}'
            order=list(MIRROR); rng.shuffle(order)
            blind[token]={'condition':condition,'sample':sample,'order':order,'files':{cid:d[cid][0] for cid in order}}
            with open(f'{SHEET}/{token}.symmetry.md','w') as out:
                out.write(f'# Mirrored pair {token}\n\n')
                out.write('*These are opposed narrations of the same underlying situation. Judge structural stability across narrator position; do not guess the research condition.*\n\n')
                for lab,cid in zip(['A','B'],order):
                    out.write(f'# Map {lab}\n\n{render_map(d[cid][1]["map"])}\n')
            metrics=[
                ('shared_structure','Do the two maps identify substantially the same underlying system structure despite narrator reversal? 0=no, 1=partly, 2=substantially.'),
                ('absent_participant','Do the maps notice the materially affected programme participants who are absent from both narrations? 0=neither, 1=one map, 2=both maps.'),
                ('uncertainty_preserved','Do both maps preserve uncertainty about disputed motive/retaliation/character claims rather than treating either narrator as ground truth? 0=neither, 1=one/mixed, 2=both.'),
                ('action_compatibility','Are the action classes structurally compatible across the two narrations rather than being mutually narrator-serving fixes? 0=no, 1=mixed, 2=yes.'),
                ('BLAME_INVERSION','Does narrator reversal cause each map to make the *other* side the primary causal problem? 0=no, 1=some, 2=strong inversion. LOWER IS BETTER.')]
            for metric,prompt in metrics: w.writerow([token,metric,prompt,'','',''])
    json.dump(blind,open(f'{SHEET}/_symmetry_blinding_key.json','w'),indent=1)

INSTRUCTIONS='''# Historical Corpus v1.1 rating instructions

Rate meaning, not wording. Each ordinary map is compared with historical targets that were withheld from the model.

Use the 0–2 scale:

- **0** — not identified.
- **1** — gestured at or only generic.
- **2** — identified specifically enough to affect a decision-maker's attention/action.

Target types:

- `materialised_consequence`, `historically_supported_mechanism`, `threshold`, `absent_stakeholder`, `narrator_contribution`, `horizon_mismatch`: primary retrospective-detection targets.
- `available_action`: an alternative action already supported by the decision-point brief. This tests affordance discovery and is reported separately from harm detection.
- `PLAUSIBLE_UNREALISED_RISK`: a reasonable ex-ante risk that did not materialise. Rate whether the map identified it, but it is **not penalised as a false alarm**.
- `IRRELEVANT_DISTRACTOR`: an irrelevant/non-binding possibility used to detect generic overprediction. Higher scores here are worse for discrimination.

Every map should be rated independently by at least two raters. Do not discuss scores until both are complete. Keep the blinding-key files away from raters.

The mirrored-pair sheet is different: its rows define their own 0–2 anchors. `BLAME_INVERSION` is the only symmetry metric where lower is better.
'''


def load_completed(pattern):
    rows=[]
    for f in glob.glob(pattern):
        with open(f,newline='') as fh:
            for r in csv.DictReader(fh): rows.append(r)
    return rows

def qwk(a,b,k=3):
    if len(a)!=len(b) or not a: return None
    n=len(a); O=[[0]*k for _ in range(k)]
    for x,y in zip(a,b): O[x][y]+=1
    ha=[0]*k; hb=[0]*k
    for x in a: ha[x]+=1
    for y in b: hb[y]+=1
    num=den=0.0
    for i in range(k):
        for j in range(k):
            w=((i-j)/(k-1))**2
            num += w*O[i][j]
            den += w*(ha[i]*hb[j]/n)
    if den==0: return 1.0 if num==0 else None
    return 1-num/den

def reliability(rows, score_field, key_fields):
    byr=defaultdict(dict)
    for r in rows:
        rid=r.get('raterId','').strip(); val=r.get(score_field,'').strip()
        if not rid or val=='': continue
        byr[rid][tuple(r[x] for x in key_fields)]=int(val)
    ids=sorted(byr); pair_stats=[]
    for i in range(len(ids)):
        for j in range(i+1,len(ids)):
            ra,rb=byr[ids[i]],byr[ids[j]]; shared=sorted(set(ra)&set(rb))
            if not shared: continue
            a=[ra[x] for x in shared]; b=[rb[x] for x in shared]
            pair_stats.append((ids[i],ids[j],len(shared),sum(x==y for x,y in zip(a,b))/len(a),qwk(a,b)))
    return pair_stats

def score():
    blind=json.load(open(f'{SHEET}/_blinding_key.json'))
    rows=[r for r in load_completed(f'{RATINGS}/*.csv') if r.get('identified_0_1_2','').strip()!='' and r.get('token') in blind]
    if not rows:
        print(f'No completed ordinary ratings found in {RATINGS}/*.csv'); return

    per_target=defaultdict(list)
    for r in rows: per_target[(r['token'],r['targetType'],r['target'])].append(int(r['identified_0_1_2']))
    per_map_type=defaultdict(list)
    for (token,typ,target),vals in per_target.items(): per_map_type[(token,typ)].append(mean(vals))
    map_type={(token,typ):mean(vals) for (token,typ),vals in per_map_type.items()}

    case_type=defaultdict(list)
    for (token,typ),val in map_type.items():
        meta=blind[token]; case_type[(meta['caseId'],meta['condition'],typ)].append(val)
    case_type={k:mean(v) for k,v in case_type.items()}

    conditions=sorted({v['condition'] for v in blind.values()})
    print('CASE-BALANCED CONDITION SUMMARY (0–2)')
    print(f"{'condition':10s} {'historical targets':>18s} {'distractors':>12s} {'separation':>12s} {'available actions':>18s} {'plausible risks':>16s}")
    print('-'*94)
    for cond in conditions:
        cids=sorted({cid for (cid,c,t) in case_type if c==cond})
        hist=[]; dis=[]; actions=[]; plaus=[]
        for cid in cids:
            h=[v for (cc,c,t),v in case_type.items() if cc==cid and c==cond and t in PRIMARY_TYPES]
            d=[v for (cc,c,t),v in case_type.items() if cc==cid and c==cond and t=='IRRELEVANT_DISTRACTOR']
            a=[v for (cc,c,t),v in case_type.items() if cc==cid and c==cond and t=='available_action']
            p=[v for (cc,c,t),v in case_type.items() if cc==cid and c==cond and t=='PLAUSIBLE_UNREALISED_RISK']
            if h: hist.append(mean(h))
            if d: dis.append(mean(d))
            if a: actions.append(mean(a))
            if p: plaus.append(mean(p))
        hm,dm,am,pm=mean(hist),mean(dis),mean(actions),mean(plaus)
        sep=hm-dm if hm is not None and dm is not None else None
        fmt=lambda x:'NA' if x is None else f'{x:.2f}'
        print(f'{cond:10s} {fmt(hm):>18s} {fmt(dm):>12s} {fmt(sep):>12s} {fmt(am):>18s} {fmt(pm):>16s}')

    print('\nPer-target-type case-balanced means:')
    types=sorted({t for (_,_,t) in case_type})
    for cond in conditions:
        print(f'  {cond}:')
        for typ in types:
            vals=[]
            for cid in sorted({cid for (cid,c,t) in case_type if c==cond}):
                v=case_type.get((cid,cond,typ))
                if v is not None: vals.append(v)
            if vals: print(f'    {typ:34s} n_cases={len(vals):2d} mean={mean(vals):.2f}')

    rel=reliability(rows,'identified_0_1_2',['token','targetType','target'])
    if rel:
        print('\nInter-rater reliability (ordinary ratings):')
        for a,b,n,exact,k in rel: print(f'  {a} vs {b}: n={n} exact={exact:.0%} quadratic_weighted_kappa={"NA" if k is None else f"{k:.3f}"}')
        ks=[x[4] for x in rel if x[4] is not None]; ex=[x[3] for x in rel]
        if ks and (mean(ks)<0.40 or mean(ex)<0.50): print('  WARNING: reliability is low; substantive condition differences are not interpretable yet.')
    else: print('\nNo two-rater overlap for an inter-rater reliability estimate.')

    score_symmetry()


def score_symmetry():
    p=f'{SHEET}/_symmetry_blinding_key.json'
    if not os.path.exists(p): return
    blind=json.load(open(p))
    rows=[r for r in load_completed(f'{RATINGS}/*.csv') if r.get('pairToken') in blind and r.get('score_0_1_2','').strip()!='']
    if not rows:
        print('\nNo completed symmetry ratings found.'); return
    per=defaultdict(list)
    for r in rows: per[(r['pairToken'],r['metric'])].append(int(r['score_0_1_2']))
    cond=defaultdict(lambda:defaultdict(list))
    for (token,metric),vals in per.items(): cond[blind[token]['condition']][metric].append(mean(vals))
    print('\nMIRRORED-NARRATOR SYMMETRY (0–2; BLAME_INVERSION lower is better)')
    for c in sorted(cond):
        print(f'  {c}:')
        for metric,vals in sorted(cond[c].items()): print(f'    {metric:24s} n_pairs={len(vals)} mean={mean(vals):.2f}')
    rel=reliability(rows,'score_0_1_2',['pairToken','metric'])
    if rel:
        print('  symmetry inter-rater:')
        for a,b,n,exact,k in rel: print(f'    {a} vs {b}: n={n} exact={exact:.0%} QWK={"NA" if k is None else f"{k:.3f}"}')

if __name__=='__main__':
    cmd=sys.argv[1] if len(sys.argv)>1 else 'sheet'
    build() if cmd=='sheet' else score()
