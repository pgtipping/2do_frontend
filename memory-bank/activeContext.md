# Active Context

## 2026-05-25 18:06:50 - Current project state

The repository is cloned locally at `C:\Users\pgeor\Documents\WebDev\Personal Finance App` and tracks `pgtipping/2do_frontend` on `main`.

The app is a Vite React app. It is currently a personal finance workspace, not a todo app in the active screen.

Current shipped screen:

- Import tab: TD Bank statement text/PDF import, parse, review, select rows, choose categories, save selected rows.
- Ledger tab: saved transactions by month with income, spending, and left-over summary, plus inline edit/delete for saved transactions.
- Reports tab: monthly cashflow chart, spending by category, upcoming subscriptions, and self-transfer toggle.
- Export actions: CSV transaction export and JSON backup export.

Current important behavior:

- TD Bank PDF/text import is supported through the parser and PDF text extractor.
- Imported rows can be labeled before save.
- Saved labels create reusable category rules.
- Future matching imports can apply learned labels automatically.
- Saved transactions can be edited after import.
- Edited descriptions do not replace raw bank narration.
- Changing a saved transaction category updates or creates the learned category rule for that transaction's raw bank narration.
- Saved transactions can be deleted with a two-step confirmation in the Ledger.
- Transfers to other people count as spending.
- Self-transfers are excluded from spending by default, with report toggle support.

Latest pushed commit before this session's local changes:

- `3f77ee3 feat: add finance workspace tabs`

Current branch state after the last verified push:

- `main` is up to date with `origin/main`.

Current uncommitted local work:

- Added repository update/delete behavior for saved transactions.
- Added inline Ledger edit/delete controls.
- Added tests for saved transaction update, delete, raw narration preservation, and learned rule updates.

## 2026-05-26 03:12:02 - Verification baseline

Most recent verified checks after Ledger edit/delete work:

- Finance tests: 29 passed.
- Production build: passed with Vite.
- Codex in-app browser smoke test: passed against the production `dist` build served locally at `http://127.0.0.1:5175/`.
- Smoke test covered importing sample TD rows, opening Ledger, editing a visible transaction, saving the edit, showing delete confirmation, confirming delete, and checking for zero browser console errors.
- Earlier Playwright MCP browser check was blocked by a profile-in-use error, but Codex browser verification completed successfully afterward.

Use Codex bundled Node when normal `npm` is unavailable:

- Node path: `C:\Users\pgeor\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`
- Direct test command used successfully: bundled Node with `--test src\finance\__tests__\*.test.mjs src\finance\imports\__tests__\*.test.mjs`
- Direct build command used successfully: bundled Node with `.\node_modules\vite\bin\vite.js build`
