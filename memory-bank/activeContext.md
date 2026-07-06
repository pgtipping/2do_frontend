# Active Context

## 2026-07-06 19:57:15 - Reports view gains averages alongside totals

User asked to "see averages in addition to totals in the report view". Built via subagent-driven development on branch `feat/report-averages` (7 commits, cf6645c..efab451), off `main` at 2b90d61. Spec: docs/superpowers/specs/2026-07-06-report-averages-design.md; plan: docs/superpowers/plans/2026-07-06-report-averages.md.

Design decision the user landed on after review: every per-month average divides by the **number of selected months** (`effectiveReportMonths.length`), including months a category had no spending — the true monthly spend figure (category `$/mo` values reconcile to the total). They first picked "active months only" but reversed once it was pointed out that (a) the month picker only offers months that have data, so the distinction is a no-op at the period level, and (b) for a spend average a zero-spend month is a real $0 that must be counted. This simplified the build — no per-category month tracking needed.

reports.js — all math in pure tested helpers, no division in JSX:
- New `average(total, count)` → `total / count`, or `null` when count is 0/absent. Single helper backs every quotient (per-month sub-lines, per-category, avg/transaction, per-merchant).
- New `calculateSpendingTransactionCount(transactions, {month, includeSelfTransfers})` — divisor for avg/transaction; honors the self-transfer toggle (refunds count; self-transfers only when on).
- `rankCategorySpending` gains an optional `monthCount`; each row now carries `monthlyAverage = average(total, monthCount)` (null without monthCount). `calculateCategorySpending` untouched.
- `calculateTopMerchants` rows gain `count` (charges) + `average` (per-charge). Existing merchant + refund tests updated for the new shape.

FinanceImportScreen.jsx (Reports UI):
- Cash summary: muted `avg $X/mo` sub-line under Income/Spending/Left over/Self-transfers, shown only when 2+ months selected (`showMonthlyAverages = reportMonthCount >= 2`); NOT on Savings rate. New "Avg / transaction" stat tile (total spending ÷ spending-tx count), shown when non-null → grid goes 5→6 tiles (auto-fit minmax(120px,1fr) reflows). New `.stat-average` CSS.
- Spending by category: each row extends `$450 · 32%` → `· $75/mo avg`, same 2+-month suppression.
- Top merchants: each row gains a small `$18 avg` (per-charge) under the name; NOT month-gated (per-transaction).

Verified: `npm run build` green; `npm run test:node` 92/92 (was 88 — +4 helper tests). Every task passed a spec+quality review; final whole-branch review (opus) = ready to merge, no Critical/Important. Merged to local `main` on user signal.

STILL OPEN — manual Chrome visual check of the rendered Reports tab (6-tile reflow at narrow/wide widths; sub-line/segment placement; a negative average like a fully-refunded merchant rendering `-$5.00 avg`). Deferred because the app is behind a Supabase magic-link login (email step) that can't be completed autonomously and there's no data without a real account. Numbers themselves are unit-tested; only layout/render is unconfirmed. Not pushed to origin (push only on user signal).

## 2026-06-25 19:22:00 - Ledger gains multi-month selection (mirrors Reports)

User asked for the ability to select multiple months in the Ledger. Replaced the Ledger's single-month `<select>` with the same dropdown checklist the Reports page already uses.

State: removed `selectedMonth` (single string, default ALL_MONTHS); added `ledgerMonths` (null = all months, else an explicit ["YYYY-MM"] list) — identical model to `reportMonths`. New derivations mirror the report ones: `effectiveLedgerMonths = ledgerMonths ?? monthOptions`, `ledgerTransactions = filterTransactionsByMonths(transactions, effectiveLedgerMonths)`, `ledgerAllMonthsSelected`, `ledgerScopeLabel` (All months / single "YYYY-MM" / "N months"), `toggleLedgerMonth`. `monthSummary` now aggregates over `ledgerTransactions` with `month: ALL_MONTHS` (was per-single-month); `monthTransactions = sortTransactions(ledgerTransactions, sortOrder, {categoryById})`. Renamed `reportMonthsByYear` → `monthsByYear` (shared by both pickers).

UI: the Ledger heading actions now render a `<details className="month-picker align-end">` checklist (Select all / Clear + month checkboxes grouped by year) instead of the single `<select>`. New CSS `.month-picker.align-end .month-picker-panel { left:auto; right:0 }` so the panel opens leftward (the Ledger trigger sits at the right edge via justify-content:flex-end, unlike the Reports picker on the left). Heading h2 now reads "N saved transactions" for all-months or "<scope> · N transactions" for a subset. loadFinanceData now prunes any selected ledger months that no longer have data (functional setLedgerMonths update; returns same ref when unchanged).

No new pure logic — reuses the already-tested filterTransactionsByMonths + calculateMonthlySummary, and the month-picker pattern already verified live on Reports. Build green (3.89s; bundles index-ab0da8e1.css / index-d8adb2aa.js). 88 node + 5 vitest still pass. Confirmed zero remaining `selectedMonth` / `reportMonthsByYear` references; all new vars defined (build is esbuild, no type-check, so checked by hand).

LIVE-VERIFIED in Chrome (real data, read-only) once the integration reconnected: picker present with 11 months all-checked by default ("All months", 478 tx). Clear → "0 months · 0 transactions" / $0. One month (2025-10) → "2025-10 · 4 transactions", spending $1,701.02. Two months (2025-09+10) → "2 months · 55 transactions", income $3,311.72 / spending $5,006.43 (correctly > either alone). Select all → back to 478. Row count always matched the heading; summary recomputed per selection. Minor: clearing all shows an empty table with no explicit empty-state message (edge case; "Select all" restores). NOT committed (local on `main`, stacked on the 06-25 Refund + modal + 06-24 work, on top of pushed 8108fd2); push only on user signal.

## 2026-06-25 18:08:17 - New "Refund" transaction type + PayPal deposits flagged for review

User hit the second ambiguous-deposit case: "ACH DEPOSIT, PAYPAL TRANSFER ****785060586" imports as income, but it could be a refund for a returned/cancelled purchase. A refund is neither income (would inflate earnings) nor a normal expense (the math sums absolute values, so it would ADD to spending) nor transfer_to_self (would leave spending overstated). Correct accounting: a refund REDUCES spending and never counts as income. So we added a real 5th type with defined math (the sanctioned exception to "no custom types" — custom types are refused only because they'd have no defined money behavior; refund has one).

reports.js:
- `isSpending` now also returns true for `refund` (it participates in spending, negatively).
- New exported `spendingDelta(transaction, includeSelfTransfers)` = signed contribution to spending: expense/transfer_to_other → +magnitude, refund → −magnitude, self → +magnitude only when included, income/else → 0. This is the single source of the refund sign.
- `calculateMonthlySummary` (and therefore `calculateMonthlyTrend`, which calls it), `calculateCategorySpending`/`rankCategorySpending`, and `calculateTopMerchants` all now use `spendingDelta` so refunds net against total spending, the category total, and the merchant total. Income is untouched. Net = income − (spending − refunds).
- `TYPE_SORT_ORDER` gains `refund: 2` (income 0, expense 1, refund 2, transfer_to_other 3, transfer_to_self 4).

Parser (tdBankStatementParser.js `classifyTransaction`): inside the Deposits/Electronic Deposits branch, a narration containing `PAYPALTRANSFER` now returns income + confidence "low" + needsReview TRUE (was silently income). Per the user's call: do NOT auto-map PayPal to refund (some may be real income) — flag for review so they pick. `reviewedImportDraft.js` turns needsReview/low-confidence into the "Needs review" row badge + reasons, so it shows in Import Review. Non-PayPal deposits unchanged (still income, medium, not flagged).

Component (FinanceImportScreen.jsx): added `<option value="refund">Refund</option>` to the Ledger edit Type dropdown (between Expense and Transfer to other). Imported `spendingDelta`; the report drill-down modal's spending totals (category, merchant, month) now use a `sumSpending` helper (net of refunds) so they match the cards. NOTE: type editing is Ledger-only — the import review flags the PayPal row but the user sets the actual type (Income vs Refund) in the Ledger after saving.

Tests: reports.test.mjs +3 (spendingDelta values; refund reduces spending & not income; refund nets category+merchant); tdBankStatementParser.test.mjs +1 (PayPal deposit → income/low/needsReview). Build green (3.43s; js bundle index-3cf5a8ca.js). 88 node (was 84) + 5 vitest pass. Live in Chrome: Ledger edit Type dropdown shows Income/Expense/Refund/Transfer to other/Transfer to self; cancelled the edit without saving (refund math itself is unit-tested, not exercised live, to avoid writing a real refund to the Supabase ledger). NOT committed (local on `main`, stacked on the 06-25 modal + 06-24 spinner/A–Z work, on top of pushed 8108fd2); push only on user signal.

NOT done (user scoped it out for now): auto-classifying PayPal as refund (kept as review instead); also offered but not built — making the importer stop silently calling other ambiguous ACH deposits "income". The external-savings transfer auto-classification (transfer_to_self importer rule) is still open too.

## 2026-06-25 17:06:48 - Clickable report drill-down modal

Every Reports section is now clickable and opens a dismissible detail modal (summary + transaction list). User-approved scope (AskUserQuestion): all four cards clickable, content = "Summary + transaction list".

Clickable elements and what each opens:
- Cash summary tiles: Income / Spending / Left over / Self-transfers (Savings rate is NOT clickable — it's a derived %, no transaction list). Income tile → income-type txns; Spending → isSpending txns; Self-transfers → transfer_to_self txns; Left over → income+spending txns with an income/spending/net summary.
- Spending by category bar → that category's spending txns.
- Income vs spending trend row → that month's txns with income/spending/net summary.
- Where the money went: a Top-merchants row → that merchant's spending txns; a Largest-transactions row → that single transaction's detail.

Implementation (FinanceImportScreen.jsx + .css; reports.js + reports.test.mjs):
- Exported `isSpending` and `transactionLabel` from `reports.js` (were private) so the drill-down filters reuse the EXACT income/spending logic the cards use — no divergence. Added 2 unit tests for them.
- New `reportDetail` state holds `{title, subtitle, summary:[{label,value,tone}], transactions:[]}`. Builder helpers (openCategoryDetail / openMerchantDetail / openTransactionDetail / openMonthDetail / openSummaryDetail) filter `reportTransactions` and sort by magnitude desc. Modal renders summary as stat-tiles + a scrollable transaction list (date · category, signed amount).
- Clickability via a shared `clickableProps(onActivate)` helper (role=button, tabIndex 0, click + Enter/Space) applied to existing divs — avoided converting styled divs to <button> to dodge button-default-style conflicts. `.report-clickable` adds cursor/hover(surface-3)/focus-visible outline.
- Dismiss: overlay click, close (X) button, and Escape (useEffect keydown listener while open). Modal has fade/rise entrance animations (disabled under prefers-reduced-motion). role=dialog, aria-modal, aria-label.

Verified: build green (5.74s; bundles index-a3778b7b.css / index-7b41bb5d.js). 84 node (+2 new) + 5 vitest pass (reports.js change was export-only; vitest covers the unrelated supabase driver). Live in Chrome against real data: clicked a category (Housing → 15 txns, $13,200), Income tile (35 txns, $19,598.10), a trend month (2024-12 → income/spending/net, 78 txns), a merchant (1 txn), and a largest transaction (single-tx detail) — all opened correct summaries + lists; Esc, overlay-click, and X all dismissed. Read-only (no writes). NOT committed (local on `main`, stacked on the uncommitted 06-24 spinner + A–Z sort work, on top of pushed 8108fd2); push only on user signal.

OPEN (user deciding): how to handle external-savings transfers that import as income (inflow) / expense (outflow) instead of transfer_to_self — see the 06-25 note in this file / parser at tdBankStatementParser.js classifyTransaction. The new modal makes this easy to spot (the Income drill-down is full of "TD ZELLE RECEIVED" rows). Options given: retype each in the Ledger, or I add narration-pattern auto-classification on import (awaiting the row text).

## 2026-06-24 13:05:38 - Save-in-progress spinner + A–Z category lists

Two small UX fixes (both in `FinanceImportScreen.jsx`, plus a spinner keyframe in `.css`):

1. Save feedback: "Save Selected" felt unresponsive because the Supabase save + reload take a beat with no signal. Added an `isSaving` state — while saving, the button shows an animated spinner (`FaSpinner` + a CSS `finance-spin` keyframe, 0.7s linear infinite) and the label "Saving…", and is disabled (also guards against double-click). Deliberately CSS animation, NOT framer-motion (that dep was removed in the 06-19 cleanup; user said "like motion", meaning animated, not the library). Also wrapped `saveSelectedRows` in try/catch/finally — it previously had no error handling (an unhandled rejection on failure). New `saveError` state renders a `.error-message` banner in the REVIEW panel (right side, next to the button) rather than reusing `errorMessage` (which renders in the left statement panel and would be off where the user is looking). `finally` always clears the spinner.

2. A–Z categories: category lists are now sorted alphabetically by name. Sorted at the data level — `visibleCategories` and `getSelectableCategories` both `.sort((a,b)=>a.name.localeCompare(b.name))` on the filtered (new) array, so no mutation of `financeData`. This makes EVERY category dropdown A–Z (the uncategorized-row picker the user asked about, Ledger edit, Subscriptions) plus the Categories tab list, and new categories auto-place in order. The leading "Uncategorized" (empty value) and trailing "+ Add new category…" sentinel are added separately in JSX, so they stay first/last.

Verified: build green (4.94s; bundles index-b216f761.css / index-3f905232.js). 82 node + 5 vitest still pass (no logic changed). Live in Chrome on the dev server (signed in, real data): Categories "available" list is fully A–Z (the lone out-of-order "Parking" is in the separate "retired categories" list); parsed the built-in sample and the uncategorized review-row dropdown reads Uncategorized → [A–Z categories] → + Add new category…; the `.btn-spinner` computed animationName resolves to finance-spin. Did NOT trigger a real save (would write synthetic rows to the live ledger) — discarded the synthetic draft via reload. NOT committed (local on `main`, on top of pushed 8108fd2); push only on user signal.

## 2026-06-22 02:50:08 - Whole app converted to a dark theme

User asked to "change the entire color scheme to dark mode." Done as a permanent dark theme (not a light/dark toggle) that PRESERVES the brand identity — green accent, teal income, coral spending — inverted onto layered dark surfaces. No JSX/logic changes; CSS only (+ one `<meta name="theme-color">` in `index.html`).

How it's structured (this is the maintainable part): all colors now flow from a single `:root` palette of CSS variables defined in `src/index.css` — surfaces (`--bg`, `--surface`, `--surface-2/3`, `--field`), borders, text (`--text`, `--text-strong`, `--text-muted`, `--text-faint`), brand accent (`--accent`, `--accent-text`, `--on-accent`, `--accent-soft`, `--accent-ring`), finance semantics (`--income`, `--spending`), feedback (success/warning/danger/info bg+border+text), and `--shadow-sm/md/lg`. `index.css` also sets `color-scheme: dark` (so native scrollbars/controls render dark) and `html,body { margin:0; background:var(--bg) }` (the old default body margin would have shown a white border in dark mode). `--primary` kept as a legacy alias of `--accent` so the old (dead) modal styles in index.css resolve.

Files rewritten to reference the palette: `src/index.css`, `src/finance/auth/AuthGate.css`, `src/finance/components/FinanceImportScreen.css` (the big one, ~1540 lines — every hardcoded light hex swapped). AuthGate inputs needed explicit `background:var(--field)` (they previously relied on the browser's white default) + a focus state. Form fields use `--field` (#0f1713, slightly darker than cards) for an inset look. Disabled primary button got `color:var(--text-faint)` (white-on-bright-green text would have been invisible once the disabled bg went dark).

A toggle would now be cheap to add (a second variable set under e.g. `[data-theme="light"]`) — flagged to the user as a follow-up; they asked only for dark.

Verified: build green (3.14s, CSS bundle `index-f756ebac.css`). Live in Chrome on the dev server, signed in as the real user — audited computed colors across Import, Reports (cards/stat tiles/category bars/trend), Categories (form inputs + selects), and the month-picker dropdown overlay. A full-DOM scan for any element rendering a light/opaque background returned **0 light surfaces** — no dark-mode misses. Non-destructive (read-only inspection). NOT committed (local on `main`, stacked on top of the still-uncommitted month-picker/trend fix + the "Insights to your cashflow." hero copy change). Push only on user signal.

## 2026-06-22 02:20:22 - Reports: month picker + trend chart made to scale to 24+ months

User flagged that the horizontal month layout won't work at 24 months. Two fixes (chosen: dropdown checklist):
- Month picker: replaced the horizontal chip row with a compact dropdown checklist — a native `<details>`/`<summary>` trigger showing "Months · <scope>" + a chevron, opening an absolutely-positioned panel with "Select all"/"Clear" and month checkboxes grouped by year (`reportMonthsByYear`), scrollable (max-height 260px). No new React state (details handles open/close). `setReportMonths(null)`=all, `[]`=clear, `toggleReportMonth` per checkbox. Removed all `.month-chip*` CSS.
- Trend chart: replaced the horizontal grouped bars with a VERTICAL list (`.trend-list`, max-height 360px, scrolls) — one row per month: label + two thin horizontal bars (income teal, spending coral) each with its amount. Scales to any month count. Removed `.trend-chart/.trend-col/.trend-bars/.trend-bar` CSS.

Added `FaChevronDown` import. No data-helper changes (calculateMonthlyTrend unchanged), so the 82/5 tests still pass; build green (8.28s). Live-verified on dev server (8 months of real data): dropdown opens, year groups (2024/2025), 8 checkboxes, uncheck→"7 months"+7 trend rows, Clear→empty state, Select all→All months; trend list renders 8 vertical rows; no console errors. (Chrome screenshot tool hit a CDP clip.scale param bug — verified via DOM reads instead.) NOT committed (local on `main`, on top of the pushed b428733).

## 2026-06-21 22:22:23 - Reports page rebuilt: multi-month picker + 4 report cards (polished design)

User wanted (1) to select any number of months in Reports, then (2) several reports instead of the single cashflow view, and (3) a less-basic design. Approved an inline mockup (teal income / coral spending, card layout) before building.

The Reports page now has its OWN month selection (independent of the Ledger's `selectedMonth`), driven by a row of toggle chips: "All months", "Clear", and one chip per month. State `reportMonths` is null=all, else an explicit `["YYYY-MM"]` list; `effectiveReportMonths = reportMonths ?? monthOptions`. Empty selection → "Pick at least one month" empty state. Scope label shows "All months" / a single month / "N months".

Four report cards, all filtered to the picked months and respecting the Include-self-transfers toggle consistently:
- Cash summary — income, spending, left over (net), self-transfers, savings rate (net/income, "—" when income is 0).
- Spending by category — `rankCategorySpending` rows with $ + share % + a coral bar.
- Income vs spending by month — CSS grouped bars (teal income, coral spending) per selected month via `calculateMonthlyTrend`.
- Where the money went — `calculateTopMerchants` + `getLargestTransactions` (largest by magnitude, signed colour).

New pure helpers in `reports.js` (all tested): `filterTransactionsByMonths`, `rankCategorySpending`, `calculateTopMerchants`, `getLargestTransactions`, `calculateMonthlyTrend`, plus `calculateCategorySpending` gained an `includeSelfTransfers` option (backward compatible). Removed the old single-report JSX, the `getBarHeight` helper, and the Reports "Upcoming subscriptions" panel (it lives on the Subscriptions tab; flagged to the user). "Spending" = expense + transfer_to_other (+ transfer_to_self only when the toggle is on).

DATA NOTE: with the real ledger (332 tx, all months) spending shows ~$25.5k vs income ~$9.3k → savings rate -173%, because transfers-to-others (many $1,000 Zelle-sent rows) count as spending. Correct per the definition; flagged to the user in case they want transfers-to-others split out of "spending" later.

Verified: 82 node tests (incl. 6 new report-helper tests) + 5 vitest pass, build green (4.74s). Live on dev server against real data: all 4 cards render, chips toggle (all/clear/single/multi), empty state + scope label work, no console errors. Non-destructive (read-only views). NOT committed (local on `main`).

TWO uncommitted features now stacked on `main`: the ledger sort (21:12) and this Reports rebuild. Keep them as SEPARATE commits when the user gives the push signal.

## 2026-06-21 21:12:19 - Ledger sort control (5 fields)

Added a "Sort by" dropdown to the Ledger header (next to the month filter). Ledger entries were previously hard-sorted newest-date-first with no user control.

Five sortable fields, each with both directions, grouped via `<optgroup>` so options are self-describing open or closed: Date (Newest/Oldest first), Amount (Largest/Smallest), Name (A–Z/Z–A by merchant||description), Category (A–Z/Z–A, uncategorized always last), Type (Income first / Transfers first — fixed order income→expense→transfer_to_other→transfer_to_self). User asked for type + category on top of the date/amount/name set.

Key decisions: Amount sorts by MAGNITUDE (Math.abs), so a +$2,200 paycheck and a −$800 rent both rank as "big" — confirmed live (a +$1,000 and −$1,000 sat adjacent). Ties fall back to newest-date-first for stability. Default is `date_desc` (unchanged behavior).

Implementation: pure `sortTransactions(transactions, sortOrder, {categoryById})` + `LEDGER_SORT_GROUPS` + `DEFAULT_LEDGER_SORT` in `reports.js`; new `sortOrder` state + the dropdown in `FinanceImportScreen.jsx` (reuses `.month-select` styling, capped 160px, header already wraps). The sort select reuses the existing `.month-select` CSS — no new CSS needed. `categoryById` was moved above `monthTransactions` so the sort can read category names.

Verified: 76 node tests (incl. 7 new sort tests) + 5 vitest pass, build green (7.87s). Live on dev server against the real ledger (now 332 transactions): all five modes reorder correctly — date_desc newest, date_asc oldest, amount_desc by size (sign-agnostic), amount_asc smallest, type_asc income-first. Non-destructive (display-only, no writes). NOT committed (local on `main`); push only on user signal.

## 2026-06-20 04:20:46 - Import Review: saved rows leave the list + prominent save confirmation

Follow-up to the uncategorized-block feature. Problem the user hit: after "Save Selected", every row stayed in the review list, and the only signal a save happened was the auto-switch to the Ledger tab (the old `.save-result` text sat at the panel bottom on a tab the user was instantly navigated away from, so it was effectively invisible).

Changes (all in `FinanceImportScreen.jsx` + `.css`, plus a pure helper + tests in `reviewedImportDraft.js`):
- `saveSelectedRows` now drops the just-saved rows from the draft and keeps the rest (the locked uncategorized rows + any categorized row left unchecked). It no longer auto-switches to the Ledger — it STAYS on Import so the confirmation and leftovers are visible. If nothing remains, the draft is cleared (empty list) but stays on Import.
- New prominent green confirmation banner at the TOP of the review panel (was a small grey line at the bottom): headline + detail + a "View ledger" button (user-initiated tab switch, replacing the old automatic one) + a dismiss "x". Tone is green for success, neutral when only duplicates.
- New pure helper `summarizeReviewedImportSave({createdTransactionCount, duplicateTransactionCount, remainingCount})` returns `{tone, headline, detail}`. Edge cases handled: singular/plural ("1 transaction" / "1 row still needs"), all-duplicates ("No new transactions — that row was / all N rows were already in your ledger"), and it does NOT repeat "Skipped N duplicates" in the detail when nothing new landed (headline already says it). 3 unit tests cover these.

UX was approved via an inline mockup before building. Verified: 69 node tests (incl. 3 new) + 5 vitest pass, build green (4.14s). Live dev-server smoke (non-destructive, no save): new code loads via HMR, lock behavior intact, Save Selected correctly disabled when only uncategorized rows exist, no console errors. NOTE: did NOT exercise a real save against the live Supabase ledger (would write synthetic transactions to the user's real data) — the post-save banner copy is covered by unit tests + the approved mockup. NOT committed (local on `main`); push only on user signal.

## 2026-06-20 02:26:01 - Import Review: highlight uncategorized rows + block them from the ledger

User asked that uncategorized rows in Import Review be easy to spot and never slip into the ledger. Chosen UX (via AskUserQuestion): "lock the row, save the rest" — uncategorized rows are blocked but categorized rows still import.

What was wrong before: after parsing, EVERY row was auto-checked, and "Save Selected" wrote all checked rows — including uncategorized ones. A row could even show a green "Ready" badge while uncategorized, because that badge reflects parser confidence/reconciliation, NOT whether a category is set.

Three changes:
- Highlight: uncategorized rows get an amber left bar + tinted background + a "Pick a category to include" tag. New "Uncategorized: N" metric next to Ready/Review/Selected (amber when > 0). Files: `FinanceImportScreen.jsx`, `FinanceImportScreen.css`.
- Lock: uncategorized row's checkbox is disabled+unchecked; parse now default-selects only categorized rows; `toggleRow` refuses to select an uncategorized row; assigning a category auto-selects the row, clearing it auto-deselects (`updateRowCategory`).
- Safety net (the guarantee): `saveReviewedImport` in `localFinanceStore.js:444` filters out any row with no `categoryId` before writing. This is the single chokepoint shared by BOTH storage backends (IndexedDB + Supabase), so nothing uncategorized can reach the ledger no matter what the UI passes. `rowCount` now reflects the categorized rows actually imported.

Tests: added "reviewed import never writes uncategorized rows to the ledger" to `financeCore.test.mjs`. Also fixed the pre-existing duplicate-count test, which incidentally relied on uncategorized fixtures being saved — gave its rows a `categoryId` (its intent is duplicate counting, unaffected). Verified: 49 node + 5 vitest pass, build green (7.94s, 103 modules).

Live-verified in Chrome on the dev server (signed in as the user, synthetic TD sample — NOT saved, real ledger untouched): 7 parsed rows → 4 auto-categorized via learned rules (checked) + 3 uncategorized (amber left bar, tinted bg, "Pick a category to include" tag, disabled+unchecked checkbox). Metric chip "Uncategorized: 3" rendered amber. Assigning a category to the "TRANSFER TO SAVINGS" row (app already has a "Transfers" category) cleared the highlight, enabled+checked its checkbox, dropped Uncategorized 3→2 and raised Selected 4→5. Discarded the synthetic draft via reload afterward.

NOT committed (local on `main`); push only on user signal.

## 2026-06-19 02:00:26 - Removed the dead 2do (todo) app; repo is now finance-only

The repo was the original `2do` todo app with the finance app built on top; the todo code was never removed. Deleted it all: `src/components/` (17 todo components), `src/contexts/NotificationContext.jsx`, `src/utils/` (9 todo helpers), `src/App.css` (45 files total). Renamed the package `react-todo-app` -> `personal-finance-app`. `src/finance/` was already self-contained (imports nothing from the deleted dirs), so nothing broke.

Removed 21 unused todo-only dependencies: 9 `@tiptap/*`, `lowlight`, `react-speech-kit`, `react-speech-recognition`, `pusher-js`, `socket.io-client`, `framer-motion`, `openai`, `react-markdown`, `date-fns`, `uuid`, `@fortawesome/fontawesome-free`. Kept: react, react-dom, @supabase/supabase-js, pdfjs-dist, react-icons. `npm install` removed 175 packages and resolved cleanly.

Key win: `react-speech-kit` (React 16 peer) was the ERESOLVE cause. With it gone, `npm install` needs NO `--legacy-peer-deps` and NO `.npmrc` — both removed. Vercel will build with default settings. (`npm audit` still reports 9 vulns in remaining transitive deps (pdfjs-dist/vite) — not addressed.)

Verified: build green (18.63s, 103 modules), 70/70 tests pass, app loads signed-in in Chrome with no console errors. Committed locally; needs a push before the Vercel deploy.

Vercel deploy in progress (GitHub auto-deploy chosen): import page reached, framework auto-detected as Vite. Next: push cleanup -> add 2 env vars (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) on the Vercel form -> Deploy -> add the Vercel URL to Supabase Auth URL Configuration (Site URL + Redirect URLs) or magic-link login breaks on the live site.

## 2026-06-17 18:40:49 - Critical fix: Supabase driver was never wired into the UI (data lived in IndexedDB)

The 2026-06-01 migration shipped a half-wired bug. `FinanceImportScreen.jsx:148` called `createFinanceRepository()` with NO driver, so it used the default IndexedDB driver — not Supabase. Auth went through Supabase, but all finance data still read/wrote browser-local IndexedDB (the exact origin-stranding problem the migration was meant to fix). The prior "verified cloud-sourced on :5191" claim below was wrong: it was reading IndexedDB on that origin, and `finance_state` in Supabase was empty (0 rows) the whole time.

Diagnosis this session (signed in as pgtipping1@gmail.com, user `62e945a1-4e6a-4899-bb2c-3f5d65bbb40c`): the app's own data request returned 0 rows; root cause found at `FinanceImportScreen.jsx:148`.

Recovery + fix:
- Re-imported the last backup (`Downloads/recovered-from-5191.json`, 134 tx) into Supabase via the app's own client (upsert -> 201; read-back 200 confirms 1 row / 134 tx). Persistence verified by read-back, not the UI count.
- Wired the Supabase driver: `createFinanceRepository({ driver: createSupabaseStorageDriver({ supabase }) })` at `FinanceImportScreen.jsx:148`.
- Verified live in Chrome on :5173: Ledger shows 134 saved transactions, Income $3,756.40 / Spending $7,505.07, loading from Supabase. Build green (3.81s).
- The Supabase project had auto-paused (free tier; subdomain stopped resolving); user restored it before sign-in.

NOT yet committed (fix is local on `main`). Push only on user signal. Still open: disable new sign-ups in Supabase Auth.

## 2026-06-01 21:12:00 - Supabase migration verified end-to-end (status update)

Login + restore are done: 134 transactions are in Supabase and render in the Ledger (verified live in Chrome while signed in — Ledger shows "134 saved transactions", Income $3,756.40 / Spending $7,505.07). Confirmed cloud-sourced (real Supabase session token for project `eduwsqutcbilieammkdy`; the app reads only the Supabase driver, so the same data shows on any port after login). Fixed a UI regression: the new Restore JSON button overflowed the statement panel and clipped "Clear" — added `flex-wrap` to `.source-actions` and `.panel-heading`. Temporary `:5191` server stopped; canonical dev server is `:5173`. Remaining: disable new sign-ups in Supabase Auth; commit/push when the user signals.

## 2026-06-01 21:04:53 - Storage moving to Supabase (cloud) with magic-link login

The finance app's storage is moving off browser-only IndexedDB onto Supabase (hosted Postgres), behind a login, so data follows the user across devices and dev ports. This reverses the original local-first decision, at the user's explicit request.

Why: IndexedDB is scoped to one exact origin (host + port). The Vite dev port changes between sessions, so 134 saved transactions got stranded under `localhost:5191` and were invisible at `localhost:5173`. Cloud storage removes the port/device dependency.

Shipped this session (code complete; build + both test suites green; login gate verified live in Chrome with no console errors):

- `src/finance/storage/supabaseClient.js` — browser client from VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (throws if missing).
- `src/finance/storage/supabaseFinanceDriver.js` — new storage driver, same `load`/`save` contract as the IndexedDB driver, storing the whole bundle as one JSONB row per user in table `finance_state`; unit-tested with a mocked client.
- `src/finance/auth/AuthGate.jsx` + `useSupabaseAuth.js` — magic-link (passwordless) login gate wrapping the app; Sign out added to the hero.
- `FinanceImportScreen.jsx` — now uses the Supabase driver; added a "Restore JSON" button (uses existing `restoreJsonBackup`); load errors surfaced via a banner.
- `supabase/migrations/0001_create_finance_state.sql` — table + RLS policies (run by the user; confirmed created).
- `.env.example` updated with the two Supabase vars; `vite.config.js` + `package.json` wired for the test runners.

Recovery: the stranded `localhost:5191` IndexedDB (134 transactions, 10 categories, 85 category rules, 2 import batches) was read directly from that origin and exported to `~/Downloads/recovered-from-5191.json` (168 KB).

Pending (user actions): log in via magic link; click Restore JSON and pick `recovered-from-5191.json`; then disable new sign-ups in Supabase Auth (owner-only). Nothing committed or pushed yet (awaiting user signal). Design spec: `docs/superpowers/specs/2026-06-01-supabase-finance-storage-design.md`.

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

Latest pushed commit before this QA pass:

- `7ae5749 feat: add subscription renewals`

Current local uncommitted QA fixes:

- Added category default/custom merge behavior so saving the first custom category no longer hides built-in default categories.
- Updated category edit, hide, and restore operations to persist built-in category changes correctly.
- Adjusted the mobile tab bar so long section labels remain readable by scrolling horizontally instead of being squeezed.
- Added tests for category default/custom merging.
- Moved PDF upload status and upload error messages above the statement text box so they are visible immediately after a real PDF upload.
- Fixed TD statement parsing for real PDF text where `Electronic Payments (continued)` resumes after page boilerplate.
- Prevented page header lines from being attached to the previous transaction after a page break.
- Updated TD Zelle and electronic-payment classification so spaced real statement labels are recognized.
- Fixed TD daily balance summary parsing so balance rows after activity subtotals are not imported as income transactions.
- Fixed repeated TD section reconciliation so duplicate `Deposits` subtotals combine into one matched reconciliation item instead of forcing all rows into review.
- Fixed Import review row layout so warning rows keep date, description, category picker, amount, status, and reasons in assigned positions at narrower browser widths.
- Fixed Import review rows being vertically clipped by the review table when total row heights exceeded the table's `max-height: 490px`: rows are flex children, default `flex-shrink: 1` was shrinking their box height while the grid contents kept natural size, so the warning row's reasons text leaked downward into the reconciliation strip below. Setting `flex-shrink: 0` on `.review-row` makes the review table scroll instead of compressing rows.
- Fixed TD DBCRD/POS transactions losing the merchant tail line (e.g. `EMF K LOVE 800 525 5683 * CA`, `RHODE ISLAND ENE 855 743 1101 * RI`, `WALMART COM 8009256278 800 966 6546 * AR`). The earlier "skip page-header lines after terminal amount" fix was too aggressive — it discarded every plain line that followed an inline amount, including merchant info. Parser now checks the next line: if it matches the merchant signature (`* XX` trailing 2-letter state code), it is appended; if not, it is still skipped (page-break boilerplate behavior preserved).

Current branch state:

- `main` has the pushed subscription renewal commit.
- The QA fixes above are local edits and are not committed yet.

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

## 2026-05-26 19:05:00 - Subscription management verification baseline

Current working tree now includes subscription management and real upcoming renewal display:

- Added Subscriptions tab for creating, editing, and deleting saved subscriptions.
- Saved subscription fields include name, amount, category, cadence, next renewal date, reminder lead time, status, and notes.
- Added repository methods to update and delete subscriptions.
- Reports now displays upcoming renewals from saved subscriptions, including amount, cadence, category, and renewal date.
- Reports falls back safely for older subscription records that may not have cadence, category, or notes.

Verification:

- Finance tests: 35 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.
- Playwright MCP browser smoke test passed against the production `dist` build served from a persistent Node REPL static server at `http://127.0.0.1:5178/`.
- Browser smoke test covered subscription create, Reports renewal display, subscription edit, Reports update, two-click subscription delete, Reports empty state, and zero browser console warnings/errors.

## 2026-05-27 02:00:52 - Full feature QA pass

Full feature QA found and fixed two issues:

- Creating the first custom category caused built-in default categories to disappear from category and subscription dropdowns.
- Mobile workspace tabs squeezed long labels, especially Subscriptions and Categories.

Verification after fixes:

- Finance tests: 37 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.
- Playwright browser QA passed against the production `dist` build served at `http://127.0.0.1:5184/`.
- Browser QA covered TD Bank text import, save to Ledger, month switching, transaction edit, transaction delete confirmation, custom category creation, default category preservation, subscription creation, Reports category spending and upcoming renewal display, CSV export, JSON backup export, saved IndexedDB record counts, and zero browser console warnings/errors.
- Mobile snapshot confirmed the workspace tabs are horizontally scrollable and labels are not squeezed.

## 2026-05-27 22:06:34 - Real PDF upload status placement fix

User-tested real PDF upload and found the status message was present but hidden below the large statement text box.

Current local change:

- PDF upload status and upload error messages now render above the statement text box in the Import tab.
- The upload status uses a live status role so browsers can announce it.

Verification:

- Browser check first reproduced the bug: upload status appeared below the statement text box.
- Finance tests: 37 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.
- Playwright browser check passed against `http://127.0.0.1:5189/`, confirming the extracted-PDF status appears above the statement text box with zero browser console warnings/errors.

## 2026-05-27 22:48:40 - Real TD PDF parsing fix

User supplied the full extracted text from a real TD Bank PDF upload after the parser failed to create correct transaction rows.

Actual layout issue:

- TD puts early electronic payments on page 1.
- A long account-help section interrupts the activity list.
- Later pages resume as `Electronic Payments (continued)`.
- Page headers can appear between transaction rows.

Current local fix:

- Continued activity headers now map back to their base section, such as `Electronic Payments`.
- Completed transaction rows are finalized before page header text can be attached to them.
- One-line rows with the amount on the same line are saved immediately.
- Real spaced labels such as `TD ZELLE SENT`, `TD ZELLE RECEIVED`, and `ELECTRONIC PMT-WEB` are classified correctly.
- Added redacted tests for the real continued-page layout and page-header protection.

Verification:

- Focused TD parser tests: 6 passed.
- Full finance/import tests: 40 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.

## 2026-05-27 22:53:49 - Real TD daily balance summary parsing fix

User re-tested in the app browser and found TD daily balance summary rows were showing as large income transactions with statement boilerplate attached.

Root cause:

- After reading a section `Subtotal`, the parser kept the previous activity section active.
- TD's `DAILY BALANCE SUMMARY` rows look like `MM/DD balance MM/DD balance`, which matched the parser's generic transaction-row pattern.
- Because the active section was still `Deposits`, those balance rows became fake income transactions.

Current local fix:

- `DAILY BALANCE SUMMARY` is now a stop section.
- After a section subtotal is recorded, the parser clears the active activity section.
- Added a redacted parser test matching the screenshot pattern.

Verification:

- Focused TD parser tests: 7 passed.
- Full finance/import tests: 41 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.

## 2026-05-27 23:06:09 - Repeated TD section reconciliation fix

User re-tested in the app browser and still saw duplicate yellow `Deposits` reconciliation boxes and all rows marked for review.

Root cause found in parser tests:

- TD PDF extraction can produce repeated activity sections with the same section name.
- The parser compared the full parsed total for all `Deposits` rows against each individual `Deposits` subtotal.
- That created duplicate `Deposits` reconciliation warnings and made every row look like it needed review.

Current local fix:

- Reconciliation now combines expected subtotals by section name before comparing them to parsed totals.
- Added a redacted test for repeated `Deposits` sections plus a Zelle payment row.

Verification:

- Focused TD parser tests: 8 passed.
- Full finance/import tests: 42 passed.
- Production build passed on rerun with Vite.
- `git diff --check`: passed before this memory update.

Runtime note:

- Direct HTTP check showed `http://127.0.0.1:5189/` is serving the new `dist/index.html` that points to `index-3a4c7423.js`.
- The user's built-in browser screenshot still showed the old behavior, so the visible page was likely still running previously loaded JavaScript until the tab is refreshed.
- User refreshed the built-in browser tab, re-uploaded the real PDF, and confirmed the issue appears fixed.

## 2026-05-27 23:14:00 - Import review row layout fix

User confirmed the real TD PDF parser looked fixed, then found the Import review row layout looked broken for low-confidence payment rows.

Root cause:

- The review row switched to the narrow stacked layout at the built-in browser width.
- The row still relied on automatic CSS grid placement, so rows with category controls, amount, status, and warning reasons could read as visually jumbled.

Current local fix:

- Review row items now use named grid areas for date/select, description/type, category, amount, status, and reasons.
- Narrow layout now explicitly stacks those areas in a predictable order.
- Amounts keep stable width behavior and warning reasons no longer rely on old grid-column placement.

Verification:

- Full finance/import tests: 42 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.
- Direct HTTP check showed port `5189` now serves `index-7e565a4b.js` and `index-54543623.css`.

## 2026-05-28 14:30:00 - Inline category creation from category dropdowns

Adding inline category creation across all four category dropdowns (Import review row, Ledger edit, Subscription create, Subscription edit) so the user can label a transaction with a new category without leaving the review screen and switching to the Categories tab.

Implementation:

- Each `<select>` gets a sentinel `+ Add new category…` option with value `__create__`.
- A shared `handleCategorySelectChange(event, applyId)` helper intercepts the sentinel value, prompts for the new name via `window.prompt`, creates the category via `repository.saveCategory` with `type: "expense"` and the default color, reloads finance data, and calls the per-select `applyId` callback with the new category id.
- If the user cancels the prompt, no `applyId` is called and the controlled select snaps back to its prior value on re-render.
- The new category becomes available in every other category dropdown immediately because `loadFinanceData` refreshes the categories list in component state.

Verification:

- Finance/import tests: 44 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Verified end-to-end in the user's Chrome tab: choosing `+ Add new category…`, typing `Parking`, confirms creation (`cat_…` id) and immediate application to the row.

Outstanding cosmetic note (pre-existing, not blocking): the visible categories list includes both the empty-value `Uncategorized` option and the default `cat_uncategorized` entry, so `Uncategorized` shows up twice. Defer unless the user wants it fixed.

## 2026-05-28 16:00:00 - Month-name tokens stripped from category rule normalizer

User-flagged edge case: subscription descriptions that embed the month name (e.g. `CURSOR USAGE JAN CURSOR COM * NY`) would still fail to match the same merchant in February or March even after the AUT/Zelle-ref strip, because the month abbreviation is part of the merchant text itself.

Current local fix:

- Extended `stripPerTransactionTokens` in `categoryRules.js` with `MONTH_TOKEN_PATTERN` covering 3-letter abbreviations and full names: JAN(UARY), FEB(RUARY), MAR(CH), APR(IL), MAY, JUN(E), JUL(Y), AUG(UST), SEP(TEMBER), OCT(OBER), NOV(EMBER), DEC(EMBER).
- `\b` boundaries ensure words that merely contain a month abbreviation (JUNIOR, MARSHALL, MAYTAG, AUGUSTA) are NOT stripped.
- Like the prior strips, lookup re-normalizes at read time, so existing rules benefit immediately.

Verification:

- Added 2 tests: month-token strip across JAN/FEB/MARCH normalizing to the same string; merchant words containing month abbreviations are preserved.
- Finance/import tests: 54 passed (added 2).
- Vite production build: passed.
- Live verification in user's Chrome tab: 7 simulated Cursor charges with month tokens JAN–JUL all auto-matched the user's existing `cat_subscriptions` Cursor rule.

## 2026-05-28 15:45:00 - Category-rule normalizer strips per-transaction tokens

User saved their first import with full categorization (46 transactions, 42 rules created), then asked whether learned rules will auto-apply on next month's PDF. Inspection showed they would NOT have matched because rule `matchText` baked in per-transaction tokens (TD `AUT 020325` auth code on DBCRD rows, alphanumeric Zelle reference like `503500P0LARU`).

Verified empirically: a rule built from "DBCRD ... AUT 020325 ... EMF K LOVE ..." against next-month text "DBCRD ... AUT 040525 ... EMF K LOVE ..." returned no substring match in either direction → no auto-categorization.

Current local fix:

- Added `stripPerTransactionTokens` step to `normalizeCategoryRuleText` in `categoryRules.js`. It strips:
  - `AUT <token>` patterns (TD POS/DBCRD auth codes)
  - Mixed-alphanumeric tokens ≥ 8 chars containing both letters and digits (Zelle reference codes, generic order/reference IDs)
  - Standalone 6-digit tokens
- Order: uppercase → strip money → `stripPerTransactionTokens` → non-alphanumeric → trim/collapse.
- 11-digit masked card number is preserved (account distinguisher). Phone-digit groups (`800 525 5683`) are preserved (merchant distinguisher). Merchant words are preserved.

Existing 42 saved rules benefit immediately — `findCategoryRuleForTransaction` re-normalizes `matchText` at lookup time, so legacy rules go through the new normalizer on every comparison without needing to be re-saved.

Verification:

- Added `src/finance/__tests__/categoryRules.test.mjs` with 6 tests: AUT stripping, Zelle reference stripping, card-number / phone / merchant preservation, learned-rule match across different AUT, legacy-rule re-normalization, different-merchant non-collision.
- Finance/import tests: 52 passed (added 6).
- Vite production build: passed.
- Live verification in user's Chrome tab against the 42 saved rules: 6 simulated next-month transactions (EMF K LOVE, WALMART COM, RHODE ISLAND ENE, two Zelle sends with different ref codes, MOBILE DEPOSIT) all auto-matched correctly.

## 2026-05-28 15:30:00 - Ledger "All months" default

User reported that the Ledger view "doesn't show all transactions so totals are wrong" and that "Left over doesn't make sense if balance from previous month + income isn't captured." Inspection of the live IndexedDB showed 46 saved transactions from one imported TD statement (period Feb 04 - Mar 03 2025): 38 dated in 2025-02 and 8 dated in 2025-03. The Ledger month picker defaulted to the latest month present (2025-03), so the user only saw 8 of 46 transactions and "Left over" was computed off March alone, ignoring the rest of the statement.

User's mental model: one PDF upload = one bucket (statement / billing cycle), not a per-calendar-month split. Multi-PDF upload is a planned future feature.

Current local fix:

- Added `ALL_MONTHS = "all"` constant in `reports.js`.
- `calculateMonthlySummary` and `calculateCategorySpending` now treat `month === ALL_MONTHS` (or missing) as "aggregate across every transaction."
- `FinanceImportScreen` initializes `selectedMonth` to `ALL_MONTHS` and no longer auto-jumps to the latest calendar month on load. It still falls back to `ALL_MONTHS` if the previously-selected calendar month is no longer in the data.
- Both Ledger and Reports month dropdowns prepend an `All months` option. Drill-down by specific calendar month still works.
- Ledger panel heading now reads `<N> saved transactions` when "All months" is selected; per-month heading is unchanged.
- Reports `h2` shows "All months" when no calendar month is selected.

Verification:

- Added test: `calculateMonthlySummary` aggregates across every transaction when `month === ALL_MONTHS`.
- Added test: `calculateCategorySpending` aggregates across every transaction when `month === ALL_MONTHS`.
- Finance/import tests: 46 passed.
- Vite production build: passed.
- Verified live in the user's Chrome tab after reload: Ledger shows 46 transactions with Income $306, Spending $1,949.22, Left over -$1,643.22; dropdown shows `All months`, `2025-02`, `2025-03`.

Outstanding follow-up (per user): multi-PDF upload support so multiple statements can be combined into one Ledger view.

Follow-up note: user clarified that the per-month split was technically correct (the TD statement is dated by its last entry date, so a "March statement" actually covers most of February plus a few March days). The original Ledger logic was not wrong — but the user is keeping "All months" as the default because it gives the overview they want by default; per-month drill-down is still available in the dropdown.

## 2026-05-28 14:45:00 - Duplicate Uncategorized fix

Removed `["uncategorized", "Uncategorized", "mixed", "#6b7280"]` from `DEFAULT_CATEGORY_DEFINITIONS`. The empty-value option in every category `<select>` already represents "no category" (categoryId = null) and the lookup `categoryById.get(transaction.categoryId)?.name || "Uncategorized"` already falls back to the same label for null. The default `cat_uncategorized` entry was redundant and showed up as a second "Uncategorized" row in dropdowns.

Updated `defaultCategories.test.mjs`:

- Expected names list now stops at "Transfers".
- `categories.length` assertion now 8 (was 9).
- `categories.at(-1).type` is now `"transfer"` (was `"mixed"`).

Verification:

- Finance/import tests: 44 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Verified in the user's Chrome tab after reload: dropdown now shows `Uncategorized` (empty value) → Income → Groceries → Fuel → Shopping → Housing → Utilities → Subscriptions → Transfers → user's custom categories (e.g. Parking) → `+ Add new category…`.

## 2026-05-28 14:00:00 - TD DBCRD merchant tail fix follow-up

The 03:50 fix worked for a multi-line DBCRD pattern (date+code on line 1, VISA+amount on line 2, merchant on line 3) but missed the real format that the production PDF extractor actually produces — the whole transaction is on ONE line, then the merchant is on the next:

```
02/05 DBCRD PUR AP, *****..., AUT 020425 VISA DDA PUR AP 15.00
EMF K LOVE 800 525 5683 * CA
```

Root cause:

- `parseTransactionLine` (date + content + amount on one line) was finalizing the transaction immediately and calling `continue`, so no `pendingRow` existed when the merchant tail line arrived next iteration.
- The merchant line then fell through every branch and was silently dropped.

Current local fix:

- `parseTransactionLine` now creates a `pendingRow` with the amount-bearing line already in its `narrationLines` instead of finalizing the transaction immediately.
- The existing merchant-tail logic (`isMerchantTailLine`, `saturated`) now applies uniformly to both 1-line and multi-line transactions.
- `finalizePendingRow` already finds the LAST amount-like token, so the merchant tail can appear after the amount.

Verification:

- Verified directly in the user's Chrome tab against the real extracted PDF text: all 6 DBCRD rows now show the merchant name (CURSOR USAGE, EMF K LOVE, RHODE ISLAND ENE, US VISA APPLICATION, WORLDREMIT, WALMART COM).
- Updated the redacted "single-line DBCRD" test and the "page-break boilerplate" test to use the real one-line format. Suite still passes.
- Finance/import tests: 44 passed.
- Vite production build: passed.
- `git diff --check`: passed.

## 2026-05-28 03:50:00 - TD DBCRD merchant tail fix (initial attempt)

User re-tested a real TD PDF upload after the Import row UI fix and found the parser was dropping the third line of each DBCRD card transaction — exactly where the merchant name lives (`EMF K LOVE`, `RHODE ISLAND ENE`, `WORLDREMIT`, etc.). All those transactions showed up as identical generic "DBCRD PUR AP, *****..., AUT ... VISA DDA PUR AP" entries, so they could not be categorized.

Root cause:

- TD DBCRD transactions are 3 lines: (1) date + auth code, (2) `VISA DDA PUR AP <amount>`, (3) merchant tail like `EMF K LOVE 800 525 5683 * CA`.
- After the inline amount on line 2, the parser treated the row as terminated and `continue`d past line 3 to protect against page-break headers.
- That discarded the merchant info on every DBCRD row.

Current local fix:

- Added `isMerchantTailLine(line)` matching lines ending with `* XX` (asterisk + 2-letter state code). TD merchant tails always match this signature; page-break boilerplate never does.
- When the pending row has an inline amount and the next line matches the merchant signature, it is appended to the narration and the row is marked saturated. Anything else after that triggers the page-break flush behavior (unchanged).
- `finalizePendingRow` now finds the LAST amount-like token anywhere in the joined narration rather than only at the end, so the merchant tail can sit after the inline amount without breaking amount extraction.

Verification:

- Finance/import tests: 44 passed (added 2 new redacted tests covering merchant-tail capture and page-break preservation).
- Vite production build: passed.
- `git diff --check`: passed.
- Pending: user reload + real PDF re-import in browser to confirm `EMF K LOVE`, `RHODE ISLAND ENE`, `WALMART COM`, etc. now appear in the review row descriptions.

## 2026-05-28 03:27:00 - Import review row vertical overflow fix

User reported the Import review rows still looked broken with overlapping/cut-off content after the previous grid-areas fix.

Root cause found via browser DOM inspection at 1024px width:

- `.review-table` has `max-height: 490px` with `overflow: auto`.
- Rows are flex children with default `flex-shrink: 1`.
- Total natural row heights (~527px) exceeded the cap, so flex compressed each row's BOX height while the grid contents kept their natural size.
- The last "Review" row's warning reasons text rendered ~37px below the row's own bottom and leaked into the reconciliation strip below the table.
- Signature: `offsetHeight: 104, scrollHeight: 141` on the affected row while the parent was at `parentScrollHeight: 527, parentClientHeight: 490`.

Current local fix:

- Added `flex-shrink: 0` to `.review-row` so the table scrolls instead of compressing rows.

Verification:

- Finance tests: 42 passed.
- Production build: passed with Vite.
- `git diff --check`: passed.
- Playwright browser check at viewport widths 1280, 1024, and 700 (mobile) — every `.review-row` has `scrollHeight <= offsetHeight` (no overflow), with zero browser console warnings/errors.


## 2026-05-28 17:30:00 - Duplicate finder added to Ledger

User asked what happens if they save a duplicate-month import and how a find-and-remove tool would catch duplicates the save-time guard already missed. Answer: the save-time guard uses exact fingerprint (source + date + lowercased narration + absolute amount), so a useful dedup tool has to match looser to catch what the guard let through. Built it.

New module `src/finance/duplicateDetection.js`:

- `findSuspectedDuplicateClusters(transactions)` groups transactions by `date + absolute amount + normalized merchant text`, where the merchant text uses the existing `categoryRules` normalizer (already strips per-transaction noise: AUT auth codes, peer-to-peer reference tokens, 6-digit numbers, month words).
- Returns clusters with 2+ members, sorted most-recent first.
- Skips rows whose narration normalizes to empty (cannot anchor a cluster).
- Same merchant + same amount on different dates → not flagged.
- Same merchant + same day at different amounts → not flagged.
- Same merchant + same day + same amount → flagged for human review (this is intentional — two real $7.49 coffees would group; the UI must let the user dismiss).
- `getRemovalIdsForClusters(clusters, removedIdsByCluster)` flattens the per-cluster removal selections into a flat list of transaction IDs.

Repository:

- Added `deleteTransactions(transactionIds)` to `localFinanceStore.js` for bulk removal in one save.

UI (in `FinanceImportScreen.jsx`):

- Added `Find duplicates` button to the Ledger heading next to the month dropdown (disabled when fewer than 2 transactions are saved).
- Added a review panel that opens above the transaction table. Each cluster shows date, money amount, and member count; each row has a checkbox. Default selection: the first row in each cluster stays checked-as-keep, every other row is pre-checked for removal. User can flip any checkbox.
- "Remove selected" calls the bulk delete and reloads finance data.
- Empty-state copy: "No duplicate clusters found across your saved transactions."

Verification:

- New tests in `src/finance/__tests__/duplicateDetection.test.mjs`: 11 cases covering exact duplicates, fingerprint-miss duplicates (narration drift), different merchants, different amounts, different dates, intentional same-merchant-same-day grouping, sort order, blank narration skipping, removal-id flattening, opposite-sign transfers, and peer-to-peer reference drift.
- Finance/import tests: 65 passed (added 11).
- Vite production build: passed.
- Live verification in user's Chrome tab: opened Ledger (134 saved transactions), clicked Find duplicates, panel rendered with the correct empty state "No duplicate clusters found across your saved transactions" — the user has never duplicate-uploaded, so empty is correct. Close button returns to the regular table view.
