# Active Context

## 2026-05-25 18:06:50 - Current project state

The repository is cloned locally at `C:\Users\pgeor\Documents\WebDev\Personal Finance App` and tracks `pgtipping/2do_frontend` on `main`.

The app is a Vite React app. It is currently a personal finance workspace, not a todo app in the active screen.

Current shipped screen:

- Import tab: TD Bank statement text/PDF import, parse, review, select rows, choose categories, save selected rows.
- Ledger tab: saved transactions by month with income, spending, and left-over summary, plus inline edit/delete for saved transactions.
- Reports tab: monthly cashflow chart, spending by category, upcoming subscriptions, and self-transfer toggle.
- Categories tab: create, rename, color, hide, and restore categories.
- Export actions: CSV transaction export and JSON backup export.

Current important behavior:

- TD Bank PDF/text import is supported through the parser and PDF text extractor.
- Imported rows can be labeled before save.
- Saved labels create reusable category rules.
- Future matching imports can apply learned labels automatically.
- Saved transactions can be edited after import.
- Edited descriptions do not replace raw bank narration.
- Changing a saved transaction category surfaces three scope choices when similar transactions exist: this transaction, matching past transactions, or matching past and future transactions.
- Future category learning from Ledger edits happens only when the user chooses the past-and-future option.
- Similar transaction matching uses merchant first, then normalized raw bank narration with store numbers removed.
- Saved transactions can be deleted with a two-step confirmation in the Ledger.
- Hidden categories stay visible for old transactions but are removed from future assignment dropdowns unless already selected.
- Transfers to other people count as spending.
- Self-transfers are excluded from spending by default, with report toggle support.

Latest pushed commit before this session:

- `3f77ee3 feat: add finance workspace tabs`

Latest local commits created this session:

- `8838d00 feat: add ledger transaction edits`
- Category management is committed at current `HEAD`.

Current branch state:

- `main` is ahead of `origin/main` with the local Ledger edit/delete and category management commits.

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

## 2026-05-26 18:04:00 - Category management verification baseline

Most recent verified checks after category management work:

- Finance tests: 33 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.
- Playwright MCP browser smoke test passed against the production `dist` build served locally at `http://127.0.0.1:5176/`.
- Smoke test covered importing two Starbucks rows, creating a Dining category, editing one Starbucks transaction, choosing past-and-future smart apply, and confirming Reports showed Dining at `$15.25` with zero browser console errors.
