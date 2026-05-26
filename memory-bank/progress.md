# Progress

## 2026-05-25 18:06:50 - Finance foundation shipped

Completed before memory bank creation:

- Added sync-ready finance domain objects for accounts, categories, transactions, subscriptions, import batches, and category rules.
- Added local-first repository backed by IndexedDB in the browser, with memory driver for tests.
- Added TD Bank statement parser for the known statement format.
- Added PDF text extraction for statement uploads.
- Added reviewed import draft creation with row status and reconciliation checks.
- Added default finance categories.
- Added report helpers for monthly summary, category spending, monthly cashflow, and upcoming subscriptions.
- Added backup helpers for JSON backup restore and CSV transaction export.

## 2026-05-25 18:06:50 - Workspace tabs shipped

Commit `3f77ee3 feat: add finance workspace tabs` added:

- Import, Ledger, and Reports tabs.
- Category dropdowns on import review rows.
- Learned category rules from saved labels.
- Automatic learned category application in future import drafts.
- Ledger month view with transaction rows.
- Dashboard-style Reports view.
- CSV and JSON backup buttons.
- Favicon and ignored temporary browser/tool folders.

Verification for that commit:

- 26 finance tests passed.
- Vite production build passed.
- Browser checks passed on desktop and mobile.
- Commit was pushed to `origin/main`.

## 2026-05-25 19:47:26 - Ledger edit and delete implemented locally

Implemented in the current local working tree:

- Added repository methods to update and delete saved transactions.
- Preserved raw imported bank narration when a user edits the display description.
- Added category-rule learning for saved transaction edits.
- Added Ledger inline edit controls for category, transaction type, notes, merchant, and description.
- Added two-step delete confirmation in the Ledger.
- Added tests for update, delete, raw narration preservation, and learned category-rule updates.

Verification:

- Finance tests: 29 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Codex in-app browser smoke test: passed against the production `dist` build served at `http://127.0.0.1:5175/`.
- Browser smoke test confirmed import to Ledger, inline edit save, delete confirmation, confirmed delete, and zero browser console errors.

## 2026-05-26 18:04:00 - Category management implemented locally

Implemented in the current local working tree:

- Added Categories tab for creating, renaming, recoloring, hiding, and restoring categories.
- Added repository methods for category updates, hide/restore, similar transaction matching, and scoped category changes.
- Changed Ledger category edits so future learning only happens when the user chooses the past-and-future option.
- Added smart apply choices from Ledger edits: this transaction, matching past transactions, or matching past and future transactions.
- Kept hidden categories available for old transaction display while excluding them from normal future assignment lists.
- Added tests for category management, smart apply behavior, and raw bank narration matching where store numbers differ.

Verification:

- Finance tests: 33 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Playwright MCP browser smoke test: passed against the production `dist` build served at `http://127.0.0.1:5176/`.
- Browser smoke test confirmed category creation, past-and-future smart apply for Starbucks, Dining report total of `$15.25`, and zero browser console errors.
