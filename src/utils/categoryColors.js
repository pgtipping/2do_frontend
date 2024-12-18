// Default categories with fixed colors
const defaultColors = {
  work: "#4834d4", // Royal Blue
  personal: "#6ab04c", // Mint Green
  shopping: "#eb4d4b", // Coral Red
};

// Load persisted category colors from localStorage
const loadPersistedColors = () => {
  const stored = localStorage.getItem("categoryColors");
  return stored ? JSON.parse(stored) : {};
};

// Save category colors to localStorage
const persistCategoryColors = (colors) => {
  localStorage.setItem("categoryColors", JSON.stringify(colors));
};

// Dynamic color storage
let dynamicColors = loadPersistedColors();

// Predefined colors for new categories
const colorPalette = [
  "#FF6B6B", // Coral
  "#4ECDC4", // Turquoise
  "#45B7D1", // Sky Blue
  "#96CEB4", // Sage
  "#FFEEAD", // Cream
  "#D4A5A5", // Dusty Rose
  "#9B59B6", // Purple
  "#3498DB", // Blue
  "#E67E22", // Orange
  "#2ECC71", // Green
];

let colorIndex = 0;

// Get next color from palette
const getNextColor = () => {
  const color = colorPalette[colorIndex];
  colorIndex = (colorIndex + 1) % colorPalette.length;
  return color;
};

export function getCategoryColor(category) {
  const normalizedCategory = category.toLowerCase();

  // Return fixed color for default categories
  if (defaultColors[normalizedCategory]) {
    return defaultColors[normalizedCategory];
  }

  // Check if category already has an assigned color
  if (dynamicColors[normalizedCategory]) {
    return dynamicColors[normalizedCategory];
  }

  // Get next color from palette and persist it
  const newColor = getNextColor();
  dynamicColors[normalizedCategory] = newColor;
  persistCategoryColors(dynamicColors);

  return newColor;
}

export function removeCategoryColor(category) {
  const normalizedCategory = category.toLowerCase();
  if (dynamicColors[normalizedCategory]) {
    delete dynamicColors[normalizedCategory];
    persistCategoryColors(dynamicColors);
  }
}

export const categoryColors = defaultColors;
