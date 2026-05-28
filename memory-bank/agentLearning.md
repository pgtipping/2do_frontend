# Agent Learning

## 2026-05-25 18:06:50 - Windows local tooling pattern

On this machine, `npm` may not be available in PowerShell, and some Node launchers can be blocked.

Use the bundled Codex Node executable directly for reliable checks:

- Finance tests: run bundled Node with `--test` against the finance test files.
- Build: run bundled Node with `.\node_modules\vite\bin\vite.js build`.

This avoids the blocked `npm` and app-store Node path issues seen during setup.

## 2026-05-25 18:06:50 - Visual companion fallback

The Superpowers visual companion server had path and Node resolution problems on this Windows workspace.

Working fallback:

- Use Playwright directly against the local Vite app for real UI checks.
- For design comparisons, a temporary static HTML mockup can be created under ignored folders, but remove it before commit.

Do not commit `.superpowers/` or `.playwright-mcp/`.

## 2026-05-25 19:47:26 - Playwright profile conflict fallback

The Playwright MCP browser can fail with a profile-in-use error:

- `Browser is already in use for ... mcp-chrome-...`

When this happens, do not claim browser verification passed.

Record the blocker, rely only on completed tests/build checks, and rerun browser verification later with a clean Playwright browser profile.

## 2026-05-26 18:04:00 - Windows browser smoke server pattern

For production `dist` smoke tests on this Windows workspace, a local static server started inside the sandbox may stop as soon as the shell command exits.

Working pattern:

- Build first with bundled Node.
- Start `python -m http.server` with `Start-Process` using escalation when the server must stay alive across Playwright MCP calls.
- Stop that temporary process after the browser check.
- Use Playwright MCP against `http://127.0.0.1:<port>/` and record the checked user flow plus console error result.

## 2026-05-26 19:05:00 - Persistent Node REPL smoke server fallback

When shell-started servers disappear before Playwright MCP can connect, start a small static server from the Node REPL tool instead.

Working pattern:

- Build `dist` first with bundled Node.
- Use Node REPL to create an HTTP server for `dist` and keep it on `globalThis`.
- Point Playwright MCP at that local port.
- This worked for the subscription browser smoke test at `http://127.0.0.1:5178/` without escalation.

## 2026-05-27 02:00:52 - Fresh-port browser QA avoids deleting real local data

Do not delete IndexedDB to get a clean browser test state unless the user explicitly approves that data loss risk.

Safer pattern:

- Serve the same production `dist` build on a fresh localhost port.
- Browser storage is separated by origin, and the port is part of the origin.
- Use the fresh port for test data without touching any real data saved under earlier ports.

## 2026-05-27 22:48:40 - Real PDF parser fixes need real layout evidence

For TD Bank PDF parsing, synthetic PDFs are useful only for narrow extraction mechanics.

When a real upload fails, first inspect the actual extracted text shape. Real TD statements can interrupt `Electronic Payments` with account-help boilerplate, then resume as `Electronic Payments (continued)` on later pages. Page headers can also appear between rows.

Do not treat a synthetic upload as proof that the real PDF workflow is fixed. Add a redacted parser test that preserves the real section/page-break shape, then verify tests and build.

## 2026-05-27 22:53:49 - TD balance summaries can mimic transaction rows

TD Bank `DAILY BALANCE SUMMARY` rows can look like transaction rows because they contain dates and amounts in the same line.

When parsing TD statements, clear the active activity section after `Subtotal` and treat the daily balance summary as non-transaction text. Otherwise balance table rows can become fake deposit or payment transactions.

## 2026-05-27 23:06:09 - Repeated TD sections need grouped reconciliation

TD Bank PDF extraction can produce repeated activity sections with the same name.

When reconciling parser totals, group expected subtotals by section name before comparing against parsed transactions. Comparing all parsed rows against each individual repeated subtotal creates duplicate warning boxes and marks every import row for review.

When the built-in browser keeps showing fixed parser bugs, check the served `dist/index.html` and asset name directly. If the served asset is new but the screenshot shows old behavior, the live tab is still running old JavaScript and needs a browser refresh before re-testing.

## 2026-05-27 23:14:00 - Import review rows need explicit grid areas

The Import review list can show long descriptions, category selects, amounts, status pills, and warning reasons in one row card.

Do not rely on automatic CSS grid placement for these cards. Use named grid areas for each row part, and define a separate narrow layout order. Otherwise low-confidence rows can look visually scrambled at tablet-width browser sizes.

## 2026-05-28 14:00:00 - Diagnose parser bugs against the real extracted text, not the screenshot

A user-visible "the parser is dropping line 3" can describe several different file shapes. The screenshot showed three lines (date+code, VISA+amount, merchant) and the redacted test matched that exactly — but the live extraction was actually two lines (date+code+amount on one line, merchant on the next). Tests passed; the live tab still showed the bug.

Going forward, when a parser fix doesn't change live behavior, read the actual textarea content from the running tab (e.g. via the Chrome MCP `javascript_tool`) before adjusting heuristics. Don't trust the visual layout of the textarea screenshot to be a faithful description of `text.split('\n')`.

Also: when routing transactions, both the "single-line" (`parseTransactionLine`) and "multi-line" (`parseTransactionStartLine`) cases should funnel through the same `pendingRow` pipeline. That way merchant-tail handling, page-break protection, and any future post-amount handling apply uniformly without duplicating logic across two code paths.

## 2026-05-28 03:50:00 - TD POS / DBCRD merchant tail signature

TD Bank POS / DBCRD transactions span 3 lines and the merchant tail line always ends with `* XX` where XX is a 2-letter state or region code (e.g. `* CA`, `* RI`, `* AR`, `* MD`). Page-break boilerplate (`STATEMENT OF ACCOUNT`, `Call 1-800-...`, `Page: X of Y`, FDIC notices) never has this signature.

Use this signature to distinguish merchant continuation from header bleed: after a pending row reaches its inline amount, only append the following line if it matches `\*\s+[A-Z]{2}$`; otherwise treat it as page-break boilerplate and skip it (preserving the earlier guard).

Once a merchant tail is appended, mark the row "saturated" so subsequent plain lines flush immediately instead of accumulating.

When the merchant tail is appended after the amount line, the amount is no longer at the END of the joined narration. Find the LAST amount-like token (`(-?\$?[\d,]+\.\d{2})`) anywhere in the joined string and remove just that token to derive the narration.

## 2026-05-28 03:27:00 - Flex children with max-height + overflow need flex-shrink: 0

When a scrollable flex column has `max-height` plus `overflow: auto` (like `.review-table`), flex's default `flex-shrink: 1` will compress each child's BOX height to fit the cap, even though the child's internal content (grid rows here) keeps its natural size. The result is content that visibly leaks outside the child's box and overlaps whatever sits below.

Symptom on this project: the last Import review row's warning reasons text rendered ~37px below the row's own bottom and bled into the reconciliation strip beneath the table.

Fix: set `flex-shrink: 0` on the scrollable container's direct children so the container scrolls instead of compressing rows. Diagnose by comparing `offsetHeight` vs `scrollHeight` on the suspect child — a positive delta with the parent at its `max-height` is the signature.
