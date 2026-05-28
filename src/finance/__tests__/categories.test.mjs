import test from "node:test";
import assert from "node:assert/strict";
import { mergeCategoriesWithDefaults } from "../categories.js";

test("stored custom categories do not replace default categories", () => {
  const categories = mergeCategoriesWithDefaults(
    [
      { id: "cat_groceries", name: "Groceries", archivedAt: null },
      { id: "cat_subscriptions", name: "Subscriptions", archivedAt: null },
    ],
    [{ id: "cat_custom", name: "Restaurants", archivedAt: null }]
  );

  assert.deepEqual(
    categories.map((category) => category.name),
    ["Groceries", "Subscriptions", "Restaurants"]
  );
});

test("stored default category changes override the default category", () => {
  const categories = mergeCategoriesWithDefaults(
    [{ id: "cat_groceries", name: "Groceries", archivedAt: null }],
    [{ id: "cat_groceries", name: "Food", archivedAt: "2026-05-27T00:00:00.000Z" }]
  );

  assert.deepEqual(categories, [
    {
      id: "cat_groceries",
      name: "Food",
      archivedAt: "2026-05-27T00:00:00.000Z",
    },
  ]);
});
