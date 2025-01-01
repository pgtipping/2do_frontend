import React, { useState } from "react";
import TaskNoteEditor from "./TaskNoteEditor";
import "./TodoItem.css";

function TodoItem({
  todo,
  toggleTodo,
  toggleImportant,
  onSelectTask,
  onUpdateTask,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNoteChange = (newContent) => {
    onUpdateTask(todo.id, {
      ...todo,
      description: newContent,
    });
  };

  const handleAttachmentAdd = (attachment) => {
    onUpdateTask(todo.id, {
      ...todo,
      attachments: [...(todo.attachments || []), attachment],
    });
  };

  const handleAttachmentRemove = (attachmentId) => {
    onUpdateTask(todo.id, {
      ...todo,
      attachments: (todo.attachments || []).filter(
        (a) => a.id !== attachmentId
      ),
    });
  };

  const renderCategories = () => {
    if (!todo.metadata?.category) return null;
    return (
      <div className="todo-categories">
        <span
          className="todo-category-tag"
          style={{ backgroundColor: getCategoryColor(todo.metadata.category) }}
        >
          {todo.metadata.category}
        </span>
      </div>
    );
  };

  const getFormattedDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    let dateText = "";
    if (isToday) {
      dateText = "Today";
    } else if (isTomorrow) {
      dateText = "Tomorrow";
    } else {
      dateText = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    const timeText = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    return `${dateText} ${timeText}`;
  };

  return (
    <div
      className={`todo-item ${todo.status === "COMPLETED" ? "completed" : ""} ${
        todo.metadata?.isImportant ? "important" : ""
      }`}
    >
      <div className="todo-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="todo-checkbox">
          <input
            type="checkbox"
            checked={todo.status === "COMPLETED"}
            onChange={() => toggleTodo(todo.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="todo-content">
          <div className="todo-title">
            <span>{todo.title}</span>
            {todo.metadata?.isImportant && (
              <span className="important-star">⭐</span>
            )}
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
            className={`important-toggle ${
              todo.metadata?.isImportant ? "active" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleImportant(todo.id);
            }}
          >
            ⭐
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="todo-details">
          <TaskNoteEditor
            initialContent={todo.description || ""}
            onChange={handleNoteChange}
            onAttachmentAdd={handleAttachmentAdd}
            onAttachmentRemove={handleAttachmentRemove}
            readOnly={todo.status === "COMPLETED"}
          />
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category) {
  const colors = {
    Work: "#4CAF50",
    Personal: "#2196F3",
    Shopping: "#FF9800",
    Health: "#E91E63",
    Other: "#9C27B0",
  };
  return colors[category] || colors.Other;
}

export default TodoItem;
