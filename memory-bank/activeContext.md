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
