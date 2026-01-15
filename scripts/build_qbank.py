#!/usr/bin/env python3

import csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SRC = DATA / "qbank_clean.csv"
OUT_JSON = DATA / "qbank.json"
OUT_TOPICS = DATA / "topics.json"

def norm(s):
    return (s or "").strip()

def main():
    rows = []
    with SRC.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            # Basic validation: skip blanks
            q = norm(r.get("question",""))
            a = norm(r.get("answer",""))
            if not q or not a:
                continue
            # Normalise blank topics
            if not norm(r.get("topic","")):
                r["topic"] = "Uncategorised"
            rows.append(r)

    # Write qbank.json
    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    # Topics
    counts = {}
    for r in rows:
        t = norm(r.get("topic","Uncategorised")) or "Uncategorised"
        counts[t] = counts.get(t, 0) + 1
    topics = [{"topic": k, "count": counts[k]} for k in sorted(counts.keys(), key=lambda x: (-counts[x], x.lower()))]
    with OUT_TOPICS.open("w", encoding="utf-8") as f:
        json.dump(topics, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(rows)} questions to {OUT_JSON}")
    print(f"Wrote {len(topics)} topics to {OUT_TOPICS}")

if __name__ == "__main__":
    main()
