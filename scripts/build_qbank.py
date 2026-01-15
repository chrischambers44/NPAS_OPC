#!/usr/bin/env python3

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SRC = DATA / "qbank_clean.csv"
OUT_JSON = DATA / "qbank.json"
OUT_TOPICS = DATA / "topics.json"

# Remove control chars (incl vertical tab U+000B and form feed U+000C)
# Keep \t, \n, \r out of this range so normal line breaks are preserved.
CTRL = re.compile(r"[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]")

def clean_text(s: str) -> str:
    s = (s or "")
    # Normalise line breaks
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    # Strip control characters
    s = CTRL.sub(" ", s)
    # Tidy whitespace (without destroying newlines)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def main():
    rows = []
    with SRC.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            # Clean every field
            for k, v in list(r.items()):
                r[k] = clean_text(v)

            # Basic validation: skip blanks
            q = r.get("question", "")
            a = r.get("answer", "")
            if not q or not a:
                continue

            # Normalise blank topics
            if not r.get("topic", ""):
                r["topic"] = "Uncategorised"

            rows.append(r)

    # Write qbank.json
    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    # Topics
    counts = {}
    for r in rows:
        t = r.get("topic", "Uncategorised") or "Uncategorised"
        counts[t] = counts.get(t, 0) + 1

    topics = [{"topic": k, "count": counts[k]} for k in sorted(counts.keys(), key=lambda x: (-counts[x], x.lower()))]
    with OUT_TOPICS.open("w", encoding="utf-8") as f:
        json.dump(topics, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(rows)} questions to {OUT_JSON}")
    print(f"Wrote {len(topics)} topics to {OUT_TOPICS}")

if __name__ == "__main__":
    main()

