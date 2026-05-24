import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createDefaultCategories,
  findCategoryBySuggestion,
} from "../defaultCategories.js";

test("creates editable default finance categories with stable names", () => {
  const categories = createDefaultCategories({
    now: () => "2026-05-24T10:00:00.000Z",
  });

  assert.deepEqual(
    categories.map((category) => category.name),
    [
      "Income",
      "Groceries",
      "Fuel",
      "Shopping",
      "Housing",
      "Utilities",
      "Subscriptions",
      "Transfers",
      "Uncategorized",
    ]
  );
  assert.equal(categories[0].id, "cat_income");
  assert.equal(categories[0].archivedAt, null);
  assert.equal(categories.at(-1).type, "mixed");
});

test("matches parser category suggestions to default categories", () => {
  const categories = createDefaultCategories({
    now: () => "2026-05-24T10:00:00.000Z",
  });

  assert.equal(findCategoryBySuggestion(categories, "Shopping").id, "cat_shopping");
  assert.equal(findCategoryBySuggestion(categories, "unknown"), null);
  assert.equal(findCategoryBySuggestion(categories, null), null);
});

test("creates default categories without an injected clock", () => {
  const categories = createDefaultCategories();

  assert.equal(categories.length, 9);
  assert.match(categories[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);
});
