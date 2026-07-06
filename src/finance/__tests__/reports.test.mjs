import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ALL_MONTHS,
  DEFAULT_LEDGER_SORT,
  average,
  calculateCategorySpending,
  calculateMonthlyCashflow,
  calculateMonthlySummary,
  calculateMonthlyTrend,
  calculateSpendingTransactionCount,
  calculateTopMerchants,
  filterTransactionsByMonths,
  getLargestTransactions,
  getUpcomingSubscriptions,
  isSpending,
  rankCategorySpending,
  sortTransactions,
  spendingDelta,
  transactionLabel,
} from "../reports.js";

const transactions = [
  {
    date: "2025-01-02",
    amount: -42.91,
    type: "expense",
    categoryId: "cat_groceries",
  },
  {
    date: "2025-01-03",
    amount: -75,
    type: "transfer_to_other",
    categoryId: "cat_transfers",
  },
  {
    date: "2025-01-04",
    amount: -300,
    type: "transfer_to_self",
    categoryId: "cat_transfers",
  },
  {
    date: "2025-02-01",
    amount: 2500,
    type: "income",
    categoryId: "cat_income",
  },
];

test("category spending excludes self transfers by default", () => {
  assert.deepEqual(calculateCategorySpending(transactions, { month: "2025-01" }), {
    cat_groceries: 42.91,
    cat_transfers: 75,
  });
});

test("category spending aggregates across all months when month is ALL_MONTHS", () => {
  assert.deepEqual(calculateCategorySpending(transactions, { month: ALL_MONTHS }), {
    cat_groceries: 42.91,
    cat_transfers: 75,
  });
});

test("monthly summary aggregates across all months when month is ALL_MONTHS", () => {
  const summary = calculateMonthlySummary(transactions, { month: ALL_MONTHS });

  assert.equal(summary.income, 2500);
  assert.equal(summary.expenses, 117.91);
  assert.equal(summary.selfTransfers, 300);
  assert.equal(summary.net, 2500 - 117.91);
});

test("monthly cashflow returns sorted month summaries", () => {
  const cashflow = calculateMonthlyCashflow(transactions);

  assert.deepEqual(cashflow, [
    {
      month: "2025-01",
      income: 0,
      expenses: 117.91,
      selfTransfers: 300,
      net: -117.91,
    },
    {
      month: "2025-02",
      income: 2500,
      expenses: 0,
      selfTransfers: 0,
      net: 2500,
    },
  ]);
});

test("upcoming subscriptions are sorted by renewal date and reminder window", () => {
  const subscriptions = [
    {
      id: "sub_later",
      name: "Cloud Storage",
      amount: 9.99,
      nextRenewalDate: "2025-02-20",
      reminderDaysBefore: 5,
      status: "active",
    },
    {
      id: "sub_due",
      name: "Music",
      amount: 12.99,
      nextRenewalDate: "2025-02-10",
      reminderDaysBefore: 7,
      status: "active",
    },
    {
      id: "sub_cancelled",
      name: "Cancelled",
      amount: 5,
      nextRenewalDate: "2025-02-05",
      reminderDaysBefore: 7,
      status: "cancelled",
    },
  ];

  const upcoming = getUpcomingSubscriptions(subscriptions, {
    today: "2025-02-04",
    daysAhead: 14,
  });

  assert.deepEqual(upcoming, [
    {
      id: "sub_due",
      name: "Music",
      amount: 12.99,
      cadence: "monthly",
      categoryId: null,
      nextRenewalDate: "2025-02-10",
      daysUntilRenewal: 6,
      isInReminderWindow: true,
      notes: "",
    },
  ]);
});

test("upcoming subscriptions keep saved amount, cadence, category, and notes for reports", () => {
  const subscriptions = [
    {
      id: "sub_insurance",
      name: "Insurance",
      categoryId: "cat_insurance",
      amount: 128.44,
      cadence: "monthly",
      nextRenewalDate: "2026-06-01",
      reminderDaysBefore: 10,
      status: "active",
      notes: "Auto draft",
    },
  ];

  const upcoming = getUpcomingSubscriptions(subscriptions, {
    today: "2026-05-26",
    daysAhead: 30,
  });

  assert.deepEqual(upcoming, [
    {
      id: "sub_insurance",
      name: "Insurance",
      amount: 128.44,
      cadence: "monthly",
      categoryId: "cat_insurance",
      nextRenewalDate: "2026-06-01",
      daysUntilRenewal: 6,
      isInReminderWindow: true,
      notes: "Auto draft",
    },
  ]);
});

const sortRows = [
  {
    date: "2025-01-01",
    amount: -10,
    type: "expense",
    merchant: "Walmart",
    categoryId: "cat_z",
  },
  {
    date: "2025-03-01",
    amount: 2500,
    type: "income",
    merchant: "Acme Payroll",
    categoryId: "cat_a",
  },
  {
    date: "2025-02-01",
    amount: -800,
    type: "transfer_to_other",
    merchant: "Bob",
    categoryId: null,
  },
];

const sortCategoryById = new Map([
  ["cat_a", { id: "cat_a", name: "Apple" }],
  ["cat_z", { id: "cat_z", name: "Zebra" }],
]);

const merchantsFor = (order) =>
  sortTransactions(sortRows, order, { categoryById: sortCategoryById }).map(
    (transaction) => transaction.merchant
  );

test("default sort is newest date first", () => {
  assert.equal(DEFAULT_LEDGER_SORT, "date_desc");
  assert.deepEqual(merchantsFor("date_desc"), ["Acme Payroll", "Bob", "Walmart"]);
});

test("date sort flips to oldest first", () => {
  assert.deepEqual(merchantsFor("date_asc"), ["Walmart", "Bob", "Acme Payroll"]);
});

test("amount sort ranks by size, ignoring income/expense sign", () => {
  assert.deepEqual(merchantsFor("amount_desc"), ["Acme Payroll", "Bob", "Walmart"]);
  assert.deepEqual(merchantsFor("amount_asc"), ["Walmart", "Bob", "Acme Payroll"]);
});

test("name sort orders by merchant alphabetically", () => {
  assert.deepEqual(merchantsFor("name_asc"), ["Acme Payroll", "Bob", "Walmart"]);
  assert.deepEqual(merchantsFor("name_desc"), ["Walmart", "Bob", "Acme Payroll"]);
});

test("type sort groups income before expense before transfers", () => {
  assert.deepEqual(merchantsFor("type_asc"), ["Acme Payroll", "Walmart", "Bob"]);
  assert.deepEqual(merchantsFor("type_desc"), ["Bob", "Walmart", "Acme Payroll"]);
});

test("category sort uses category names and pushes uncategorized to the end", () => {
  // Apple (cat_a) then Zebra (cat_z), then Bob (no category) last.
  assert.deepEqual(merchantsFor("category_asc"), ["Acme Payroll", "Walmart", "Bob"]);
  // Reversed names keep uncategorized last regardless of direction.
  assert.deepEqual(merchantsFor("category_desc"), ["Walmart", "Acme Payroll", "Bob"]);
});

test("sortTransactions does not mutate the input array", () => {
  const original = [...sortRows];
  sortTransactions(sortRows, "amount_desc", { categoryById: sortCategoryById });
  assert.deepEqual(sortRows, original);
});

const reportRows = [
  { date: "2025-01-05", amount: -100, type: "expense", merchant: "Walmart", categoryId: "cat_groc" },
  { date: "2025-01-20", amount: -50, type: "expense", merchant: "Walmart", categoryId: "cat_groc" },
  { date: "2025-01-25", amount: -200, type: "transfer_to_other", merchant: "Landlord", categoryId: "cat_rent" },
  { date: "2025-02-10", amount: 3000, type: "income", merchant: "Payroll", categoryId: "cat_income" },
  { date: "2025-02-15", amount: -300, type: "transfer_to_self", merchant: "Savings", categoryId: "cat_savings" },
];

test("filterTransactionsByMonths keeps only the chosen months", () => {
  assert.equal(filterTransactionsByMonths(reportRows, ["2025-01"]).length, 3);
  assert.equal(filterTransactionsByMonths(reportRows, ["2025-01", "2025-02"]).length, 5);
  assert.deepEqual(filterTransactionsByMonths(reportRows, []), []);
});

test("category spending optionally includes self transfers", () => {
  assert.deepEqual(calculateCategorySpending(reportRows, { month: ALL_MONTHS }), {
    cat_groc: 150,
    cat_rent: 200,
  });
  assert.deepEqual(
    calculateCategorySpending(reportRows, {
      month: ALL_MONTHS,
      includeSelfTransfers: true,
    }),
    { cat_groc: 150, cat_rent: 200, cat_savings: 300 }
  );
});

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

test("ranked category spending sorts by total with a share of the whole", () => {
  const ranked = rankCategorySpending(reportRows, { month: ALL_MONTHS });

  assert.deepEqual(
    ranked.map((entry) => entry.categoryId),
    ["cat_rent", "cat_groc"]
  );
  assert.equal(ranked[0].total, 200);
  assert.equal(Math.round(ranked[0].share * 100), 57);
  assert.equal(Math.round(ranked[1].share * 100), 43);
});

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

test("largest transactions rank by size regardless of sign", () => {
  const largest = getLargestTransactions(reportRows, { limit: 3 });
  assert.deepEqual(
    largest.map((transaction) => transaction.merchant),
    ["Payroll", "Savings", "Landlord"]
  );
});

test("monthly trend reports income and spending per month, oldest first", () => {
  assert.deepEqual(calculateMonthlyTrend(reportRows, ["2025-02", "2025-01"]), [
    { month: "2025-01", income: 0, expenses: 350 },
    { month: "2025-02", income: 3000, expenses: 0 },
  ]);
  assert.deepEqual(
    calculateMonthlyTrend(reportRows, ["2025-02"], { includeSelfTransfers: true }),
    [{ month: "2025-02", income: 3000, expenses: 300 }]
  );
});

test("isSpending counts expenses, transfers-to-others, and refunds, not income or self-transfers", () => {
  assert.equal(isSpending({ type: "expense" }), true);
  assert.equal(isSpending({ type: "transfer_to_other" }), true);
  assert.equal(isSpending({ type: "refund" }), true);
  assert.equal(isSpending({ type: "income" }), false);
  assert.equal(isSpending({ type: "transfer_to_self" }), false);
  assert.equal(isSpending({ type: "transfer_to_self" }, true), true);
});

test("spendingDelta adds expenses, subtracts refunds, ignores income", () => {
  assert.equal(spendingDelta({ type: "expense", amount: -40 }), 40);
  assert.equal(spendingDelta({ type: "transfer_to_other", amount: -75 }), 75);
  assert.equal(spendingDelta({ type: "refund", amount: 30 }), -30);
  assert.equal(spendingDelta({ type: "income", amount: 2500 }), 0);
  assert.equal(spendingDelta({ type: "transfer_to_self", amount: -300 }), 0);
  assert.equal(spendingDelta({ type: "transfer_to_self", amount: -300 }, true), 300);
});

test("a refund reduces spending and never counts as income", () => {
  const rows = [
    { date: "2025-03-01", amount: -100, type: "expense", categoryId: "cat_shopping" },
    { date: "2025-03-05", amount: 30, type: "refund", categoryId: "cat_shopping" },
    { date: "2025-03-08", amount: 2000, type: "income", categoryId: "cat_income" },
  ];
  const summary = calculateMonthlySummary(rows, { month: "2025-03" });
  assert.equal(summary.income, 2000); // refund does not inflate income
  assert.equal(summary.expenses, 70); // 100 spent minus 30 returned
  assert.equal(summary.net, 1930);
});

test("a refund nets against its category and merchant totals", () => {
  const rows = [
    { date: "2025-03-01", amount: -100, type: "expense", categoryId: "cat_shopping", merchant: "Acme" },
    { date: "2025-03-05", amount: 30, type: "refund", categoryId: "cat_shopping", merchant: "Acme" },
  ];
  assert.deepEqual(calculateCategorySpending(rows, { month: "2025-03" }), {
    cat_shopping: 70,
  });
  assert.deepEqual(calculateTopMerchants(rows), [{ merchant: "Acme", total: 70, count: 2, average: 35 }]);
});

test("average divides total by count and guards a zero or missing divisor", () => {
  assert.equal(average(200, 2), 100);
  assert.equal(average(150, 2), 75);
  assert.equal(average(0, 3), 0);
  assert.equal(average(100, 0), null);
  assert.equal(average(100), null);
});

test("transactionLabel prefers merchant, falls back to description, then Unknown", () => {
  assert.equal(
    transactionLabel({ merchant: "Walmart", description: "WALMART STORE 42" }),
    "Walmart"
  );
  assert.equal(transactionLabel({ description: "RENT PAYMENT" }), "RENT PAYMENT");
  assert.equal(transactionLabel({}), "Unknown");
});
