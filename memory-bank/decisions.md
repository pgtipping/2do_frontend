# Decisions

## 2026-06-01 21:04:53 - Storage reversed to Supabase cloud + auth (supersedes 2026-05-25 local-first)

At the user's explicit request, storage moves from local-first IndexedDB to Supabase (hosted Postgres) behind a login. This supersedes the 2026-05-25 "local-first, no authentication/multi-device sync" decision below.

- Provider: Supabase, not Vercel Postgres. This is a browser-only Vite SPA with no backend; Supabase ships a browser-safe client (publishable key + Row-Level Security), while Vercel Postgres needs a server layer the app does not have.
- Storage shape: one JSONB bundle per user (table `finance_state`), mirroring the existing single-record IndexedDB driver, so all repository logic is reused via the existing driver seam. Normalized per-entity tables deferred until actually needed.
- Auth: magic-link (passwordless), single owner; new sign-ups to be disabled after first login. RLS restricts each row to its owner.
- Only the publishable key is in the frontend; the secret key is never used client-side.
- Offline support dropped for now (cloud requires network + login); a local cache could be added later if needed.

## 2026-05-25 18:06:50 - Product direction

The app is being repurposed from a todo app into a personal finance app.

Primary jobs:

- Track spending.
- Budget by flexible category.
- Plan bills and recurring expenses.

The MVP should focus on local-first personal finance, not authentication or multi-device sync.

## 2026-05-25 18:06:50 - Storage direction

Use local-first browser storage for version one.

Storage should stay compatible with possible future bank sync by keeping sync-ready IDs, source fields, raw narration, import fingerprints, and metadata fields.

## 2026-05-25 18:06:50 - First import source

TD Bank PDF statements are the first import source.

The parser should preserve raw narration, handle multiline descriptions, ignore non-transaction statement sections, and reconcile parsed totals with statement subtotals.

## 2026-05-25 18:06:50 - Transfer handling

Transfers to other people count as spending.

Transfers to self are excluded from spending totals by default, but reports should let the user include them.

## 2026-05-25 18:06:50 - Label learning

When the user labels an imported transaction and saves it, the app should remember a normalized text rule.

Future imports should check learned rules first and apply the matched category automatically.

This is not artificial intelligence. It is simple pattern memory, like recognizing a repeated line on a bank statement.

## 2026-05-25 19:47:26 - Edited descriptions do not replace bank text

Original imported bank narration stays unchanged.

User-edited descriptions are personal labels for display and cleanup.

Future category learning should match against the unchanged bank narration, then apply the user's saved category. Do not rewrite raw TD Bank text to match the user's edited description.

## 2026-05-25 18:06:50 - Workspace layout

Use guided tabs for the first practical app shape:

- Import
- Ledger
- Reports

Reports should look like the dashboard-style option discussed during visual planning, but it should live inside the Reports tab rather than replacing the whole app home screen.

## 2026-05-26 18:04:00 - Smart category cleanup

Ledger category edits should not automatically rewrite future category rules.

When similar transactions exist, the app should ask how broadly to apply the category change:

- This transaction only.
- Matching past transactions.
- Matching past and future transactions.

This keeps the app smart without silently rewriting spending history.

Renaming a category keeps history together because the category identity stays the same.

Hiding a category retires it from future assignment lists, but old transactions still show and report under that category.
