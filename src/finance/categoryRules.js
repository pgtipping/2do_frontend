export function normalizeCategoryRuleText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\$?[\d,]+\.\d{2}/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getCategoryRuleText(transaction) {
  return normalizeCategoryRuleText(
    transaction.rawNarration || transaction.description || ""
  );
}

export function findCategoryRuleForTransaction(categoryRules = [], transaction = {}) {
  const transactionText = getCategoryRuleText(transaction);

  if (!transactionText) {
    return null;
  }

  return (
    categoryRules
      .filter((rule) => !rule.archivedAt)
      .map((rule) => ({
        ...rule,
        normalizedMatchText: normalizeCategoryRuleText(rule.matchText),
      }))
      .filter((rule) => rule.normalizedMatchText)
      .sort(
        (first, second) =>
          second.normalizedMatchText.length - first.normalizedMatchText.length
      )
      .find(
        (rule) =>
          transactionText.includes(rule.normalizedMatchText) ||
          rule.normalizedMatchText.includes(transactionText)
      ) || null
  );
}

export function findCategoryById(categories = [], categoryId) {
  return categories.find((category) => category.id === categoryId) || null;
}
