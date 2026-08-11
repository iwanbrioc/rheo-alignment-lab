#!/usr/bin/env python3
"""Rheo development evaluation harness.

This is intentionally not a single "Rheo score". It provides:
- structural similarity summaries for pre-specified paired conditions;
- stability/symmetry/discrimination screens over machine-readable maps;
- optional blinded-rater reliability summaries.

Confirmatory evaluation should use independent blinded human scoring under
research/SCORING_RUBRIC.md. Machine similarity is a debugging aid only.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from statistics import mean

LIST_FIELDS = [
    "relevantDomains",
    "uncertainties",
    "powerExit",
    "temporalViability",
    "externalStakeholders",
    "actionClasses",
    "displacedCosts",
    "disconfirmingEvidence",
]


def norm(x: str) -> str:
    return " ".join(str(x).lower().strip().split())


def jaccard(a, b):
    A, B = {norm(x) for x in (a or []) if str(x).strip()}, {norm(x) for x in (b or []) if str(x).strip()}
    if not A and not B:
        return 1.0
    if not A or not B:
        return 0.0
    return len(A & B) / len(A | B)


def hypothesis_labels(m):
    return [h.get("label", "") for h in m.get("restrictionHypotheses", [])]


def structural_similarity(a, b):
    parts = {field: jaccard(a.get(field, []), b.get(field, [])) for field in LIST_FIELDS}
    parts["restrictionHypotheses"] = jaccard(hypothesis_labels(a), hypothesis_labels(b))
    return {"mean": mean(parts.values()), "dimensions": parts}


def load_json(path):
    return json.loads(Path(path).read_text())


def screen_pairs(manifest_path):
    manifest = json.loads(Path(manifest_path).read_text())
    rows=[]
    for item in manifest["pairs"]:
        a=load_json(Path(manifest_path).parent/item["a"])
        b=load_json(Path(manifest_path).parent/item["b"])
        sim=structural_similarity(a,b)
        rows.append({"pair_id":item["pair_id"],"family":item["family"],"similarity":sim["mean"],**sim["dimensions"]})
    by_family={}
    for r in rows:
        by_family.setdefault(r["family"],[]).append(r["similarity"])
    print("PAIR SCREEN (debugging only; not confirmatory evidence)")
    for fam, vals in sorted(by_family.items()):
        print(f"{fam:16s} n={len(vals):3d} mean_similarity={mean(vals):.3f}")
    return rows


def cohen_kappa(labels1, labels2):
    if len(labels1)!=len(labels2) or not labels1:
        raise ValueError("Two equally sized non-empty rater vectors required")
    cats=sorted(set(labels1)|set(labels2))
    n=len(labels1)
    po=sum(a==b for a,b in zip(labels1,labels2))/n
    p1={c:labels1.count(c)/n for c in cats}
    p2={c:labels2.count(c)/n for c in cats}
    pe=sum(p1[c]*p2[c] for c in cats)
    return 1.0 if pe==1.0 and po==1.0 else (po-pe)/(1-pe) if pe<1 else 0.0


def rater_summary(csv_path):
    with open(csv_path,newline='',encoding='utf-8') as f:
        rows=list(csv.DictReader(f))
    required={"item_id","rater_id","total_score","genericity"}
    missing=required-set(rows[0]) if rows else required
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")
    by_item={}
    for r in rows:
        by_item.setdefault(r["item_id"],[]).append(r)
    paired=[v for v in by_item.values() if len(v)==2]
    if paired:
        r1=[v[0]["genericity"] for v in paired]
        r2=[v[1]["genericity"] for v in paired]
        print(f"Genericity Cohen kappa (2-rater items): {cohen_kappa(r1,r2):.3f}")
        diffs=[abs(float(v[0]["total_score"])-float(v[1]["total_score"])) for v in paired]
        print(f"Mean absolute total-score disagreement: {mean(diffs):.3f}")
    else:
        print("No exactly-two-rater items found; use a fuller IRR package for confirmatory multi-rater analysis.")


def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest='cmd',required=True)
    s=sub.add_parser('screen-pairs');s.add_argument('manifest')
    r=sub.add_parser('rater-summary');r.add_argument('csv')
    args=p.parse_args()
    if args.cmd=='screen-pairs': screen_pairs(args.manifest)
    else: rater_summary(args.csv)

if __name__=='__main__':
    main()
