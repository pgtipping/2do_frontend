import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./TodoList.css";

function TodoList({
  todos,
  toggleTodo,
  toggleImportant,
  onSelectTask,
  onUpdateTask,
  onDeleteTask,
  selectedTask,
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <motion.div
      className="todo-list-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence mode="popLayout">
        {todos.map((todo) => (
          <motion.div
            key={todo.id}
            variants={itemVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            layout
            className={`todo-item ${
              todo.status === "COMPLETED" ? "completed" : ""
            } ${selectedTask?.id === todo.id ? "selected" : ""}`}
            onClick={() => onSelectTask(todo)}
          >
            <div className="todo-item-content">
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.status === "COMPLETED"}
                onChange={() => toggleTodo(todo.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="todo-title">{todo.title}</span>
              <div className="todo-actions">
                {todo.temporal?.due_date && (
                  <span className="todo-due-date">
                    {formatDate(todo.temporal.due_date)}
                  </span>
                )}
                <button
                  className={`todo-star ${
                    todo.metadata?.isImportant ? "active" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleImportant(todo.id);
                  }}
                >
                  ⭐
                </button>
                <button
                  className="todo-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(todo.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
            {todo.description && (
              <motion.div
                className="todo-description"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {todo.description}
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export default TodoList;
