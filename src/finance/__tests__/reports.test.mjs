import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateCategorySpending,
  calculateMonthlyCashflow,
  getUpcomingSubscriptions,
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
