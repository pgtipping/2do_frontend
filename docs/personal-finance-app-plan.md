# Personal Finance App Discovery and Implementation Plan

This repo is being repurposed from a todo app into a personal finance app. Implementation should begin only after the product direction below is accepted; the goal is to avoid making product and technical decisions before the finance workflow is clear.

## Confirmed product direction

### Primary jobs to solve
- Track spending.
- Budget by category, but without rigid preset categories.
- Plan bills and recurring expenses.

### Data sources
- First import target: TD Bank transaction exports.
- Desired data entry modes:
  - PDF statement import for the first implementation path (TD Bank statement downloads).
  - Bank/card sync as a planned next phase, using storage and schema choices that remain compatible with eventual sync metadata.

### Privacy and storage
- Version one should keep data local-first on device.
- Storage implementation should be bank-sync compatible from day one (IndexedDB-based repository with sync-ready identifiers and metadata fields), even if sync is not enabled in MVP UI.
- No cloud account, hosted backend, or multi-device sync is required in MVP release scope.
- Because local browser storage can be cleared by browser settings, export/backup needs to be treated as an MVP-level feature rather than an afterthought.

### Accounts and money model
- First supported account type: checking.
- Transfers should be classified into two behaviors:
  - transfer to others: treated as spending and included in expense reporting.
  - transfer to self: excluded from expense totals by default but visible via filters/toggles.
- The app should avoid rigid income/expense categories so categories can be created, renamed, hidden, and reorganized by the user.

### Reporting priorities
- Monthly income versus expenses.
- Spending by category.
- Recurring subscriptions.

### Existing todo-app migration
- The todo app can be deleted as part of the finance-app implementation.
- The reminder concept can be reused if useful for recurring subscriptions, especially to warn before a subscription renews so the user can decide whether to cancel or keep it.

### Priority order for implementation tradeoffs
1. Long-term extensibility.
2. Accurate financial model.
3. Good UI.
4. Data privacy and portability.
5. Clean architecture.
6. Fast prototype.

### Current workflow pain point
- NerdWallet was too rigid around expense and income categories, so flexible categorization should be a core design requirement.

## Resolved decisions from feedback

### 1. Storage compatibility for future bank sync
- MVP remains local-first, but storage and schema must be designed for eventual bank sync.
- Use sync-compatible entity IDs, source IDs, and provider metadata fields now to avoid a migration rewrite later.
- PDF statement import remains first implementation target (TD Bank).

### 2. Transfer handling rules
- Transfers to others are counted as spending.
- Transfers to self are excluded from spending totals by default.
- Reporting should allow toggling visibility of self-transfers.
- Categorization should use transfer narration/description when available to auto-suggest categories, with manual override.

### 3. PDF import reliability expectations
- TD Bank provides PDF statements rather than CSV, so import quality depends on statement layout consistency.
- MVP should include a reviewed-import screen (parsed rows + confidence flags) before final save.
- Manual edit/correction after import is required in MVP to handle parser misses safely.

## MVP scope

### In scope
1. Replace the todo app with a personal finance app.
2. Local-first persistence with sync-compatible storage/schema.
3. Import TD Bank PDF statement exports.
4. Manual transaction cleanup after import.
5. Checking-account ledger.
6. Income, expense, and transfer transaction types.
7. Flexible categories:
   - Create custom categories.
   - Rename categories.
   - Hide/archive categories.
   - Assign transactions to categories.
8. Monthly reports:
   - Income versus expenses (including transfer-to-others as spend).
   - Spending by category.
   - Self-transfer visibility toggle (excluded from totals by default).
9. Recurring subscriptions:
   - Track subscription name, category, amount, cadence, next renewal date, and reminder lead time.
   - Surface upcoming renewals before they are due.
10. Export/backup:
   - Export all app data to JSON.
   - Export transactions to CSV.
11. Manual transaction correction/edit flow after PDF import.
12. Responsive, polished UI suitable for regular personal use.

### Out of scope for MVP
- Bank sync UI/credential flows (data model remains sync-ready).
- Credit cards, savings accounts, investment accounts, loans, and net-worth tracking.
- Multi-device sync.
- Authentication.
- Shared household/multi-user budgeting.
- Tax reporting.
- AI categorization.
- Mobile-native packaging.

## Proposed data model

### Account
- `id`
- `name`
- `type`: initially `checking`
- `institution`: initially optional, for example `TD Bank`
- `openingBalance`
- `createdAt`
- `archivedAt`

### Transaction
- `id`
- `accountId`
- `date`
- `description`
- `merchant`
- `amount`
- `type`: `income`, `expense`, `transfer_to_other`, or `transfer_to_self`
- `counterpartyType`: `self`, `external_person`, `external_account`, or `unknown`
- `categoryId`
- `notes`
- `source`: `manual`, `td_bank_pdf`, or future `bank_sync`
- `rawNarration`: original bank narration/description text
- `importFingerprint` to deduplicate imported rows
- `syncMetadata`: reserved object for future provider IDs, cursor state, and sync timestamps
- `createdAt`
- `updatedAt`

### Category
- `id`
- `name`
- `type`: `income`, `expense`, `transfer`, or `mixed`
- `color`
- `sortOrder`
- `archivedAt`

### Subscription
- `id`
- `name`
- `categoryId`
- `amount`
- `cadence`: monthly, yearly, weekly, or custom later
- `nextRenewalDate`
- `reminderDaysBefore`
- `status`: active, paused, or cancelled
- `notes`

### Import batch
- `id`
- `source`: initially `td_bank_pdf`
- `importedAt`
- `fileName`
- `rowCount`
- `createdTransactionCount`
- `duplicateTransactionCount`


## TD Bank PDF extraction contract (from provided sample)

### Statement structure to parse
- Header metadata: statement period, page number, customer reference, and primary account number.
- Confirmed sample header fields available for parsing:
  - `Page: 1 of 6`
  - `Statement Period: Dec 04 2024-Jan 03 2025`
  - `Cust Ref #: xxxxxx8531-630-E-***`
  - `Primary Account #: xxx-xxx8531`
  - `Account #: xxx-xxx8531`
  - `Account Product Label: TD Convenience Checking`
- Account summary block: beginning balance, deposits, electronic deposits, electronic payments, ending balance.
- Daily Account Activity blocks grouped by section:
  - Deposits
  - Electronic Deposits
  - Electronic Payments (including continued pages)
- Transaction row shape in activity sections:
  - `POSTING DATE`
  - `DESCRIPTION` (often wraps to multiple lines)
  - `AMOUNT`
- Section-level subtotal rows such as `Subtotal:` and statement-level non-transaction text that must be ignored.

### Parser rules for this TD format
- Treat transaction descriptions as multiline records until the next line that starts with a valid posting date or a section boundary.
- Ignore informational/legal text sections (e.g., "How to Balance your Account", error-rights notices, finance charge disclosures).
- Ignore summary-only amounts that do not have a posting date.
- Normalize posting dates (`MM/DD`) into full dates using the statement period year boundary from `Dec 04 2024-Jan 03 2025` style headers.
- Preserve raw narration exactly for downstream categorization (`rawNarration`).

### Transfer classification rules for this sample
- `TD ZELLESENT` => classify as `transfer_to_other` and include in spending totals.
- `TD ZELLERECEIVED` => classify as `income` unless user overrides category/type.
- Narrations indicating internal transfer patterns (for example account-to-account/self markers when present in future statements) => classify as `transfer_to_self`, excluded from totals by default.
- All transfer classifications should be user-editable after import.

### Initial categorization heuristics from narration
- `WALMART`, `STOP SHOP`, `QUALITYFUEL`, `AMAZON` patterns map to expense categories (groceries, fuel, shopping) via keyword rules.
- `PAYPALTRANSFER`/`ELECTRONICPMT-WEB` patterns default to uncategorized transfer/payment review state unless a confident merchant category match exists.
- `MOBILE DEPOSIT` and `ACHDEPOSIT` patterns default to income categories.

### Import UX expectations for this PDF format
- Show parsed row count and confidence badges before save.
- Flag rows with wrapped narration ambiguity or uncertain date/amount extraction for manual review.
- Present section/subtotal reconciliation checks: imported transaction sums versus section subtotal lines and account summary totals.

## Implementation plan

### Phase 0: Final confirmation
- Use the provided TD Bank statement sample pattern (Account Summary + Daily Account Activity + section subtotals) as the baseline parser contract, then validate against one additional statement format.
- Finalize transfer classification heuristics for self vs other transfers based on narration/account references.
- Decide whether the initial app should ship with example/demo data or start empty.

### Phase 1: App reset and foundation
- Remove todo-specific screens, APIs, realtime integrations, LLM helpers, and unused dependencies.
- Keep only the React/Vite foundation needed for the finance app.
- Add a finance-oriented folder structure for domain models, storage, imports, reports, and UI components.
- Add IndexedDB-backed local persistence with a versioned schema and migration path that preserves sync-ready metadata fields.

### Phase 2: TD Bank PDF import
- Build a TD Bank PDF statement parser pipeline.
- Preview imported rows before saving, including parse-confidence indicators for review.
- Deduplicate imported transactions using date, description, and amount fingerprints.
- Allow category assignment during or after import.
- Add narration-based category suggestion for transfer-to-other transactions, with manual override.

### Phase 3: Ledger and categories
- Build the checking-account ledger.
- Add filters for month, category, transaction type, and search text.
- Add category management with custom category names and archive behavior.
- Add transaction edit/delete flows.

### Phase 4: Reports
- Build monthly income versus expenses.
- Build spending by category.
- Add a self-transfer visibility toggle for reports while keeping self-transfers excluded from totals by default.
- Make all calculations derive from the transaction model, not from UI state.

### Phase 5: Recurring subscriptions and reminders
- Add subscription CRUD.
- Show upcoming renewals.
- Reuse reminder concepts from the todo app only where they simplify renewal reminders.
- Keep notifications local in the browser for MVP.

### Phase 6: Backup/export and polish
- Add full JSON export/import for backup and restore.
- Add transaction CSV export.
- Improve empty states, responsive layout, and onboarding copy.
- Update README with the final MVP behavior and screenshots.

## Validation plan

### Unit-level checks
- Parse TD Bank PDF statement rows correctly.
- Deduplicate imports correctly.
- Calculate monthly income, expenses, transfer-to-others, and self-transfers correctly under default and toggled views.
- Calculate category spending correctly.
- Calculate upcoming subscription renewals correctly.

### Browser-level checks
- Import a TD Bank PDF statement file.
- Categorize imported transactions.
- Edit and delete a transaction.
- Create a recurring subscription reminder.
- Export and restore JSON backup data.

## Immediate next step

Start implementation using the confirmed decisions above:

1. Build local-first IndexedDB storage with sync-ready schema fields.
2. Implement TD Bank PDF import with transfer classification (to self vs to others).
3. Implement reporting defaults: transfer-to-others included as spend, self-transfers excluded by default but toggleable.
