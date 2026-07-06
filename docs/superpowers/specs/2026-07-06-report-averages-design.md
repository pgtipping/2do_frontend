# Report Averages — Design

Date: 2026-07-06

## Goal

Show averages alongside the existing totals in the Reports view, so a multi-month
report answers "how much per month / per transaction" as well as "how much in total."

## Definitions

The Reports page already spans a chosen set of months (`effectiveReportMonths`).
Averages are computed over that scope.

**Active month** — a month in scope that contains at least one transaction. Averages
divide by active months, never by empty picked months (user decision). If a metric is
category-specific, its denominator is the number of scope months in which that category
had at least one spending transaction.

Three averages are introduced:

1. **Per-month** — a total divided by the number of active months.
2. **Per-transaction (overall)** — total spending divided by the number of spending
   transactions in scope.
3. **Per-category / month** — one category's spending total divided by the number of
   active months for that category.

## Placement

### Cash summary card
- Under each of Income, Spending, Left over, Self-transfers, add a muted sub-line:
  `avg $X/mo`.
- Shown only when **2 or more months** are selected. With one month the per-month
  average equals the total, so it is suppressed as noise.
- Savings rate is unchanged (already a ratio).
- Add one new stat tile **Avg / transaction** = total spending ÷ number of spending
  transactions in scope. Shown whenever there is at least one spending transaction.

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

- `countActiveMonths(transactions, months)` → number of scope months with ≥1 transaction.
- `perMonthAverage(total, activeMonths)` → `total / activeMonths`, or `null` when
  `activeMonths` is 0. Callers render nothing on `null`.
- `calculateSpendingTransactionCount(transactions, { includeSelfTransfers })` → count of
  spending transactions in scope (used for Avg / transaction).
- Extend `rankCategorySpending` output with `activeMonths` and `monthlyAverage` per
  category (average = `total / activeMonths`, or `null`).
- Extend `calculateTopMerchants` output with `count` and `average` (`total / count`) per
  merchant.

The UI computes the period-level active-month count once and passes it to the cash-summary
sub-lines.

## Edge cases

- Zero active months (no transactions in scope) → all averages are `null`; the report is
  already in its empty/near-empty state, so nothing renders.
- One month selected → per-month sub-lines suppressed; Avg / transaction and per-merchant
  averages still shown (they do not depend on month count).
- A category or merchant with a net total of zero (e.g. a purchase fully refunded) still
  divides by its real transaction/month count; the average simply reflects the net.

## Testing

Add cases to `src/finance/__tests__/reports.test.mjs`:
- `countActiveMonths` ignores empty picked months.
- `perMonthAverage` returns `null` on zero denominator.
- Category rows expose correct `monthlyAverage`.
- Merchant rows expose correct per-transaction `average` and `count`.
- Avg / transaction over a mix of expenses and a refund.
