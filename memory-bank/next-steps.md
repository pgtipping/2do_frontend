# Next Steps

## 2026-05-28 17:30:00 - Active resumption path

Recommended next step: ask the user whether to commit and push the duplicate finder, then resume work on multi-PDF upload or JSON restore.

Why this is next:

- Duplicate finder in the Ledger is implemented and verified live in the user's Chrome tab against 134 saved transactions. Empty-state path renders correctly. Cluster path is covered by unit tests but has not yet been exercised live (the user has no real duplicates).
- Save-time guard (exact fingerprint) is unchanged; the new tool only catches duplicates that slipped past it via narration drift.
- Multi-PDF / multi-statement upload is still the user's requested next feature so multiple statements can be combined in one Ledger view.
- JSON backup export exists, but restore import is still not exposed in the app UI.
- All prior QA fixes (review row layout, parser merchant tail, inline category creation, All-months Ledger default, category-rule normalizer per-transaction strip including month tokens) are shipped on `main`.

Build in this order:

1. Commit and push the duplicate finder if approved.
2. Multi-PDF upload so several statements can be parsed and reviewed together.
3. JSON restore import to round out backup/restore.
4. Improve README with current MVP behavior and screenshots.
5. Consider a transaction search/filter pass for the Ledger.

Current reminder:

- The project has no separate backend in MVP.
- Do not add authentication or bank sync UI yet.
- Keep future bank sync compatibility in data fields.
