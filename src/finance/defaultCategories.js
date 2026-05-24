import { createCategory } from "./domain.js";

const DEFAULT_CATEGORY_DEFINITIONS = [
  ["income", "Income", "income", "#2f7d57"],
  ["groceries", "Groceries", "expense", "#4d7c0f"],
  ["fuel", "Fuel", "expense", "#b45309"],
  ["shopping", "Shopping", "expense", "#7c3aed"],
  ["housing", "Housing", "expense", "#0f766e"],
  ["utilities", "Utilities", "expense", "#0369a1"],
  ["subscriptions", "Subscriptions", "expense", "#be123c"],
  ["transfers", "Transfers", "transfer", "#475569"],
  ["uncategorized", "Uncategorized", "mixed", "#6b7280"],
];

export function createDefaultCategories({ now } = {}) {
  return DEFAULT_CATEGORY_DEFINITIONS.map(
    ([slug, name, type, color], sortOrder) =>
      createCategory({
        createId: () => `cat_${slug}`,
        now,
        name,
        type,
        color,
        sortOrder,
      })
  );
}

export function findCategoryBySuggestion(categories, suggestion) {
  if (!suggestion) {
    return null;
  }

  return (
    categories.find(
      (category) =>
        category.name.toLowerCase() === String(suggestion).toLowerCase()
    ) || null
  );
}
