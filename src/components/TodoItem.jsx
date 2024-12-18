import React from "react";
import "./TodoItem.css";

const DEFAULT_CATEGORIES = {
  blue: { label: "Blue category", color: "#0078d4" },
  green: { label: "Green category", color: "#107c10" },
  orange: { label: "Orange category", color: "#ff8c00" },
  purple: { label: "Purple category", color: "#5c2d91" },
  red: { label: "Red category", color: "#d83b01" },
  yellow: { label: "Yellow category", color: "#ffd700" },
};

function TodoItem({ todo, toggleTodo, toggleImportant, onSelectTask }) {
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    return date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return isToday
      ? `Today @${formatTime(date)}`
      : `${formatDate(date)} @${formatTime(date)}`;
  };

  const getCustomCategories = () => {
    try {
      const saved = localStorage.getItem("customCategories");
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error loading custom categories:", error);
      return {};
    }
  };

  const renderCategories = () => {
    if (!todo.categories || todo.categories.length === 0) return null;

    const allCategories = { ...DEFAULT_CATEGORIES, ...getCustomCategories() };

    return (
      <div className="todo-categories">
        {todo.categories.map((categoryKey) => {
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
        todo.isImportant ? "important" : ""
      }`}
      onClick={() => onSelectTask(todo)}
    >
      <div
        className="todo-checkbox"
        onClick={(e) => {
          e.stopPropagation();
          toggleTodo(todo.id);
        }}
      />
      <div className="todo-content">
        <span className="todo-title">{todo.text}</span>
        {renderCategories()}
      </div>
      <div className="todo-metadata">
        <button
          className={`todo-star-button ${todo.isImportant ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleImportant(todo.id);
          }}
        >
          ⭐
        </button>
        {todo.dueDate && (
          <span className="todo-due-date">{formatDateTime(todo.dueDate)}</span>
        )}
        {todo.isToday && !todo.dueDate && (
          <span className="todo-today-tag">Today</span>
        )}
      </div>
    </div>
  );
}

export default TodoItem;
