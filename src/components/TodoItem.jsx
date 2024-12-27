import React from "react";
import "./TodoItem.css";
import DateService from "../utils/dateUtils";
import UserSettingsService from "../utils/userSettings";

const DEFAULT_CATEGORIES = {
  blue: { label: "Blue category", color: "#0078d4" },
  green: { label: "Green category", color: "#107c10" },
  orange: { label: "Orange category", color: "#ff8c00" },
  purple: { label: "Purple category", color: "#5c2d91" },
  red: { label: "Red category", color: "#d83b01" },
  yellow: { label: "Yellow category", color: "#ffd700" },
};

function TodoItem({ todo, toggleTodo, toggleImportant, onSelectTask }) {
  // Get user's timezone preferences
  const { showTimezoneIndicator } = UserSettingsService.getUserSettings();

  // Format the task's date and time
  const getFormattedDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "";

    return DateService.formatTaskDate(dateTimeStr, {
      includeTime: true,
      showTimezone: showTimezoneIndicator,
    });
  };

  // Get custom categories from storage
  const getCustomCategories = () => {
    try {
      const saved = localStorage.getItem("customCategories");
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error loading custom categories:", error);
      return {};
    }
  };

  // Render category tags
  const renderCategories = () => {
    if (!todo.metadata?.categories || todo.metadata.categories.length === 0) {
      return null;
    }

    const allCategories = { ...DEFAULT_CATEGORIES, ...getCustomCategories() };

    return (
      <div className="todo-categories">
        {todo.metadata.categories.map((categoryKey) => {
          const category = allCategories[categoryKey];
          if (!category) return null;

          return (
            <span
              key={categoryKey}
              className="todo-category-tag"
              style={{ backgroundColor: category.color }}
            >
              {category.label}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`todo-item ${todo.completed ? "completed" : ""} ${
        todo.important ? "important" : ""
      }`}
      onClick={() => onSelectTask(todo)}
    >
      <div className="todo-checkbox">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleTodo(todo.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="todo-content">
        <div className="todo-title">
          <span>{todo.title}</span>
          {todo.important && <span className="important-star">⭐</span>}
        </div>
        {renderCategories()}
        {(todo.temporal?.due_date || todo.due_date) && (
          <div className="todo-due-date">
            {getFormattedDateTime(todo.temporal?.due_date || todo.due_date)}
          </div>
        )}
      </div>
      <div className="todo-actions">
        <button
          className={`important-toggle ${todo.important ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleImportant(todo.id);
          }}
        >
          ⭐
        </button>
      </div>
    </div>
  );
}

export default TodoItem;
