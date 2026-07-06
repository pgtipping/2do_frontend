# Report Averages — Design

Date: 2026-07-06

## Goal

Show averages alongside the existing totals in the Reports view, so a multi-month
report answers "how much per month / per transaction" as well as "how much in total."

## Definitions

The Reports page already spans a chosen set of months (`effectiveReportMonths`).
Averages are computed over that scope.

**Month count** — the number of months the user has selected (`effectiveReportMonths.length`).
Every per-month average divides by this single number, including months in which a given
category had no spending. A zero-spend month is a real `$0` data point, so counting it is
what makes the figure a true monthly spend average: each category's per-month average then
reconciles against the total (all the category `$/mo` figures sum to the overall `$/mo`).

Three averages are introduced:

1. **Per-month** — a total divided by the selected month count.
2. **Per-transaction (overall)** — total spending divided by the number of spending
   transactions in scope.
3. **Per-category / month** — one category's spending total divided by the same selected
   month count (not by the subset of months the category appeared in).

**Self-transfers toggle.** The Reports UI has an `includeSelfTransfers` toggle that already
flows into `reportSummary`, `rankCategorySpending`, and `calculateTopMerchants`
(`FinanceImportScreen.jsx:862-874`). The new `calculateSpendingTransactionCount` helper and
the extended category/merchant outputs must thread `includeSelfTransfers` consistently,
because it changes both the numerators (what counts as spending) and the transaction counts
in the per-transaction denominators. The per-month denominator (month count) does not depend
on the toggle.

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
  the average is that category's total ÷ the selected month count.
- The `· $X/mo avg` segment is shown only when **2 or more months** are selected — the same
  suppression rule as the cash-summary sub-lines, and for the same reason (at one month a
  category's `$/mo` equals its total, so it is noise). The `$450 · 32%` part is unchanged.
  (Top-merchant `· $18 avg` is a per-transaction figure, not per-month, so it is *not*
  gated on month count.)

### Where the money went — Top merchants
- Each merchant row gains a muted `· $18 avg` = that merchant's total ÷ its number of
  spending transactions.

### Out of scope (not changed)
- Drill-down modals keep showing totals only.
- Largest transactions list is unchanged.
- Income-vs-spending trend chart is unchanged.

## Computation layer (`src/finance/reports.js`)

All math is added as pure, exported, unit-tested helpers. No division happens in JSX —
including the Avg / transaction tile, which uses the generic `average` helper below rather
than dividing inline.

- `average(total, count)` → `total / count`, or `null` when `count` is 0 (or absent).
  Callers render nothing on `null`. This single helper backs every quotient in the report:
  the cash-summary per-month sub-lines (`average(total, monthCount)`), the per-category
  per-month figure (`average(categoryTotal, monthCount)`), and the Avg / transaction tile
  (`average(totalSpending, spendingTransactionCount)`). It is intentionally generically
  named, not `perMonthAverage`, because the divisor is sometimes a month count and sometimes
  a transaction count.
- `calculateSpendingTransactionCount(transactions, { month, includeSelfTransfers })` →
  count of spending transactions in scope (the divisor for Avg / transaction). Honors
  `includeSelfTransfers`.
- Extend `rankCategorySpending` to accept an optional `monthCount` and add a
  `monthlyAverage` field to each output row (`average(total, monthCount)`, or `null` when
  `monthCount` is 0/absent). Because the denominator is the same for every category, no
  per-category month tracking is needed — `calculateCategorySpending`'s existing
  `categoryId → total` reduction is untouched. (The UI still gates *display* of the segment
  on `monthCount >= 2`; the helper computes the value regardless.)
- Extend `calculateTopMerchants` output with `count` (number of spending transactions for
  that merchant) and `average` (`average(total, count)`) per merchant.

The UI reads the selected month count once as `effectiveReportMonths.length` and passes it
to `rankCategorySpending` and to the cash-summary sub-lines.

## Edge cases

- Zero months selected → the report already shows its "pick at least one month" empty state,
  so no averages render. Defensively, `average` returns `null` on a 0 denominator.
- One month selected → every per-month figure is suppressed (both the cash-summary sub-lines
  and the per-category `· $X/mo avg`); Avg / transaction and per-merchant averages still
  shown (they are per-transaction, not per-month).
- A category or merchant with a net total of zero or below (e.g. a purchase fully refunded)
  still divides by the month count / its real transaction count; the average renders via
  `formatMoney`, matching the total beside it (may be `$0.00` or negative).

## Testing

Add cases to `src/finance/__tests__/reports.test.mjs`:
- `average` returns a correct non-null quotient for a normal case, and `null` on a zero (or
  absent) denominator — exercised with both a month-count divisor and a transaction-count
  divisor.
- `calculateSpendingTransactionCount` with `includeSelfTransfers` off vs. on (a
  self-transfer flips from excluded to counted).
- `rankCategorySpending` with a `monthCount` exposes correct `monthlyAverage` per row,
  including a category active in only some scope months (its `$/mo` is correctly lower
  because empty months are counted), and returns `null` averages when `monthCount` is
  omitted.
- Merchant rows expose correct per-transaction `average` and `count`.
- Avg / transaction over a mix of expenses and a refund (net numerator, gross count).
- Helpers exercised with `includeSelfTransfers` both off and on.

Manual/UI check during implementation: the 6-tile `cash-summary-grid` reflows cleanly on
narrow and wide viewports.
