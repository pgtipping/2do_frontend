export function mergeCategoriesWithDefaults(defaultCategories, storedCategories) {
  const storedById = new Map(
    storedCategories.map((category) => [category.id, category])
  );
  const defaultIds = new Set(defaultCategories.map((category) => category.id));
  const mergedDefaultCategories = defaultCategories.map(
    (category) => storedById.get(category.id) || category
  );
  const customCategories = storedCategories.filter(
    (category) => !defaultIds.has(category.id)
  );

  return [...mergedDefaultCategories, ...customCategories];
}
