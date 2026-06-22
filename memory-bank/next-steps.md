# Next Steps

## 2026-06-21 22:22:23 - Reports rebuild built (local) — two features pending commit

TWO uncommitted features on `main`, to land as SEPARATE commits on the user's signal:
1. Ledger sort control (5 fields).
2. Reports page rebuild (multi-month chips + 4 cards).

Possible follow-up the user may want: in Reports, "spending" currently includes transfers to other people (Zelle-sent), which makes the spending total / savings rate look extreme on the real data. Offer to split transfers-to-others out of "spending" (or show them as their own line) if that framing isn't wanted.

Backlog: multi-PDF upload; README refresh; 9 npm audit vulns (pdfjs-dist/vite).

## 2026-06-21 21:12:19 - Ledger sort control built (local)

Immediate: commit + push the ledger sort on the user's signal (currently local on `main`).
Live-verified non-destructively; no further verification needed.

Earlier shipped (live on production): uncategorized highlight + lock (8fa9075); saved-rows-leave-list + save confirmation (0ccc3db).
Backlog: multi-PDF upload; README refresh; Ledger search/filter (sort now done); 9 npm audit vulns (pdfjs-dist/vite).

## 2026-06-20 04:20:46 - Save-confirmation + saved-rows-leave-list built (local)

Immediate:
1. Commit + push once the user gives the signal (currently local on `main`, nothing committed).
2. Optional: live-demo the post-save green banner. It needs a real save, which writes to the user's Supabase ledger — either the user clicks Save Selected and watches, or do a save+delete cycle only with explicit approval. Unit tests + the approved mockup already cover the banner copy/visual.

Earlier shipped (live): the uncategorized highlight + lock (commit 8fa9075, deployed and verified on production).
Still open backlog: multi-PDF upload; README refresh; Ledger search/filter; 9 npm audit vulns (pdfjs-dist/vite).

## 2026-06-20 02:26:01 - Import Review uncategorized-blocking shipped (local)

Immediate:
1. Live check in Chrome — DONE (highlight + lock + unlock-on-categorize all verified with a synthetic sample; not saved).
2. Commit + push this change once the user gives the signal (currently local on `main`, nothing committed).

Still open from prior sessions (unchanged priority):
- Verify end-to-end magic-link login on the live Vercel site (`https://personal-finance-sooty-sigma.vercel.app`) — the last step of the Vercel deploy; needs an actual login by the user.
- Backlog: multi-PDF upload; README refresh; Ledger search/filter. 9 npm audit vulns (pdfjs-dist/vite) flagged, not addressed.

## 2026-06-01 21:04:53 - Finish Supabase cutover

Done this session: Supabase storage driver, magic-link login gate, Sign out, and the JSON restore button (the previously-pending "JSON restore import" item is now built). Build + both test suites green; login gate verified live in Chrome.

Immediate (user actions):
1. Log in via magic link on the dev server.
2. Click Restore JSON and select `~/Downloads/recovered-from-5191.json` to load the recovered 134 transactions into Supabase.
3. Disable new sign-ups in Supabase Auth (owner-only access).

Then:
4. Commit and push the Supabase migration once the user gives the signal (nothing committed yet).
5. Optional: remove the now-unused IndexedDB driver, or keep it as an offline fallback (decide later).
6. Prior backlog still open: multi-PDF upload; README refresh; Ledger search/filter.

Note: the earlier "do not add authentication or bank sync UI yet" reminder is superseded by the user's explicit move to Supabase + login.

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
