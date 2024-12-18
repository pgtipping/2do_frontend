import React from "react";
import { getCategoryColor, removeCategoryColor } from "../utils/categoryColors";
import "./Categories.css";

function Categories({
  categories,
  currentFilter,
  onFilterChange,
  onRemoveCategory,
}) {
  const handleRemoveCategory = (category, e) => {
    e.stopPropagation();
    const success = onRemoveCategory?.(category);
    if (success) {
      removeCategoryColor(category);
    }
  };

  // Convert hex color to RGB values
  const parseColor = (color) => {
    try {
      // Remove the # if present
      const hex = color.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b];
    } catch (error) {
      console.error("Error parsing color:", color);
      return [72, 52, 212]; // Fallback to a nice purple
    }
  };

  return (
    <div className="categories">
      <div className="filter-buttons">
        <button
          className={`category-btn system ${
            currentFilter === "All" ? "active" : ""
          }`}
          onClick={() => onFilterChange("All")}
        >
          All
        </button>
        <button
          className={`category-btn system ${
            currentFilter === "Active" ? "active" : ""
          }`}
          onClick={() => onFilterChange("Active")}
        >
          Active
        </button>
        <button
          className={`category-btn system ${
            currentFilter === "Completed" ? "active" : ""
          }`}
          onClick={() => onFilterChange("Completed")}
        >
          Completed
        </button>
      </div>
      <div className="category-buttons">
        {categories.map((category) => {
          const baseColor = getCategoryColor(category);
          const isDefault = ["work", "personal", "shopping"].includes(
            category.toLowerCase()
          );
          const [r, g, b] = parseColor(baseColor);

          return (
            <button
              key={category}
              className={`category-btn ${
                currentFilter === category ? "active" : ""
              } ${isDefault ? "default" : ""}`}
              onClick={() => onFilterChange(category)}
              style={{
                "--category-light-bg": `rgba(${r}, ${g}, ${b}, 0.082)`,
                "--category-text": baseColor,
              }}
              title={`Filter by ${category}`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
              {!isDefault && (
                <button
                  className="category-remove"
                  onClick={(e) => handleRemoveCategory(category, e)}
                  title={`Remove ${category} category`}
                >
                  ×
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Categories;
