# Decisions

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

## 2026-05-25 18:06:50 - Workspace layout

Use guided tabs for the first practical app shape:

- Import
- Ledger
- Reports

Reports should look like the dashboard-style option discussed during visual planning, but it should live inside the Reports tab rather than replacing the whole app home screen.
