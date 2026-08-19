#!/usr/bin/env python3
"""Rheo v0.3.1 development evaluation harness.

The exact-string Jaccard screen is a LEXICAL OVERLAP diagnostic only. It is not
structural similarity and must not be used as confirmatory evidence. The v0.3
external review demonstrated that same-structure paraphrases can score zero.

Primary structural comparison therefore remains blind human scoring until a
semantic machine metric is separately calibrated against labelled
same-structure/different-wording and different-structure/similar-wording pairs.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from statistics import mean

LIST_FIELDS = [
    "systemElements",
    "uncertainties",
    "powerExit",
    "temporalViability",
    "externalStakeholders",
    "actionClasses",
    "displacedCosts",
    "disconfirmingEvidence",
]
TOTAL_DIMENSIONS = len(LIST_FIELDS) + 1  # + mechanisms
MIN_SCORED_DIMENSIONS = 7
MIN_COVERAGE = MIN_SCORED_DIMENSIONS / TOTAL_DIMENSIONS


def norm(x: str) -> str:
    return " ".join(str(x).lower().strip().split())


def jaccard(a, b):
    """Exact normalized-string set overlap; None when both sides omit a field."""
    A = {norm(x) for x in (a or []) if str(x).strip()}
    B = {norm(x) for x in (b or []) if str(x).strip()}
    if not A and not B:
        return None
    if not A or not B:
        return 0.0
    return len(A & B) / len(A | B)


def mechanism_labels(m):
    return [h.get("label", "") for h in m.get("mechanisms", [])]


def validate_map(m):
    required = {
        "schemaVersion","caseId","propositions","systemElements","mechanisms","uncertainties",
        "powerExit","temporalViability","externalStakeholders","actionClasses","displacedCosts",
        "disconfirmingEvidence","narratorImplication","safetyCaution","genericitySelfCheck"
    }
    missing = required - set(m)
    if missing:
        raise ValueError(f"Map missing v0.3 fields: {sorted(missing)}")
    if m.get("schemaVersion") != "0.3":
        raise ValueError("Expected structural-map schemaVersion 0.3")
    for field in LIST_FIELDS:
        if not isinstance(m.get(field), list):
            raise ValueError(f"{field} must be a list")
    if not isinstance(m.get("mechanisms"), list) or not isinstance(m.get("propositions"), list):
        raise ValueError("mechanisms and propositions must be lists")
    return m


def validate_export_envelope(payload):
    required = {
        "exportVersion","exportedAt","caseId","condition","granularity","provider",
        "model","responseId","researchUsable","map"
    }
    missing = required - set(payload)
    if missing:
        raise ValueError(f"Export envelope missing fields: {sorted(missing)}")
    if payload.get("exportVersion") != "0.3.1":
        raise ValueError("Expected exportVersion 0.3.1")
    if payload.get("condition") not in {"rheo","control"}:
        raise ValueError("Export condition must be rheo or control")
    if payload.get("granularity") not in {"coarse","standard","fine"}:
        raise ValueError("Export granularity invalid")
    if payload.get("caseId") != payload.get("map", {}).get("caseId"):
        raise ValueError("Envelope caseId does not match map.caseId")
    if not isinstance(payload.get("researchUsable"), bool):
        raise ValueError("researchUsable must be boolean")
    validate_map(payload["map"])
    return payload


def granularity(m):
    list_items = sum(len(m.get(f, [])) for f in LIST_FIELDS)
    return {
        "proposition_count": len(m.get("propositions", [])),
        "mechanism_count": len(m.get("mechanisms", [])),
        "list_item_count": list_items,
        "total_item_count": len(m.get("propositions", [])) + len(m.get("mechanisms", [])) + list_items,
    }


def lexical_overlap(a, b):
    """Development-only lexical screen; never call this structural similarity."""
    validate_map(a); validate_map(b)
    parts = {field: jaccard(a.get(field, []), b.get(field, [])) for field in LIST_FIELDS}
    parts["mechanisms"] = jaccard(mechanism_labels(a), mechanism_labels(b))
    scored = [v for v in parts.values() if v is not None]
    scored_dimensions = len(scored)
    coverage = scored_dimensions / TOTAL_DIMENSIONS
    interpretable = scored_dimensions >= MIN_SCORED_DIMENSIONS
    return {
        "mean_lexical_overlap": mean(scored) if scored else None,
        "coverage": coverage,
        "scored_dimensions": scored_dimensions,
        "total_dimensions": TOTAL_DIMENSIONS,
        "interpretable": interpretable,
        "dimensions": parts,
        "granularity_a": granularity(a),
        "granularity_b": granularity(b),
    }


def structural_similarity(a, b):
    """Backward-compatible alias. Result is lexical overlap, not structure."""
    return lexical_overlap(a, b)


def load_payload(path):
    payload = json.loads(Path(path).read_text())
    if isinstance(payload, dict) and "map" in payload and "exportVersion" in payload:
        validate_export_envelope(payload)
        return payload["map"], {
            "exportVersion": payload["exportVersion"],
            "condition": payload["condition"],
            "granularity": payload["granularity"],
            "provider": payload["provider"],
            "model": payload["model"],
            "responseId": payload["responseId"],
            "researchUsable": payload["researchUsable"],
            "exportedAt": payload["exportedAt"],
        }
    return validate_map(payload), {"legacyRawMap": True}


def load_json(path):
    """Backward-compatible map loader."""
    return load_payload(path)[0]


def fmt(v):
    return "NA" if v is None else f"{v:.3f}"


def screen_pairs(manifest_path):
    manifest_path = Path(manifest_path)
    manifest = json.loads(manifest_path.read_text())
    rows = []
    for item in manifest["pairs"]:
        a, meta_a = load_payload(manifest_path.parent / item["a"])
        b, meta_b = load_payload(manifest_path.parent / item["b"])
        sim = lexical_overlap(a, b)
        rows.append({
            "pair_id": item["pair_id"], "family": item["family"],
            "lexical_overlap": sim["mean_lexical_overlap"], "coverage": sim["coverage"],
            "interpretable": sim["interpretable"],
            "granularity_a": sim["granularity_a"]["total_item_count"],
            "granularity_b": sim["granularity_b"]["total_item_count"],
            "condition_a": meta_a.get("condition"), "condition_b": meta_b.get("condition"),
            "provider_a": meta_a.get("provider"), "provider_b": meta_b.get("provider"),
            "research_usable_a": meta_a.get("researchUsable"), "research_usable_b": meta_b.get("researchUsable"),
            **sim["dimensions"]
        })
    print("PAIR LEXICAL SCREEN (debugging only; NOT structural similarity or confirmatory evidence)")
    print(f"Interpretation floor: at least {MIN_SCORED_DIMENSIONS}/{TOTAL_DIMENSIONS} dimensions (coverage >= {MIN_COVERAGE:.3f})")
    by_family = {}
    for r in rows:
        by_family.setdefault(r["family"], []).append(r)
    for fam, family_rows in sorted(by_family.items()):
        usable = [r for r in family_rows if r["interpretable"] and r["lexical_overlap"] is not None]
        covs = [r["coverage"] for r in family_rows]
        ga = [r["granularity_a"] for r in family_rows]
        gb = [r["granularity_b"] for r in family_rows]
        lexical_text = fmt(mean(r["lexical_overlap"] for r in usable)) if usable else "NA"
        print(f"{fam:16s} n={len(family_rows):3d} interpretable_n={len(usable):3d} mean_lexical_overlap={lexical_text} mean_coverage={mean(covs):.3f} granularity_a={mean(ga):.1f} granularity_b={mean(gb):.1f}")
    return rows


def inspect_export(path):
    m, meta = load_payload(path)
    print(json.dumps({"caseId": m.get("caseId"), **meta}, indent=2, sort_keys=True))


def cohen_kappa(labels1, labels2):
    if len(labels1) != len(labels2) or not labels1:
        raise ValueError("Two equally sized non-empty rater vectors required")
    cats = sorted(set(labels1) | set(labels2))
    n = len(labels1)
    po = sum(a == b for a, b in zip(labels1, labels2)) / n
    p1 = {c: labels1.count(c) / n for c in cats}
    p2 = {c: labels2.count(c) / n for c in cats}
    pe = sum(p1[c] * p2[c] for c in cats)
    return 1.0 if pe == 1.0 and po == 1.0 else (po - pe) / (1 - pe) if pe < 1 else 0.0


def quadratic_weighted_kappa(scores1, scores2):
    if len(scores1) != len(scores2) or not scores1:
        raise ValueError("Two equally sized non-empty score vectors required")
    a = [int(round(float(x))) for x in scores1]
    b = [int(round(float(x))) for x in scores2]
    lo, hi = min(a + b), max(a + b)
    if lo == hi:
        return 1.0
    cats = list(range(lo, hi + 1)); n = len(a); span = hi - lo
    observed = {(i,j):0 for i in cats for j in cats}
    for x,y in zip(a,b): observed[(x,y)] += 1
    ca = {i:a.count(i) for i in cats}; cb = {j:b.count(j) for j in cats}
    weighted_obs = 0.0; weighted_exp = 0.0
    for i in cats:
        for j in cats:
            w = ((i-j)/span) ** 2
            weighted_obs += w * observed[(i,j)] / n
            weighted_exp += w * (ca[i] * cb[j]) / (n*n)
    return 1.0 if weighted_exp == 0 and weighted_obs == 0 else 1 - weighted_obs / weighted_exp if weighted_exp else 0.0


def rater_summary(csv_path):
    with open(csv_path, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    required = {"item_id","rater_id","total_score","genericity"}
    missing = required - set(rows[0]) if rows else required
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")
    by_item = {}
    for r in rows:
        by_item.setdefault(r["item_id"], []).append(r)
    counts = {}
    for v in by_item.values(): counts[len(v)] = counts.get(len(v),0) + 1
    print(f"Items: {len(by_item)}; rater-count distribution: {dict(sorted(counts.items()))}")
    paired = [v for v in by_item.values() if len(v) == 2]
    if paired:
        r1g = [v[0]["genericity"] for v in paired]; r2g = [v[1]["genericity"] for v in paired]
        r1s = [v[0]["total_score"] for v in paired]; r2s = [v[1]["total_score"] for v in paired]
        print(f"Genericity Cohen kappa (exactly-two-rater subset): {cohen_kappa(r1g,r2g):.3f}")
        print(f"Total-score quadratic weighted kappa (exactly-two-rater subset): {quadratic_weighted_kappa(r1s,r2s):.3f}")
        diffs = [abs(float(a)-float(b)) for a,b in zip(r1s,r2s)]
        print(f"Mean absolute total-score disagreement: {mean(diffs):.3f}")
    nonpaired = len(by_item) - len(paired)
    if nonpaired:
        print(f"WARNING: {nonpaired} items do not have exactly two raters. They are reported here but not folded into the two-rater statistics; confirmatory analysis requires a pre-specified multi-rater IRR method.")


def empty_map(case_id='empty'):
    return {
        "schemaVersion":"0.3","caseId":case_id,"propositions":[],"systemElements":[],"mechanisms":[],"uncertainties":[],
        "powerExit":[],"temporalViability":[],"externalStakeholders":[],"actionClasses":[],"displacedCosts":[],"disconfirmingEvidence":[],
        "narratorImplication":{"present":False,"description":"","evidenceRefs":[]},
        "safetyCaution":{"level":"unknown","indicators":[],"evidenceRefs":[],"uncertainty":""},"genericitySelfCheck":"generic"
    }


def self_test():
    e1,e2 = empty_map('e1'), empty_map('e2')
    s = lexical_overlap(e1,e2)
    assert s["mean_lexical_overlap"] is None and s["coverage"] == 0.0 and not s["interpretable"], s
    p = empty_map('p'); p["systemElements"]=["resource access"]; p["mechanisms"]=[{"label":"access bottleneck","causalDirection":"rule -> access","evidenceRefs":["p1"],"confidence":"medium"}]
    same = lexical_overlap(p,p)
    assert same["mean_lexical_overlap"] == 1.0 and 0 < same["coverage"] < MIN_COVERAGE and not same["interpretable"], same
    q = empty_map('q'); q["systemElements"]=["decision authority"]; q["mechanisms"]=[{"label":"authority concentration","causalDirection":"role -> veto","evidenceRefs":["p1"],"confidence":"medium"}]
    diff = lexical_overlap(p,q)
    assert diff["mean_lexical_overlap"] == 0.0 and diff["coverage"] == same["coverage"] and not diff["interpretable"], diff
    print("v0.3.1 evaluator self-test passed: Jaccard is labelled lexical-only; empty/empty is unscored; low coverage is uninterpretable.")


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('screen-pairs'); s.add_argument('manifest')
    r = sub.add_parser('rater-summary'); r.add_argument('csv')
    i = sub.add_parser('inspect-export'); i.add_argument('json_file')
    sub.add_parser('self-test')
    args = p.parse_args()
    if args.cmd == 'screen-pairs': screen_pairs(args.manifest)
    elif args.cmd == 'rater-summary': rater_summary(args.csv)
    elif args.cmd == 'inspect-export': inspect_export(args.json_file)
    else: self_test()

if __name__ == '__main__':
    main()
