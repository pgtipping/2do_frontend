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
