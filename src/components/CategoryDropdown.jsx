import React, { useState } from "react";
import "./CategoryDropdown.css";

const DEFAULT_CATEGORIES = {
  blue: { label: "Blue category", color: "#0078d4" },
  green: { label: "Green category", color: "#107c10" },
  orange: { label: "Orange category", color: "#ff8c00" },
  purple: { label: "Purple category", color: "#5c2d91" },
  red: { label: "Red category", color: "#d83b01" },
  yellow: { label: "Yellow category", color: "#ffd700" },
};

function CategoryDropdown({ selectedCategories = [], onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem("customCategories");
    return saved ? JSON.parse(saved) : {};
  });

  const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };

  const toggleCategory = (categoryKey) => {
    const newCategories = selectedCategories.includes(categoryKey)
      ? selectedCategories.filter((key) => key !== categoryKey)
      : [...selectedCategories, categoryKey];
    onChange(newCategories);
  };

  const saveCustomCategories = (updatedCategories) => {
    setCustomCategories(updatedCategories);
    localStorage.setItem("customCategories", JSON.stringify(updatedCategories));
  };

  const addCustomCategory = () => {
    if (!searchTerm.trim()) return;

    const key = searchTerm.toLowerCase().replace(/\s+/g, "-");
    const newCategory = {
      label: searchTerm,
      color:
        DEFAULT_CATEGORIES[
          Object.keys(DEFAULT_CATEGORIES)[
            Object.keys(customCategories).length %
              Object.keys(DEFAULT_CATEGORIES).length
          ]
        ].color,
    };

    const updatedCategories = {
      ...customCategories,
      [key]: newCategory,
    };

    saveCustomCategories(updatedCategories);
    toggleCategory(key);
    setSearchTerm("");
  };

  const startEditing = (key, label) => {
    setEditingCategory(key);
    setEditValue(label);
  };

  const saveEdit = (oldKey) => {
    if (!editValue.trim() || editValue === allCategories[oldKey].label) {
      setEditingCategory(null);
      setEditValue("");
      return;
    }

    const newKey = editValue.toLowerCase().replace(/\s+/g, "-");
    const updatedCategories = { ...customCategories };
    const categoryToUpdate = updatedCategories[oldKey];

    // Delete old key and add new one
    delete updatedCategories[oldKey];
    updatedCategories[newKey] = {
      ...categoryToUpdate,
      label: editValue,
    };

    // Update selected categories if needed
    if (selectedCategories.includes(oldKey)) {
      const newSelected = selectedCategories.map((key) =>
        key === oldKey ? newKey : key
      );
      onChange(newSelected);
    }

    saveCustomCategories(updatedCategories);
    setEditingCategory(null);
    setEditValue("");
  };

  const deleteCategory = (key) => {
    const updatedCategories = { ...customCategories };
    delete updatedCategories[key];

    // Remove from selected categories if present
    if (selectedCategories.includes(key)) {
      onChange(selectedCategories.filter((cat) => cat !== key));
    }

    saveCustomCategories(updatedCategories);
  };

  const filteredCategories = Object.entries(allCategories).filter(
    ([key, { label }]) => label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSelectedCategories = () => {
    if (selectedCategories.length === 0) {
      return <span className="category-placeholder">Pick a category</span>;
    }

    return selectedCategories.map((categoryKey) => {
      const category = allCategories[categoryKey];
      if (!category) return null;

      return (
        <span
          key={categoryKey}
          className="selected-category"
          style={{ backgroundColor: category.color }}
        >
          {category.label}
          <button
            className="remove-category"
            onClick={(e) => {
              e.stopPropagation();
              toggleCategory(categoryKey);
            }}
          >
            ×
          </button>
        </span>
      );
    });
  };

  return (
    <div className="category-dropdown">
      <div className="category-input" onClick={() => setIsOpen(!isOpen)}>
        <span className="category-icon">🏷️</span>
        <div className="selected-categories">{renderSelectedCategories()}</div>
      </div>
      {isOpen && (
        <div className="category-options">
          <div className="category-search">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredCategories.map(([key, { label, color }]) => (
            <div
              key={key}
              className={`category-option ${
                selectedCategories.includes(key) ? "selected" : ""
              }`}
            >
              <div
                className="category-option-content"
                onClick={() => toggleCategory(key)}
              >
                <span
                  className="category-color"
                  style={{ backgroundColor: color }}
                />
                {editingCategory === key ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") saveEdit(key);
                      if (e.key === "Escape") setEditingCategory(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  label
                )}
                {selectedCategories.includes(key) && (
                  <span className="check-mark">✓</span>
                )}
              </div>
              {!DEFAULT_CATEGORIES[key] && (
                <div className="category-actions">
                  {editingCategory === key ? (
                    <>
                      <button
                        className="category-action-btn save"
                        onClick={() => saveEdit(key)}
                      >
                        ✓
                      </button>
                      <button
                        className="category-action-btn cancel"
                        onClick={() => setEditingCategory(null)}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="category-action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(key, label);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="category-action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCategory(key);
                        }}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {searchTerm &&
            !filteredCategories.some(
              ([_, { label }]) =>
                label.toLowerCase() === searchTerm.toLowerCase()
            ) && (
              <div className="add-category" onClick={addCustomCategory}>
                <span>+</span>
                Add "{searchTerm}" as new category
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default CategoryDropdown;
