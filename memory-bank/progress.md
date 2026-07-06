# Progress

## 2026-07-06 19:57:15 - Reports averages alongside totals

- Reports view now shows averages next to every total: per-month `avg $X/mo` under the four cash-summary tiles, a new "Avg / transaction" tile, a `· $75/mo avg` segment on category rows, and a per-charge `$18 avg` on merchant rows.
- All math in one tested helper `average(total, count)` (null on 0/absent divisor); new `calculateSpendingTransactionCount`; `rankCategorySpending` gains `monthlyAverage` via a `monthCount` option; `calculateTopMerchants` gains `count` + `average`. Per-month figures divide by the count of selected months (empty months included — the true spend average) and are suppressed at 1 month; per-transaction figures are not month-gated. `includeSelfTransfers` threaded throughout.
- Built via subagent-driven development (7 commits, cf6645c..efab451). Build green; 92 node (+4) + vitest pass. Per-task spec+quality reviews all clean; final opus whole-branch review: ready to merge. Merged to local `main`.
- OPEN: manual Chrome visual check of the rendered Reports tab still pending (magic-link login blocks an autonomous check; numbers are unit-tested, only layout unconfirmed). Not pushed.

## 2026-06-25 19:22:00 - Ledger multi-month selection

- Ledger now supports selecting one, several, or all months via the same dropdown checklist the Reports page uses (replaced the single-month select). State moved from `selectedMonth` to `ledgerMonths` (null = all); summary + transaction list + heading all respect the multi-month scope. Renamed reportMonthsByYear → monthsByYear (shared); added `.month-picker.align-end` so the Ledger panel opens leftward.
- Reuses tested helpers (filterTransactionsByMonths, calculateMonthlySummary); build green; 88 node + 5 vitest pass.
- LIVE CHROME CHECK PENDING — Claude in Chrome integration was disconnected this turn (Playwright barred by user rule). Local on `main`, not committed.

## 2026-06-25 18:08:17 - "Refund" transaction type + PayPal deposits flagged for review

- Added a 5th transaction type, Refund, with defined math: it REDUCES spending (net against its category + merchant + the total) and never counts as income. Fixes refunds for returned/cancelled purchases that previously imported as income.
- New exported spendingDelta() in reports.js is the single source of the refund sign; calculateMonthlySummary/Trend, calculateCategorySpending/rankCategorySpending, and calculateTopMerchants all use it. Refund added to the Ledger edit Type dropdown and TYPE_SORT_ORDER; report-modal spending totals net refunds via sumSpending.
- Parser: PayPal-transfer deposits now flag for review (income + low confidence + needsReview) instead of silently "income", so the user picks income vs refund. User chose review over auto-refund.
- Verified: build green; 88 node (+4) + 5 vitest pass; live Chrome shows the Refund option in the right spot (edit cancelled, no write — refund math is unit-tested). Local on `main` (stacked on uncommitted 06-25 modal + 06-24 work), not committed.

## 2026-06-25 17:06:48 - Clickable report drill-down modal

- Every Reports section now opens a dismissible detail modal on click (summary + transaction list): category bars, the four cash-summary tiles (not savings rate), trend month rows, top-merchant rows, and largest-transaction rows.
- Exported isSpending + transactionLabel from reports.js (with 2 new tests) so drill-down filters reuse the same income/spending logic; new reportDetail state + builder helpers + a shared clickableProps (role=button/Enter/Space) + .report-clickable styling.
- Dismiss via overlay click, X button, or Escape; fade/rise animation (respects reduced-motion); role=dialog/aria-modal.
- Verified: build green; 84 node + 5 vitest pass; live Chrome drill-downs (category, income tile, trend month, merchant, largest tx) all show correct summaries/lists and all dismissal paths work. Local on `main` (stacked on uncommitted 06-24 work), not committed.
- Still open: external-savings transfer mislabeling (income/expense vs transfer_to_self) — user deciding between manual retype vs import auto-classification.

## 2026-06-24 13:05:38 - Save spinner + A–Z category lists

- "Save Selected" now shows an animated spinner ("Saving…", CSS finance-spin keyframe) and is disabled while the Supabase save + reload run, so the in-progress state is visible. Added try/catch/finally around the save (was unhandled) with a save-error banner in the review panel.
- Category lists are sorted A–Z by name at the data level (visibleCategories + getSelectableCategories), so every dropdown (uncategorized-row picker, Ledger edit, Subscriptions) and the Categories tab are alphabetical, and new categories auto-place. "Uncategorized" stays first, "+ Add new category…" stays last.
- Verified: build green; 82 node + 5 vitest pass; live Chrome confirmed the A–Z dropdown order and the spinner animation. Local on `main` (on top of pushed 8108fd2), not committed.

## 2026-06-22 02:50:08 - Whole app switched to a dark theme

- Permanent dark mode (not a toggle) across the entire app, keeping the brand colors (green accent, teal income, coral spending) on layered dark surfaces.
- All colors now come from one `:root` CSS-variable palette in `src/index.css` (surfaces, borders, text tiers, accent set, finance semantics, feedback states, shadows); `color-scheme: dark` + `html,body` dark background/margin reset added. `index.html` got a dark `theme-color`.
- Rewrote `index.css`, `AuthGate.css`, and `FinanceImportScreen.css` to reference the palette; CSS only, no JSX/logic changes.
- Verified: build green; live Chrome audit (signed in) of Import/Reports/Categories + the dropdown overlay, with a full-DOM scan finding 0 stray light surfaces. Local on `main`, not committed (stacked on the uncommitted month-picker/trend fix + hero copy change). Toggle would be a cheap follow-up.

## 2026-06-22 02:20:22 - Reports month picker + trend chart now scale to many months

- Month picker: horizontal chips → compact dropdown checklist (`<details>`), months grouped by year, Select all / Clear, scrollable. Scope label "Months · All months / N months / single".
- Trend chart: horizontal grouped bars → vertical scrollable list (one row per month, income teal + spending coral horizontal bars with amounts). Both handle 24+ months.
- No data-helper changes; 82 node + 5 vitest pass, build green. Live-verified all dropdown interactions + the vertical trend list on the dev server, no console errors. Local on `main` (on top of pushed b428733), not committed.

## 2026-06-21 22:22:23 - Reports page rebuilt (multi-month + 4 cards)

- Reports now has its own multi-month chip picker (independent of the Ledger) with All months / Clear / per-month toggles and an empty state.
- Four cards: Cash summary (with savings rate), Spending by category (ranked + share %), Income vs spending by month (grouped CSS bars), Where the money went (top merchants + largest transactions). Polished card design, teal income / coral spending.
- 6 new pure helpers in reports.js (filterTransactionsByMonths, rankCategorySpending, calculateTopMerchants, getLargestTransactions, calculateMonthlyTrend; calculateCategorySpending gained includeSelfTransfers) with unit tests.
- Removed the old single cashflow report, the getBarHeight helper, and the Reports "Upcoming subscriptions" panel (covered by the Subscriptions tab).
- Verified: 82 node + 5 vitest pass, build green; live-checked all cards + chip interactions against the real 332-tx ledger, no console errors. Local on `main`, not committed. (Ledger sort from 21:12 also still uncommitted — keep as separate commits.)

## 2026-06-21 21:12:19 - Ledger sort control added

- New "Sort by" dropdown in the Ledger header: Date, Amount, Name, Category, Type — each both directions, grouped by `<optgroup>`. Default unchanged (newest first).
- Amount sorts by magnitude (size, sign-agnostic); ties fall back to newest-date-first; uncategorized rows last under Category; Type uses a fixed income→expense→transfer order.
- Pure `sortTransactions` helper + `LEDGER_SORT_GROUPS` in `reports.js` with 7 new unit tests.
- Verified: 76 node + 5 vitest pass, build green; live-checked all five modes against the real 332-transaction ledger (non-destructive). Local on `main`, not committed/pushed.

## 2026-06-20 04:20:46 - Saved rows leave the Import Review list + clear save confirmation

- After "Save Selected", saved rows are removed from the review list; only unsaved rows (locked uncategorized + any unchecked) remain. The app now stays on the Import tab instead of auto-switching to the Ledger.
- Added a prominent green confirmation banner at the top of the review panel (headline + duplicate/leftover detail + "View ledger" button + dismiss). The old grey bottom-of-panel line was invisible because the tab switched away instantly.
- New pure helper `summarizeReviewedImportSave` builds the banner copy with singular/plural + all-duplicates edge cases; 3 unit tests added.
- Verified: 69 node + 5 vitest pass, build green (4.14s), dev-server smoke clean (no real save performed — protects live data). Local on `main`, not committed/pushed.

## 2026-06-20 02:26:01 - Import Review blocks uncategorized rows from the ledger

- Uncategorized rows are now highlighted (amber bar + tag + an "Uncategorized: N" metric) and cannot be saved: their checkbox is disabled, parse default-selects only categorized rows, and assigning/clearing a category syncs the selection.
- Guarantee lives at the storage chokepoint: `saveReviewedImport` (`localFinanceStore.js:444`) filters out any row with no `categoryId` before writing — covers both IndexedDB and Supabase backends. `rowCount` now reflects categorized rows imported.
- Added a safety-net unit test; updated one pre-existing duplicate-count test that incidentally saved uncategorized fixtures (gave it a category). Verified: 49 node + 5 vitest pass, build green (7.94s).
- Live-verified in Chrome (synthetic sample, not saved): 3 uncategorized rows highlighted amber + locked, assigning a category unlocked + auto-selected the row. Local on `main`, not committed/pushed.

## 2026-06-19 02:00:26 - Stripped the dead todo app; runtime deps down to 5

- Deleted all todo code (`src/components`, `src/contexts`, `src/utils`, `src/App.css` = 45 files); renamed package to `personal-finance-app`. `src/finance` was already self-contained, so nothing broke.
- Removed 21 unused deps; `npm install` removed 175 packages and resolved with no peer-dep flag. Dropped the `.npmrc` legacy-peer-deps workaround — no longer needed once `react-speech-kit` (the conflict source) was gone.
- Verified: build green (18.63s), 70/70 tests, app loads clean signed-in in Chrome. Committed locally (not pushed). Prep for the Vercel deploy.

## 2026-06-17 18:40:49 - Fixed unwired Supabase driver; recovered 134 tx into the cloud

- Root cause of "empty ledger": `FinanceImportScreen.jsx:148` created the repository with no driver, so it defaulted to IndexedDB. Supabase `finance_state` was empty (0 rows). Confirmed the committed HEAD still has the bug.
- Recovered data: re-saved the 134-transaction backup to Supabase via the app's client; verified by read-back (1 row, 134 tx), not just the UI count.
- Fix: passed `createSupabaseStorageDriver({ supabase })` into `createFinanceRepository`. Build passes (3.81s). Ledger verified live in Chrome (134 tx; Income $3,756.40 / Spending $7,505.07).
- Supabase project had auto-paused (free tier); user restored it before sign-in. Fix is local, not yet committed.

## 2026-06-01 21:12:00 - Supabase migration verified + Clear-button fix

- User created the Supabase project, ran the `finance_state` RLS migration, and logged in via magic link.
- Restore confirmed: all 134 transactions are in Supabase (Ledger shows "134 saved transactions"; Income $3,756.40, Spending $7,505.07). Verified live in Chrome while signed in (real Supabase session token present).
- Confirmed data is cloud-sourced, not local: the app reads only the Supabase driver, so the same data appears on any port after login.
- Fixed a UI regression from this work: the new Restore JSON button overflowed the statement panel's button row and clipped "Clear". Added `flex-wrap` to `.source-actions` and `.panel-heading`; verified Parse / Upload PDF / Restore JSON / Clear now render without clipping.
- Temporary `:5191` dev server (recovery/verification) stopped; canonical server is `:5173`.

## 2026-06-01 21:04:53 - Supabase cloud storage + magic-link auth (code complete)

- Added a Supabase browser client, a Supabase storage driver (one JSONB row per user, same load/save contract as the IndexedDB driver), and a unit test with a mocked client.
- Added a magic-link login gate (AuthGate + useSupabaseAuth) wrapping the app, plus a Sign out control.
- Switched FinanceImportScreen to the Supabase driver; added a Restore JSON button and a load-error banner.
- Added the `finance_state` table + RLS migration (run by the user; confirmed created).
- Wired `npm test` to run both the legacy node:test `.mjs` suites (65 tests) and the new vitest `.js` suite (5 tests); both green. Production build green.
- Verified the login gate renders live in Chrome (no console errors).
- Recovered the stranded `localhost:5191` data (134 transactions) to `~/Downloads/recovered-from-5191.json` for restore into Supabase.

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

## 2026-05-26 19:05:00 - Subscription management implemented locally

Implemented in the current local working tree:

- Added Subscriptions tab for creating saved subscription renewals.
- Added inline subscription editing for amount, cadence, category, next renewal date, reminder lead time, status, and notes.
- Added two-click subscription delete confirmation.
- Added repository update/delete methods for subscriptions.
- Updated upcoming renewal reports to use real saved subscriptions and show amount, cadence, category, and renewal date.
- Added tests for subscription create/edit/delete and report renewal details.

Verification:

- Finance tests: 35 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Playwright MCP browser smoke test: passed against the production `dist` build served at `http://127.0.0.1:5178/`.
- Browser smoke test confirmed create, report display, edit, report update, delete, report empty state, and zero browser console warnings/errors.

## 2026-05-27 02:00:52 - Full feature QA and category default fix

Tested the current app as a user flow from a fresh local browser origin.

Issues found and fixed:

- Saving the first custom category made built-in default categories disappear from future category lists.
- Mobile workspace tabs squeezed long labels instead of giving each section label enough room.

Implemented:

- Added category merging so built-in defaults stay available alongside saved custom categories.
- Updated category edit/hide/restore so built-in categories can be persisted when the user changes them.
- Added focused tests for category merge behavior.
- Changed mobile workspace tabs to a horizontal scroll layout.

Verification:

- Finance tests: 37 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Playwright browser QA passed against `http://127.0.0.1:5184/`.
- Browser flow covered import, ledger month switching, transaction edit/delete, category creation with defaults preserved, subscription creation, Reports renewal display, CSV export, JSON backup export, stored record counts, desktop/mobile snapshots, and zero browser console warnings/errors.

## 2026-05-27 22:06:34 - PDF upload status placement fixed

User-tested a real TD Bank PDF upload and found the upload status message was technically present but placed below the large statement text box.

Implemented:

- Moved PDF upload status and upload error messages above the statement text box on the Import tab.
- Added live status semantics to the PDF upload status message.

Verification:

- Playwright browser check first reproduced the issue by confirming the upload status was below the statement text box.
- Finance tests: 37 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Playwright browser check confirmed the extracted-PDF status now appears above the statement text box at `http://127.0.0.1:5189/`.
- Browser console warnings/errors: 0.

## 2026-05-27 22:48:40 - Real TD PDF continued-page parsing fixed

User-tested a real TD Bank PDF upload and supplied the extracted text after the parser failed to produce correct rows.

Issues found and fixed:

- The parser did not treat `Electronic Payments (continued)` as the same activity section as `Electronic Payments`.
- A transaction at the end of a page could absorb statement header text from the next page.
- Real statement labels with spaces, such as `TD ZELLE SENT` and `ELECTRONIC PMT-WEB`, were not classified as intended.

Implemented:

- Added continued-section recognition for TD activity headers.
- Finalized complete one-line rows immediately.
- Finalized pending rows once they already end with an amount, so later page headers are ignored instead of appended.
- Added redacted parser tests that match the real TD PDF layout pattern.

Verification:

- Focused TD parser tests: 6 passed.
- Finance tests: 40 passed.
- Vite production build: passed.
- `git diff --check`: passed.

## 2026-05-27 22:53:49 - Real TD daily balance summary false transactions fixed

User re-tested a real TD Bank PDF upload and found the review list contained fake income rows from TD's daily balance summary table.

Issue found and fixed:

- After an activity `Subtotal`, the parser kept the previous section active.
- TD daily balance rows use date and money columns, so they looked like transactions to the parser.
- The parser now stops reading an activity section after its subtotal and treats `DAILY BALANCE SUMMARY` as non-transaction text.

Verification:

- Focused TD parser tests: 7 passed.
- Finance tests: 41 passed.
- Vite production build: passed.
- `git diff --check`: passed.

## 2026-05-27 23:06:09 - Repeated TD section reconciliation fixed

User re-tested a real TD Bank PDF upload and still saw duplicate `Deposits` reconciliation warnings with all rows marked for review.

Issue found and fixed:

- Repeated TD activity sections with the same name were reconciled separately.
- Each duplicate reconciliation item compared the full parsed section total against only one subtotal.
- Reconciliation now combines expected totals for repeated section names before deciding whether the section matched.

Verification:

- Focused TD parser tests: 8 passed.
- Finance tests: 42 passed.
- Vite production build: passed on rerun.
- `git diff --check`: passed before this memory update.

Additional finding:

- Direct HTTP check confirmed port `5189` serves the new built app file.
- The user's visible built-in browser page still showed old parser behavior, likely because the tab had not reloaded the new JavaScript bundle yet.
- User refreshed the built-in browser tab, re-uploaded the real PDF, and confirmed the import now looks fixed.

## 2026-05-28 16:00:00 - Month-name tokens stripped from category rules

Follow-up to the AUT/Zelle-ref strip: extended the normalizer to also strip JAN-DEC tokens (both 3-letter and full names) so subscription descriptions like `CURSOR USAGE JAN` match `CURSOR USAGE FEB` next month. Word-boundary anchoring preserves merchant words that merely contain a month abbreviation (e.g. JUNIOR, MARSHALL, MAYTAG, AUGUSTA).

Verification:

- Added 2 categoryRules tests (cross-month CURSOR equivalence; false-positive guard for embedded month substrings). 54/54 tests passing.
- Vite production build passed.
- Live in user's Chrome tab: 7 simulated CURSOR USAGE charges across JAN–JUL all auto-matched their existing Cursor → cat_subscriptions rule.

## 2026-05-28 15:45:00 - Category-rule normalizer generalizes across imports

User saved their first labeled import (42 rules) and asked whether next month's same-merchant rows would auto-categorize. Empirical check showed no: rule `matchText` carried `AUT 020325` for DBCRD rows and Zelle reference codes like `503500P0LARU`, and the substring-both-ways match failed when next month's auth code or Zelle ref differed.

Implemented:

- `normalizeCategoryRuleText` now passes input through a `stripPerTransactionTokens` step that removes `AUT <token>`, mixed-alphanumeric tokens of 8+ chars containing both letters and digits, and standalone 6-digit tokens.
- Card number (11 digits) and phone-digit groups are preserved so different accounts / different merchants don't collide.
- Re-normalization happens at lookup time, so the existing 42 rules in the user's DB benefit immediately without re-saving.

Verification:

- New `categoryRules.test.mjs` covers AUT stripping, Zelle reference stripping, preservation of card/phone/merchant tokens, learned-rule match across different AUT codes, legacy-rule re-normalization, and different-merchant non-collision (52/52 tests passing overall).
- Vite production build passed.
- Live verification in user's Chrome tab: 6 simulated next-month transactions (EMF K LOVE, WALMART COM, RHODE ISLAND ENE, two Zelle sends, MOBILE DEPOSIT) all auto-matched the user's 42 saved rules.

## 2026-05-28 15:30:00 - Ledger defaults to "All months"

User reported that the Ledger hid most of their imported transactions because it filtered by single calendar month. With one TD statement spanning Feb 04 - Mar 03 2025, 38 transactions fell in 2025-02 and 8 in 2025-03; the picker defaulted to March, so only 8 of 46 were visible and totals were month-scoped.

Implemented:

- New `ALL_MONTHS` constant in `reports.js`.
- `calculateMonthlySummary` and `calculateCategorySpending` aggregate across every transaction when `month === ALL_MONTHS` (or unset).
- `FinanceImportScreen` initial `selectedMonth` is `ALL_MONTHS`; no auto-jump to latest calendar month on load.
- Both Ledger and Reports month dropdowns prepend `All months`. Per-month drill-down still works.
- Ledger panel heading shows `<N> saved transactions` in "All months" mode.

Verification:

- Added 2 tests covering `ALL_MONTHS` aggregation for monthly summary and category spending.
- Finance/import tests: 46 passed.
- Vite production build: passed.
- Verified live in user's Chrome tab: 46 rows visible; Income $306, Spending $1,949.22, Left over -$1,643.22; dropdown lists `All months`, `2025-02`, `2025-03`.

Pending: multi-PDF upload (combine multiple statements into one Ledger).

## 2026-05-28 14:45:00 - Duplicate Uncategorized in dropdowns fixed

Removed the `Uncategorized` entry from `DEFAULT_CATEGORY_DEFINITIONS`. The empty-value option in every category `<select>` is the canonical "no category" choice (categoryId = null) and the UI fallback already labels missing categories as "Uncategorized," so the default `cat_uncategorized` entry was redundant and visibly duplicated in dropdowns.

Updated `defaultCategories.test.mjs` to expect 8 default names (no Uncategorized) and `categories.at(-1).type === "transfer"`.

Verification:

- Finance/import tests: 44 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Verified live in the user's Chrome tab: dropdown shows a single "Uncategorized" at top.

## 2026-05-28 14:30:00 - Inline category creation across all category dropdowns

User-flagged limitation: could not create a new category from the Import review row, so labeling required switching to the Categories tab and losing place in the review.

Implemented:

- Added a `+ Add new category…` sentinel option to every category dropdown (Import review row, Ledger edit, Subscription create, Subscription edit).
- Shared `handleCategorySelectChange` helper prompts for the new name, calls `repository.saveCategory` with sane defaults (`expense`, default color), reloads finance data, and applies the new category id back to the originating select.
- Cancelling the prompt leaves the select unchanged.

Verification:

- Finance/import tests: 44 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Verified end-to-end in the user's Chrome tab: created a `Parking` category from the Import review dropdown and confirmed it appears in subsequent dropdowns.

## 2026-05-28 14:00:00 - TD DBCRD merchant tail captured for real one-line format

User re-tested after the 03:50 fix and reported no change. Inspecting the actual extracted PDF text in the live tab showed the real format is single-line (date + code + amount on one line, merchant on the next) rather than the multi-line shape used in the earlier redacted tests.

Issue found and fixed:

- `parseTransactionLine` was finalizing single-line transactions immediately and `continue`-ing past the next line, so no `pendingRow` existed when the merchant tail arrived.
- Parser now routes single-line transactions through the same `pendingRow` pipeline used for multi-line ones. The existing `isMerchantTailLine` + `saturated` logic then captures the merchant on the following line.

Verification:

- Verified directly in the user's Chrome tab against the actual extracted PDF text: every DBCRD row now carries the merchant name in the description.
- Updated redacted "single-line DBCRD" and "page-break boilerplate" tests to use the real one-line format.
- Finance/import tests: 44 passed.
- Vite production build: passed.
- `git diff --check`: passed.

## 2026-05-28 03:50:00 - TD DBCRD merchant tail captured (initial multi-line fix)

User re-tested a real TD PDF upload after the Import row UI fix and found the parser was throwing away the third line of each DBCRD card transaction — exactly where the merchant name lives.

Issue found and fixed:

- TD DBCRD transactions are 3 lines: date+auth code, `VISA DDA PUR AP <amount>`, merchant tail.
- The earlier "skip page-header lines after terminal amount" guard was dropping every plain line that followed an inline amount, including the merchant tail.
- Parser now appends the next line only when it matches the merchant signature `\*\s+[A-Z]{2}$` (asterisk + 2-letter state code). Page-break boilerplate never matches this, so the protection against header bleed is preserved.
- `finalizePendingRow` now locates the LAST amount-like token anywhere in the joined narration, so the merchant tail can sit after the inline amount without breaking amount extraction.

Verification:

- Focused TD parser tests: 10 passed (added 2 new tests: merchant-tail capture, page-break preservation).
- Finance/import tests: 44 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Browser verification by the user pending (reload + real PDF re-import expected to show merchant names in review descriptions).

## 2026-05-28 03:27:00 - Import review row vertical overflow fixed

User reported the Import review rows still looked broken after the previous grid-areas fix, with content overlapping or cut off.

Issue found and fixed:

- `.review-table` has `max-height: 490px` plus `overflow: auto`, and review rows are flex children with default `flex-shrink: 1`.
- When total row heights exceeded 490px, flex compressed each row's box height while the grid contents kept their natural size.
- The last review row's warning reasons text overflowed the row by ~37px and leaked into the reconciliation strip below the table.
- Setting `flex-shrink: 0` on `.review-row` makes the review table scroll instead of compressing the rows.

Verification:

- Finance tests: 42 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Playwright browser check at viewport widths 1280, 1024, and 700 confirmed every row has `scrollHeight <= offsetHeight` and zero browser console warnings/errors.

## 2026-05-27 23:14:00 - Import review row warning layout fixed

User found the Import review user interface looked broken after the parser fix, especially around low-confidence payment rows.

Issue found and fixed:

- At the built-in browser width, review rows use the narrow stacked layout.
- The layout did not explicitly assign every row element to a place.
- Warning rows with category picker, amount, status pill, and reasons could look jumbled.
- Review rows now use named CSS grid areas in wide and narrow layouts.

Verification:

- Finance tests: 42 passed.
- Vite production build: passed.
- `git diff --check`: passed.
- Direct HTTP check confirmed port `5189` serves the new built JavaScript and CSS files.


## 2026-05-28 17:30:00 - Ledger duplicate finder shipped

Added a Ledger-side duplicate finder to catch duplicate transactions the save-time fingerprint guard missed.

- New module `src/finance/duplicateDetection.js` groups transactions by date + absolute amount + normalized merchant text and returns clusters with 2+ members, sorted most-recent first.
- The normalizer used by clustering is the same one used by `categoryRules`, so per-transaction noise (AUT auth codes, peer-to-peer reference tokens, 6-digit numbers, month words) is stripped before matching. This is exactly what lets the tool catch duplicates that drifted past the exact-fingerprint guard.
- Added `deleteTransactions(ids)` bulk delete to `localFinanceStore.js`.
- Added a `Find duplicates` button to the Ledger heading and a review panel that opens above the transaction table. Each cluster shows date, amount, and member count; every row past the first is pre-selected for removal; user can flip any checkbox before confirming.
- Added 11 new tests in `src/finance/__tests__/duplicateDetection.test.mjs` covering exact duplicates, narration-drift duplicates, different-merchant non-grouping, different-amount non-grouping, different-date non-grouping, intentional same-merchant-same-day grouping (user dismisses), sort order, blank narration skipping, removal-id flattening, opposite-sign transfer grouping, and peer-to-peer reference drift.

Verification:

- Finance/import tests: 65 passed (54 prior + 11 new).
- Vite production build: passed.
- Live verification in user's Chrome tab against 134 saved transactions: button shows up, panel opens, empty-state copy reads "No duplicate clusters found across your saved transactions", close returns to the table view. The user has never duplicate-uploaded, so empty is the correct result.
