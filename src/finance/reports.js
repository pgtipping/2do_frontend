export const ALL_MONTHS = "all";

function getMonthKey(date) {
  return date.slice(0, 7);
}

function absoluteAmount(amount) {
  return Math.abs(Number(amount) || 0);
}

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

function isInMonth(transaction, month) {
  if (!month || month === ALL_MONTHS) {
    return true;
  }
  return getMonthKey(transaction.date) === month;
}

// "Spending" = money leaving for expenses or transfers to others, offset by
// refunds (money returned for a cancelled purchase or returned item). Transfers
// between the user's own accounts only count when includeSelfTransfers is on.
export function isSpending(transaction, includeSelfTransfers = false) {
  const { type } = transaction;
  if (type === "expense" || type === "transfer_to_other" || type === "refund") {
    return true;
  }
  return includeSelfTransfers && type === "transfer_to_self";
}

// A transaction's signed contribution to spending. Expenses and transfers-out
// add to spending; a refund subtracts from it (the money came back); everything
// else contributes nothing.
export function spendingDelta(transaction, includeSelfTransfers = false) {
  if (!isSpending(transaction, includeSelfTransfers)) {
    return 0;
  }
  const magnitude = absoluteAmount(transaction.amount);
  return transaction.type === "refund" ? -magnitude : magnitude;
}

export function transactionLabel(transaction) {
  const label = (transaction.merchant || transaction.description || "").trim();
  return label || "Unknown";
}

// Keeps only transactions whose month is in the given list. An empty list
// selects nothing, so the report shows an empty state rather than guessing.
export function filterTransactionsByMonths(transactions, months) {
  const monthSet = new Set(months || []);
  return transactions.filter((transaction) =>
    monthSet.has(getMonthKey(transaction.date))
  );
}

export function calculateMonthlySummary(
  transactions,
  { month, includeSelfTransfers = false } = {}
) {
  return transactions
    .filter((transaction) => isInMonth(transaction, month))
    .reduce(
      (summary, transaction) => {
        const amount = absoluteAmount(transaction.amount);

        if (transaction.type === "income") {
          summary.income += amount;
        }

        // Expenses + transfers-out add, refunds subtract (see spendingDelta).
        summary.expenses += spendingDelta(transaction, includeSelfTransfers);

        if (transaction.type === "transfer_to_self") {
          summary.selfTransfers += amount;
        }

        summary.net = summary.income - summary.expenses;
        return summary;
      },
      {
        month,
        income: 0,
        expenses: 0,
        selfTransfers: 0,
        net: 0,
      }
    );
}

export function calculateCategorySpending(
  transactions,
  { month, includeSelfTransfers = false } = {}
) {
  return transactions
    .filter((transaction) => isInMonth(transaction, month))
    .filter((transaction) => isSpending(transaction, includeSelfTransfers))
    .reduce((totals, transaction) => {
      const categoryId = transaction.categoryId || "uncategorized";
      totals[categoryId] =
        (totals[categoryId] || 0) + spendingDelta(transaction, includeSelfTransfers);
      return totals;
    }, {});
}

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

// Ranks categories biggest-first and adds each one's share of total spending.
export function rankCategorySpending(transactions, options = {}) {
  const totals = calculateCategorySpending(transactions, options);
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);

  return Object.entries(totals)
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      share: grandTotal > 0 ? total / grandTotal : 0,
    }))
    .sort((first, second) => second.total - first.total);
}

// Totals spending per merchant and returns the biggest `limit` of them.
export function calculateTopMerchants(
  transactions,
  { includeSelfTransfers = false, limit = 6 } = {}
) {
  const totals = new Map();

  transactions
    .filter((transaction) => isSpending(transaction, includeSelfTransfers))
    .forEach((transaction) => {
      const label = transactionLabel(transaction);
      totals.set(
        label,
        (totals.get(label) || 0) + spendingDelta(transaction, includeSelfTransfers)
      );
    });

  return Array.from(totals.entries())
    .map(([merchant, total]) => ({ merchant, total }))
    .sort(
      (first, second) =>
        second.total - first.total || first.merchant.localeCompare(second.merchant)
    )
    .slice(0, limit);
}

// The `limit` largest individual transactions by size, regardless of sign.
export function getLargestTransactions(transactions, { limit = 6 } = {}) {
  return sortTransactions(transactions, "amount_desc").slice(0, limit);
}

// Per-month income and spending across the given months, oldest month first.
export function calculateMonthlyTrend(
  transactions,
  months,
  { includeSelfTransfers = false } = {}
) {
  return Array.from(new Set(months || []))
    .sort()
    .map((month) => {
      const summary = calculateMonthlySummary(transactions, {
        month,
        includeSelfTransfers,
      });
      return { month, income: summary.income, expenses: summary.expenses };
    });
}

export function calculateMonthlyCashflow(transactions) {
  const months = Array.from(
    new Set(transactions.map((transaction) => getMonthKey(transaction.date)))
  ).sort();

  return months.map((month) => calculateMonthlySummary(transactions, { month }));
}

function daysBetween(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T00:00:00.000`);

  return Math.round((end - start) / millisecondsPerDay);
}

export const DEFAULT_LEDGER_SORT = "date_desc";

// Drives the ledger "Sort by" dropdown. Grouped by field so each choice is
// self-describing when the menu is open and when it is closed.
export const LEDGER_SORT_GROUPS = [
  {
    label: "Date",
    options: [
      { value: "date_desc", label: "Newest first" },
      { value: "date_asc", label: "Oldest first" },
    ],
  },
  {
    label: "Amount",
    options: [
      { value: "amount_desc", label: "Largest amount" },
      { value: "amount_asc", label: "Smallest amount" },
    ],
  },
  {
    label: "Name",
    options: [
      { value: "name_asc", label: "Name A–Z" },
      { value: "name_desc", label: "Name Z–A" },
    ],
  },
  {
    label: "Category",
    options: [
      { value: "category_asc", label: "Category A–Z" },
      { value: "category_desc", label: "Category Z–A" },
    ],
  },
  {
    label: "Type",
    options: [
      { value: "type_asc", label: "Income first" },
      { value: "type_desc", label: "Transfers first" },
    ],
  },
];

const TYPE_SORT_ORDER = {
  income: 0,
  expense: 1,
  refund: 2,
  transfer_to_other: 3,
  transfer_to_self: 4,
};

function transactionNameKey(transaction) {
  return (transaction.merchant || transaction.description || "").toLowerCase();
}

// Sorts a copy of the transactions by a "<field>_<direction>" key. Ties always
// fall back to newest-date-first so the order is stable. Amount sorts by size
// (magnitude), and uncategorized rows sort to the end under "category".
export function sortTransactions(
  transactions,
  sortOrder = DEFAULT_LEDGER_SORT,
  { categoryById } = {}
) {
  const [field, direction] = String(sortOrder).split("_");
  const dir = direction === "asc" ? 1 : -1;

  const categoryName = (transaction) => {
    const category = categoryById?.get?.(transaction.categoryId);
    return category?.name ? category.name.toLowerCase() : null;
  };

  return [...transactions].sort((first, second) => {
    let primary = 0;

    if (field === "amount") {
      primary = (absoluteAmount(first.amount) - absoluteAmount(second.amount)) * dir;
    } else if (field === "name") {
      primary =
        transactionNameKey(first).localeCompare(transactionNameKey(second)) * dir;
    } else if (field === "category") {
      const firstName = categoryName(first);
      const secondName = categoryName(second);

      if (firstName === null && secondName !== null) {
        return 1;
      }
      if (secondName === null && firstName !== null) {
        return -1;
      }
      if (firstName !== null && secondName !== null) {
        primary = firstName.localeCompare(secondName) * dir;
      }
    } else if (field === "type") {
      const firstOrder = TYPE_SORT_ORDER[first.type] ?? 99;
      const secondOrder = TYPE_SORT_ORDER[second.type] ?? 99;
      primary = (firstOrder - secondOrder) * dir;
    } else {
      primary = first.date.localeCompare(second.date) * dir;
    }

    if (primary !== 0) {
      return primary;
    }

    const dateTie = second.date.localeCompare(first.date);
    if (dateTie !== 0) {
      return dateTie;
    }

    return transactionNameKey(first).localeCompare(transactionNameKey(second));
  });
}

export function getUpcomingSubscriptions(
  subscriptions,
  { today, daysAhead = 30 } = {}
) {
  return subscriptions
    .filter((subscription) => subscription.status === "active")
    .map((subscription) => ({
      ...subscription,
      daysUntilRenewal: daysBetween(today, subscription.nextRenewalDate),
    }))
    .filter(
      (subscription) =>
        subscription.daysUntilRenewal >= 0 &&
        subscription.daysUntilRenewal <= daysAhead
    )
    .map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      categoryId: subscription.categoryId || null,
      amount: subscription.amount,
      cadence: subscription.cadence || "monthly",
      nextRenewalDate: subscription.nextRenewalDate,
      daysUntilRenewal: subscription.daysUntilRenewal,
      isInReminderWindow:
        subscription.daysUntilRenewal <= subscription.reminderDaysBefore,
      notes: subscription.notes || "",
    }))
    .sort((first, second) =>
      first.nextRenewalDate.localeCompare(second.nextRenewalDate)
    );
}
