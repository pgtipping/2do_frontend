# Active Context

## 2026-05-25 18:06:50 - Current project state

The repository is cloned locally at `C:\Users\pgeor\Documents\WebDev\Personal Finance App` and tracks `pgtipping/2do_frontend` on `main`.

The app is a Vite React app. It is currently a personal finance workspace, not a todo app in the active screen.

Current shipped screen:

- Import tab: TD Bank statement text/PDF import, parse, review, select rows, choose categories, save selected rows.
- Ledger tab: saved transactions by month with income, spending, and left-over summary.
- Reports tab: monthly cashflow chart, spending by category, upcoming subscriptions, and self-transfer toggle.
- Export actions: CSV transaction export and JSON backup export.

Current important behavior:

- TD Bank PDF/text import is supported through the parser and PDF text extractor.
- Imported rows can be labeled before save.
- Saved labels create reusable category rules.
- Future matching imports can apply learned labels automatically.
- Transfers to other people count as spending.
- Self-transfers are excluded from spending by default, with report toggle support.

Latest pushed commit:

- `3f77ee3 feat: add finance workspace tabs`

Current branch state after the last verified push:

- `main` is up to date with `origin/main`.

## 2026-05-25 18:06:50 - Verification baseline

Most recent verified checks before creating this memory bank:

- Finance tests: 26 passed.
- Production build: passed with Vite.
- Browser check: desktop and mobile layouts rendered for Import, Ledger, and Reports.

Use Codex bundled Node when normal `npm` is unavailable:

- Node path: `C:\Users\pgeor\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`
- Direct test command used successfully: bundled Node with `--test src\finance\__tests__\*.test.mjs src\finance\imports\__tests__\*.test.mjs`
- Direct build command used successfully: bundled Node with `.\node_modules\vite\bin\vite.js build`
