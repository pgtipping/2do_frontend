# Report Averages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show per-month, per-transaction, and per-category monthly averages next to the existing totals in the Reports view.

**Architecture:** All arithmetic lives in pure exported helpers in `src/finance/reports.js` (unit-tested with `node --test`). The Reports UI in `src/finance/components/FinanceImportScreen.jsx` calls those helpers and renders the results — no division in JSX. Every average divides by the number of selected months (`effectiveReportMonths.length`) or, for per-transaction figures, by a spending-transaction count.

**Tech Stack:** React (Vite), plain JS, `node:test` for unit tests, `vitest` for the rest. Money is rendered with the existing `formatMoney` (Intl currency).

## Global Constraints

- Every per-month average divides by the selected month count (`effectiveReportMonths.length`), including months a category had no spending. Never by a per-category subset of months.
- The generic helper `average(total, count)` returns `total / count`, or `null` when `count` is 0 or absent. Callers render nothing on `null`. This one helper backs every quotient.
- `includeSelfTransfers` must thread into `calculateSpendingTransactionCount` and the extended category/merchant outputs (it changes both numerators and per-transaction counts). The per-month denominator does not depend on it.
- Averages reuse `formatMoney`; negative/zero averages render exactly as the adjacent total does — no special-casing, no suppression on sign.
- Per-month figures (cash-summary sub-lines AND per-category `· $X/mo avg`) are shown only when 2 or more months are selected. Per-transaction figures (Avg / transaction tile, per-merchant `· $X avg`) are not gated on month count.
- No emoji in UI. Named exports. Semicolons (Airbnb style).
- Test command: `npm run test:node`. Build command: `npm run build`.

---

### Task 1: `average(total, count)` helper

**Files:**
- Modify: `src/finance/reports.js` (add exported function near the other top-level helpers, e.g. after `absoluteAmount`)
- Test: `src/finance/__tests__/reports.test.mjs`

**Interfaces:**
- Produces: `average(total: number, count: number) => number | null` — `null` when `count` is falsy (0 or `undefined`).

- [ ] **Step 1: Write the failing test**

Add to `src/finance/__tests__/reports.test.mjs` (and add `average` to the existing import block from `../reports.js`):

```js
test("average divides total by count and guards a zero or missing divisor", () => {
  assert.equal(average(200, 2), 100);
  assert.equal(average(150, 2), 75);
  assert.equal(average(0, 3), 0);
  assert.equal(average(100, 0), null);
  assert.equal(average(100), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:node`
Expected: FAIL — `average is not a function` (or `not defined`).

- [ ] **Step 3: Write minimal implementation**

Add to `src/finance/reports.js`:

```js
// Generic average used for every quotient in the reports view: per-month
// figures pass a month count, per-transaction figures pass a transaction
// count. Returns null when there is nothing to divide by so callers can
// render nothing.
export function average(total, count) {
  if (!count) {
    return null;
  }
  return total / count;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:node`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/finance/reports.js src/finance/__tests__/reports.test.mjs
git commit -m "feat: add generic average helper for reports"
```

---

### Task 2: `calculateSpendingTransactionCount` helper

**Files:**
- Modify: `src/finance/reports.js` (add after `calculateCategorySpending`)
- Test: `src/finance/__tests__/reports.test.mjs`

**Interfaces:**
- Consumes: existing `isInMonth`, `isSpending` (module-internal).
- Produces: `calculateSpendingTransactionCount(transactions, { month, includeSelfTransfers }) => number`.

- [ ] **Step 1: Write the failing test**

Add to `reports.test.mjs` (import `calculateSpendingTransactionCount`). Uses the existing `reportRows` fixture (Walmart ×2 expense, Landlord ×1 transfer-to-other, Payroll income, Savings ×1 self-transfer):

```js
test("spending transaction count honors the self-transfer toggle", () => {
  assert.equal(
    calculateSpendingTransactionCount(reportRows, { month: ALL_MONTHS }),
    3
  );
  assert.equal(
    calculateSpendingTransactionCount(reportRows, {
      month: ALL_MONTHS,
      includeSelfTransfers: true,
    }),
    4
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:node`
Expected: FAIL — `calculateSpendingTransactionCount is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/finance/reports.js`:

```js
// How many transactions in scope count as spending (used as the divisor
// for the "average per transaction" figure). Refunds are spending
// transactions too, so they are counted; self-transfers only when the
// toggle is on.
export function calculateSpendingTransactionCount(
  transactions,
  { month, includeSelfTransfers = false } = {}
) {
  return transactions
    .filter((transaction) => isInMonth(transaction, month))
    .filter((transaction) => isSpending(transaction, includeSelfTransfers))
    .length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:node`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/finance/reports.js src/finance/__tests__/reports.test.mjs
git commit -m "feat: count spending transactions for report averages"
```

---

### Task 3: Extend `rankCategorySpending` with a per-month average

**Files:**
- Modify: `src/finance/reports.js` (the existing `rankCategorySpending`, ~lines 104-115)
- Test: `src/finance/__tests__/reports.test.mjs`

**Interfaces:**
- Consumes: `average` (Task 1), existing `calculateCategorySpending`.
- Produces: each row of `rankCategorySpending(transactions, { month, includeSelfTransfers, monthCount })` now also has `monthlyAverage: number | null` (= `average(total, monthCount)`; `null` when `monthCount` is omitted).

- [ ] **Step 1: Write the failing test**

Add to `reports.test.mjs`:

```js
test("ranked category spending adds a per-month average from the month count", () => {
  const ranked = rankCategorySpending(reportRows, {
    month: ALL_MONTHS,
    monthCount: 2,
  });
  // cat_rent 200 total, cat_groc 150 total; both divided by 2 selected months
  // (cat_rent only appears in January but still divides by 2 — empty months count).
  assert.equal(ranked[0].categoryId, "cat_rent");
  assert.equal(ranked[0].monthlyAverage, 100);
  assert.equal(ranked[1].monthlyAverage, 75);
});

test("ranked category spending leaves the average null without a month count", () => {
  const ranked = rankCategorySpending(reportRows, { month: ALL_MONTHS });
  assert.equal(ranked[0].monthlyAverage, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:node`
Expected: FAIL — `monthlyAverage` is `undefined`, not `100`.

- [ ] **Step 3: Write minimal implementation**

Replace `rankCategorySpending` in `src/finance/reports.js` with:

```js
// Ranks categories biggest-first, adds each one's share of total spending,
// and (when a monthCount is given) each one's average spend per selected
// month. The denominator is the same monthCount for every category, so no
// per-category month tracking is needed.
export function rankCategorySpending(transactions, options = {}) {
  const { monthCount } = options;
  const totals = calculateCategorySpending(transactions, options);
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);

  return Object.entries(totals)
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      share: grandTotal > 0 ? total / grandTotal : 0,
      monthlyAverage: average(total, monthCount),
    }))
    .sort((first, second) => second.total - first.total);
}
```

Note: `calculateCategorySpending` ignores the extra `monthCount` key, so passing the whole `options` through is safe.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:node`
Expected: PASS. The existing "ranked category spending sorts by total with a share of the whole" test still passes (it reads `.total`/`.share` only).

- [ ] **Step 5: Commit**

```bash
git add src/finance/reports.js src/finance/__tests__/reports.test.mjs
git commit -m "feat: add per-month average to ranked category spending"
```

---

### Task 4: Extend `calculateTopMerchants` with count and per-transaction average

**Files:**
- Modify: `src/finance/reports.js` (the existing `calculateTopMerchants`, ~lines 118-141)
- Test: `src/finance/__tests__/reports.test.mjs` (UPDATE the existing merchant test — it uses `deepEqual` on the whole object, so new fields must be added to the expected values)

**Interfaces:**
- Consumes: `average` (Task 1), existing `isSpending`, `spendingDelta`, `transactionLabel`.
- Produces: each merchant row now has `{ merchant, total, count, average }`, where `count` is the number of spending transactions for that merchant and `average = average(total, count)`.

- [ ] **Step 1: Update the existing test to expect the new fields (this is the failing test)**

Replace the body of the existing `test("top merchants rank spend by merchant and honor the self-transfer toggle", ...)` in `reports.test.mjs` with:

```js
test("top merchants rank spend by merchant and honor the self-transfer toggle", () => {
  assert.deepEqual(calculateTopMerchants(reportRows), [
    { merchant: "Landlord", total: 200, count: 1, average: 200 },
    { merchant: "Walmart", total: 150, count: 2, average: 75 },
  ]);
  assert.deepEqual(
    calculateTopMerchants(reportRows, { includeSelfTransfers: true, limit: 1 }),
    [{ merchant: "Savings", total: 300, count: 1, average: 300 }]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:node`
Expected: FAIL — actual objects lack `count`/`average` keys.

- [ ] **Step 3: Write minimal implementation**

Replace `calculateTopMerchants` in `src/finance/reports.js` with:

```js
// Totals spending per merchant, plus how many charges made up that total
// and the average charge size, then returns the biggest `limit` of them.
export function calculateTopMerchants(
  transactions,
  { includeSelfTransfers = false, limit = 6 } = {}
) {
  const totals = new Map();
  const counts = new Map();

  transactions
    .filter((transaction) => isSpending(transaction, includeSelfTransfers))
    .forEach((transaction) => {
      const label = transactionLabel(transaction);
      totals.set(
        label,
        (totals.get(label) || 0) + spendingDelta(transaction, includeSelfTransfers)
      );
      counts.set(label, (counts.get(label) || 0) + 1);
    });

  return Array.from(totals.entries())
    .map(([merchant, total]) => ({
      merchant,
      total,
      count: counts.get(merchant),
      average: average(total, counts.get(merchant)),
    }))
    .sort(
      (first, second) =>
        second.total - first.total || first.merchant.localeCompare(second.merchant)
    )
    .slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:node`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/finance/reports.js src/finance/__tests__/reports.test.mjs
git commit -m "feat: add charge count and average to top merchants"
```

---

### Task 5: Cash summary — per-month sub-lines and Avg / transaction tile

**Files:**
- Modify: `src/finance/components/FinanceImportScreen.jsx` (imports ~line 31-44; report derivations ~line 862-876; Cash summary JSX ~line 2375-2412)
- Modify: `src/finance/components/FinanceImportScreen.css` (after `.stat-tile strong`, ~line 1300)

**Interfaces:**
- Consumes: `average`, `calculateSpendingTransactionCount` (Tasks 1-2); existing `reportSummary`, `effectiveReportMonths`, `reportTransactions`, `includeSelfTransfers`, `formatMoney`, `ALL_MONTHS`.
- Produces: derived values `reportMonthCount`, `showMonthlyAverages`, `reportAvgPerTransaction` used by this and later UI tasks.

- [ ] **Step 1: Add the two imports**

In the `from "../reports"` import block (~line 31-44), add:

```js
  average,
  calculateSpendingTransactionCount,
```

(Keep the list alphabetical if the file's block is alphabetical.)

- [ ] **Step 2: Add derived values**

Immediately after the `reportSummary` / `reportSavingsRate` block (~line 867), add:

```js
  const reportMonthCount = effectiveReportMonths.length;
  const showMonthlyAverages = reportMonthCount >= 2;
  const reportSpendingCount = calculateSpendingTransactionCount(reportTransactions, {
    month: ALL_MONTHS,
    includeSelfTransfers,
  });
  const reportAvgPerTransaction = average(reportSummary.expenses, reportSpendingCount);
```

- [ ] **Step 3: Add per-month sub-lines to the four tiles**

In the Cash summary JSX, add a sub-line directly after each tile's `<strong>…</strong>`. For the Income tile:

```jsx
<strong>{formatMoney(reportSummary.income)}</strong>
{showMonthlyAverages ? (
  <small className="stat-average">
    avg {formatMoney(average(reportSummary.income, reportMonthCount))}/mo
  </small>
) : null}
```

Repeat the same pattern for Spending (`reportSummary.expenses`), Left over (`reportSummary.net`), and Self-transfers (`reportSummary.selfTransfers`). Do NOT add one to Savings rate.

- [ ] **Step 4: Add the Avg / transaction tile**

Directly after the Savings rate `stat-tile` closing `</div>` (still inside `cash-summary-grid`), add:

```jsx
{reportAvgPerTransaction !== null ? (
  <div className="stat-tile">
    <span>Avg / transaction</span>
    <strong>{formatMoney(reportAvgPerTransaction)}</strong>
  </div>
) : null}
```

- [ ] **Step 5: Add the sub-line style**

In `FinanceImportScreen.css`, after `.stat-tile strong { … }` (~line 1300), add:

```css
.stat-average {
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 6: Verify the build and the view**

Run: `npm run build`
Expected: builds with zero errors and zero warnings.

Then start the dev server (`npm run dev`) and, using the Claude in Chrome integration (per project memory, not Playwright), open the Reports tab:
- With 2+ months selected: each of Income / Spending / Left over / Self-transfers shows an `avg $X/mo` grey sub-line; an "Avg / transaction" tile appears; the grid still reflows cleanly (it uses `auto-fit minmax(120px,1fr)`, so 6 tiles wrap without overflow) — check a narrow window too.
- With exactly 1 month selected: no `/mo` sub-lines; the Avg / transaction tile still shows.

- [ ] **Step 7: Commit**

```bash
git add src/finance/components/FinanceImportScreen.jsx src/finance/components/FinanceImportScreen.css
git commit -m "feat: show per-month and per-transaction averages in cash summary"
```

---

### Task 6: Spending by category — per-month average segment

**Files:**
- Modify: `src/finance/components/FinanceImportScreen.jsx` (the `reportCategories` call ~line 868-871; the category row `muted-copy` span ~line 2430-2433)

**Interfaces:**
- Consumes: `rankCategorySpending` with `monthCount` (Task 3); `reportMonthCount`, `showMonthlyAverages` (Task 5).

- [ ] **Step 1: Pass the month count into the ranking call**

Change the `reportCategories` derivation to include `monthCount`:

```js
  const reportCategories = rankCategorySpending(reportTransactions, {
    month: ALL_MONTHS,
    includeSelfTransfers,
    monthCount: reportMonthCount,
  });
```

- [ ] **Step 2: Append the average to the category row label**

Replace the category row's muted-copy span (~line 2430) with:

```jsx
<span className="muted-copy">
  {formatMoney(entry.total)} · {Math.round(entry.share * 100)}%
  {showMonthlyAverages && entry.monthlyAverage !== null
    ? ` · ${formatMoney(entry.monthlyAverage)}/mo avg`
    : ""}
</span>
```

- [ ] **Step 3: Verify the build and the view**

Run: `npm run build`
Expected: zero errors, zero warnings.

Via the Claude in Chrome integration on the Reports tab:
- 2+ months: each category row reads `$450 · 32% · $75/mo avg`.
- 1 month: the `· $X/mo avg` segment is gone; `$450 · 32%` remains.

- [ ] **Step 4: Commit**

```bash
git add src/finance/components/FinanceImportScreen.jsx
git commit -m "feat: show per-month average on report category rows"
```

---

### Task 7: Top merchants — per-transaction average segment

**Files:**
- Modify: `src/finance/components/FinanceImportScreen.jsx` (the Top-merchants row ~line 2508-2518)

**Interfaces:**
- Consumes: `calculateTopMerchants` rows with `average` (Task 4); existing `formatMoney`.

- [ ] **Step 1: Add the average under the merchant name**

Replace the Top-merchants row label/value block (~line 2513-2517) with:

```jsx
<span className="label">
  <span>{entry.merchant}</span>
  <small>{formatMoney(entry.average)} avg</small>
</span>
<strong>{formatMoney(entry.total)}</strong>
```

(`report-list-row .label small` is already styled in the CSS — no new style needed.)

- [ ] **Step 2: Verify the build and the view**

Run: `npm run build`
Expected: zero errors, zero warnings.

Via the Claude in Chrome integration on the Reports tab: each Top-merchant row shows the merchant name with a small `$18 avg` under it and the total on the right. Confirm this shows regardless of how many months are selected (it is per-transaction, not per-month).

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:node`
Expected: PASS (all report helper tests green).

- [ ] **Step 4: Commit**

```bash
git add src/finance/components/FinanceImportScreen.jsx
git commit -m "feat: show average charge size on report merchant rows"
```

---

## Notes for the implementer

- The Reports view is one large component (`FinanceImportScreen.jsx`, ~2640 lines). Line numbers above are approximate — locate the anchors by the surrounding JSX class names (`cash-summary-grid`, `category-bar-head`, `money-went-grid`), not by absolute line.
- There are no component/E2E tests in this repo for the Reports view; UI verification is a build pass plus a manual Chrome check (project memory mandates the Claude in Chrome integration over Playwright).
- After Task 7, update the memory-bank (`activeContext.md`, `progress.md`) per the project's task-lifecycle gate before declaring the work complete.
