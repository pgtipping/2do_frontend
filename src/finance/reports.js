function getMonthKey(date) {
  return date.slice(0, 7);
}

function absoluteAmount(amount) {
  return Math.abs(Number(amount) || 0);
}

export function calculateMonthlySummary(
  transactions,
  { month, includeSelfTransfers = false } = {}
) {
  return transactions
    .filter((transaction) => getMonthKey(transaction.date) === month)
    .reduce(
      (summary, transaction) => {
        const amount = absoluteAmount(transaction.amount);

        if (transaction.type === "income") {
          summary.income += amount;
        }

        if (
          transaction.type === "expense" ||
          transaction.type === "transfer_to_other" ||
          (includeSelfTransfers && transaction.type === "transfer_to_self")
        ) {
          summary.expenses += amount;
        }

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

export function calculateCategorySpending(transactions, { month } = {}) {
  return transactions
    .filter((transaction) => getMonthKey(transaction.date) === month)
    .filter((transaction) =>
      ["expense", "transfer_to_other"].includes(transaction.type)
    )
    .reduce((totals, transaction) => {
      const categoryId = transaction.categoryId || "uncategorized";
      totals[categoryId] = (totals[categoryId] || 0) + absoluteAmount(transaction.amount);
      return totals;
    }, {});
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
