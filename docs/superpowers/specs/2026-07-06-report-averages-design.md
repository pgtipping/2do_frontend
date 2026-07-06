# Report Averages — Design

Date: 2026-07-06

## Goal

Show averages alongside the existing totals in the Reports view, so a multi-month
report answers "how much per month / per transaction" as well as "how much in total."

## Definitions

The Reports page already spans a chosen set of months (`effectiveReportMonths`).
Averages are computed over that scope.

**Active month** — a month in scope that contains at least one relevant transaction.

Important nuance (verified in code): the month picker is built only from months that
already contain transactions (`monthOptions`, `FinanceImportScreen.jsx:838`). A user
therefore cannot select an empty month. So at the **period level** the active-month count
always equals the selected-month count — the "divide by active months, not empty months"
rule has no observable effect there. The rule only bites at the **category level**, where
a single category can be absent from some of the scope months. The design keeps the
active-month computation anyway (robust if the picker ever changes) but the payoff is the
per-category denominator.

Three averages are introduced:

1. **Per-month** — a total divided by the number of active months in scope.
2. **Per-transaction (overall)** — total spending divided by the number of spending
   transactions in scope.
3. **Per-category / month** — one category's spending total divided by the number of
   scope months in which that category had at least one spending transaction.

**Self-transfers toggle.** The Reports UI has an `includeSelfTransfers` toggle that already
flows into `reportSummary`, `rankCategorySpending`, and `calculateTopMerchants`
(`FinanceImportScreen.jsx:862-874`). Every new helper — `countActiveMonths`,
`calculateSpendingTransactionCount`, and the extended category/merchant outputs — must
thread `includeSelfTransfers` consistently, because it changes both the numerators
(what counts as spending) and the transaction counts in the denominators.

**Negative / zero averages.** Because refunds subtract from spending totals
(`spendingDelta`), a total — and therefore its average — can be zero or negative (e.g. a
purchase fully refunded in the same scope). Averages reuse the existing `formatMoney`
formatter, so a negative average renders exactly as a negative total already does today
(e.g. `-$5.00`) and zero renders `$0.00`. No special-casing, no suppression: the average
mirrors how the adjacent total already displays.

## Placement

### Cash summary card
- Under each of Income, Spending, Left over, Self-transfers, add a muted sub-line:
  `avg $X/mo`.
- Shown only when **2 or more months** are selected. With one month the per-month
  average equals the total, so it is suppressed as noise.
- Savings rate is unchanged (already a ratio).
- Add one new stat tile **Avg / transaction** = total spending ÷ number of spending
  transactions in scope. Shown whenever there is at least one spending transaction. This
  takes the `cash-summary-grid` from 5 tiles to 6 — verify the grid reflows cleanly at the
  breakpoints during implementation (see Testing).

### Spending by category card
- Each row currently reads `$450 · 32%`. Extend to `$450 · 32% · $75/mo avg`, where
  the average is that category's total ÷ its own active-month count.

### Where the money went — Top merchants
- Each merchant row gains a muted `· $18 avg` = that merchant's total ÷ its number of
  spending transactions.

### Out of scope (not changed)
- Drill-down modals keep showing totals only.
- Largest transactions list is unchanged.
- Income-vs-spending trend chart is unchanged.

## Computation layer (`src/finance/reports.js`)

All math is added as pure, exported, unit-tested helpers. No division happens in JSX.

- `countActiveMonths(transactions)` → number of distinct month keys present in the given
  (already scope-filtered) transactions. Single argument — the transactions are pre-scoped
  by the caller, so no separate `months` list is needed.
- `perMonthAverage(total, activeMonths)` → `total / activeMonths`, or `null` when
  `activeMonths` is 0. Callers render nothing on `null`.
- `calculateSpendingTransactionCount(transactions, { month, includeSelfTransfers })` →
  count of spending transactions in scope (used for Avg / transaction). Honors
  `includeSelfTransfers`.
- **`rankCategorySpending` — real internal change, not a cosmetic extension.** It currently
  delegates to `calculateCategorySpending`, which reduces transactions into a
  `categoryId → total` map and discards the month of each transaction. Per-category active
  months cannot be recovered from that map. The reduce is rewritten to accumulate, per
  category, both the running `total` and a `Set` of month keys seen. Each output row then
  carries `total`, `share`, `activeMonths` (the set's size), and `monthlyAverage`
  (`total / activeMonths`, or `null`). `calculateCategorySpending` keeps its current
  `categoryId → total` shape for any existing callers; the month-tracking lives in
  `rankCategorySpending` (or a shared internal helper it owns).
- Extend `calculateTopMerchants` output with `count` (number of spending transactions for
  that merchant) and `average` (`total / count`) per merchant.

The UI computes the period-level active-month count once via
`countActiveMonths(reportTransactions)` and passes it to the cash-summary sub-lines.

## Edge cases

- Zero active months (no transactions in scope) → all averages are `null`; the report is
  already in its empty/near-empty state, so nothing renders.
- One month selected → per-month sub-lines suppressed; Avg / transaction and per-merchant
  averages still shown (they do not depend on month count).
- A category or merchant with a net total of zero or below (e.g. a purchase fully refunded)
  still divides by its real transaction/month count; the average renders via `formatMoney`,
  matching the total beside it (may be `$0.00` or negative).

## Testing

Add cases to `src/finance/__tests__/reports.test.mjs`:
- `countActiveMonths` counts distinct months and ignores duplicates within a month.
- `perMonthAverage` returns a correct non-null quotient for a normal case, and `null` on a
  zero denominator.
- `calculateSpendingTransactionCount` with `includeSelfTransfers` off vs. on (a
  self-transfer flips from excluded to counted).
- Category rows expose correct `monthlyAverage`, including a category present in only some
  scope months (`activeMonths` < selected-month count) — the core reason per-category
  active months exists.
- Merchant rows expose correct per-transaction `average` and `count`.
- Avg / transaction over a mix of expenses and a refund (net numerator, gross count).
- Each new helper exercised with `includeSelfTransfers` both off and on.

Manual/UI check during implementation: the 6-tile `cash-summary-grid` reflows cleanly on
narrow and wide viewports.
