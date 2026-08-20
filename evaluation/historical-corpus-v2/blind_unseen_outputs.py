#!/usr/bin/env python3
import argparse, hashlib, json, secrets
from pathlib import Path
from datetime import datetime, timezone


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description="Blind frozen unseen-case model outputs before scoring.")
    ap.add_argument("run_dir", help="Path to one model-runs/<timestamp> directory")
    args = ap.parse_args()

    run_dir = Path(args.run_dir).expanduser().resolve()
    if not run_dir.is_dir():
        raise SystemExit(f"Not a directory: {run_dir}")

    src_files = sorted(p for p in run_dir.glob("*.json") if p.name != "_run_log.json")
    if not src_files:
        raise SystemExit("No model output JSON files found.")

    parsed = []
    for p in src_files:
        obj = json.loads(p.read_text(encoding="utf-8"))
        if obj.get("experiment") != "historical-corpus-v2-unseen":
            raise SystemExit(f"Unexpected experiment in {p.name}")
        if obj.get("condition") not in {"rheo", "control"}:
            raise SystemExit(f"Missing/invalid condition in {p.name}")
        parsed.append((p, obj))

    case_ids = {o.get("caseId") for _, o in parsed}
    t0_hashes = {o.get("t0Sha256") for _, o in parsed}
    if len(case_ids) != 1 or len(t0_hashes) != 1:
        raise SystemExit("Outputs do not share one caseId/T0 hash.")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    blind_dir = run_dir.parent / f"{run_dir.name}-BLINDED-{stamp}"
    blind_dir.mkdir(parents=True, exist_ok=False)
    key_path = run_dir.parent / f"{run_dir.name}-BLINDING-KEY-PRIVATE-{stamp}.json"

    tokens = [f"M{i:02d}" for i in range(1, len(parsed)+1)]
    secrets.SystemRandom().shuffle(tokens)

    key = {
        "blindingVersion": "unseen-output-blind-v1",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "caseId": next(iter(case_ids)),
        "t0Sha256": next(iter(t0_hashes)),
        "sourceRunDir": str(run_dir),
        "mapping": []
    }

    for token, (src, obj) in zip(tokens, parsed):
        blinded = dict(obj)
        condition = blinded.pop("condition", None)
        sample = blinded.pop("sample", None)
        response_id = blinded.pop("responseId", None)
        blinded["blindToken"] = token
        dest = blind_dir / f"{token}.json"
        dest.write_text(json.dumps(blinded, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        key["mapping"].append({
            "blindToken": token,
            "condition": condition,
            "sample": sample,
            "responseId": response_id,
            "sourceFile": src.name,
            "sourceSha256": sha256(src),
            "blindedFile": dest.name,
            "blindedSha256": sha256(dest),
        })

    freeze = {
        "freezeVersion": "unseen-output-source-freeze-v1",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "caseId": next(iter(case_ids)),
        "t0Sha256": next(iter(t0_hashes)),
        "files": [{"file": p.name, "sha256": sha256(p)} for p in src_files],
    }
    if (run_dir / "_run_log.json").exists():
        freeze["runLog"] = {"file": "_run_log.json", "sha256": sha256(run_dir / "_run_log.json")}

    (blind_dir / "_SOURCE_FREEZE.json").write_text(json.dumps(freeze, indent=2) + "\n", encoding="utf-8")
    key_path.write_text(json.dumps(key, indent=2) + "\n", encoding="utf-8")

    print(f"Blinded outputs: {blind_dir}")
    print(f"PRIVATE key:     {key_path}")
    print("Upload the blinded directory only. Do NOT upload the private key until scoring is frozen.")


if __name__ == "__main__":
    main()
