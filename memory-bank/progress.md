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
