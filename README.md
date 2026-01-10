# EC135 Revision (OPC Prep) — static GitHub Pages starter

This is a simple, fast revision site that:
- groups questions by **Topic** (from the CSV)
- provides a **Quickfire** mode (10 / 30 / randomised)
- stores *Missed* questions locally in your browser (no accounts)

## Data files
- `data/qbank_clean.csv`  ← edit this as your master
- `data/qbank.json`       ← generated from the CSV (site loads this)
- `data/topics.json`      ← generated topic counts

## Editing workflow (simple)
1. Edit `data/qbank_clean.csv`
2. Rebuild `data/qbank.json` and `data/topics.json` using a small script (we can add one)
3. Commit and push — GitHub Pages updates

## Notes
- Questions flagged as `status=needs_image` will show "needs image" in the metadata line.
- Blank-topic rows are labelled `Uncategorised`.


## Tags
A new `tags` column exists in `data/qbank_clean.csv`. Use comma-separated tags such as `opc`, `frc`, `fadec`, `electrical`, `fuel`, `fire`, `afcs`, `if`.
