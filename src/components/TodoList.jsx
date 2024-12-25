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
  const [collapsedGroups, setCollapsedGroups] = React.useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

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

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;

    if (minutes === 0) {
      return `@${displayHours}${ampm}`;
    }
    return `@${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    if (isToday) {
      return `Today ${formatTime(date)}`;
    }
    if (isTomorrow) {
      return `Tomorrow ${formatTime(date)}`;
    }

    return `${date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    })} ${formatTime(date)}`;
  };

  const isOverdue = (date) => {
    if (!date) return false;
    const dueDate = new Date(date);
    if (isNaN(dueDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const groupTasks = (tasks) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return tasks.reduce(
      (groups, task) => {
        const dueDate = task.due_date || task.temporal?.due_date;
        if (!dueDate) {
          groups.unscheduled.push(task);
          return groups;
        }

        const dueDateObj = new Date(dueDate);
        if (isNaN(dueDateObj.getTime())) {
          groups.unscheduled.push(task);
          return groups;
        }

        dueDateObj.setHours(0, 0, 0, 0);

        if (dueDateObj < today) {
          groups.overdue.push(task);
        } else if (dueDateObj.getTime() === today.getTime()) {
          groups.dueToday.push(task);
        } else if (dueDateObj.getTime() === tomorrow.getTime()) {
          groups.dueTomorrow.push(task);
        } else if (dueDateObj <= nextWeek) {
          groups.dueThisWeek.push(task);
        } else if (dueDateObj <= thisMonthEnd) {
          groups.dueThisMonth.push(task);
        } else {
          groups.future.push(task);
        }

        return groups;
      },
      {
        overdue: [],
        dueToday: [],
        dueTomorrow: [],
        dueThisWeek: [],
        dueThisMonth: [],
        future: [],
        unscheduled: [],
      }
    );
  };

  const formatDateRange = (start, end) => {
    return `${start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })} to ${end.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}`;
  };

  const renderTaskGroup = (tasks, title) => {
    if (!tasks.length) return null;
    const isCollapsed = collapsedGroups[title];

    return (
      <div className="todo-group">
        <div className="todo-group-header" onClick={() => toggleGroup(title)}>
          <span className={`group-arrow ${isCollapsed ? "collapsed" : ""}`}>
            ▼
          </span>
          <span className="group-title">{title}</span>
          <span className="group-count">{tasks.length}</span>
        </div>
        <AnimatePresence mode="popLayout">
          {!isCollapsed &&
            tasks.map((todo) => (
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
                  <div className="todo-main-content">
                    <div className="todo-header">
                      <input
                        type="checkbox"
                        className="todo-checkbox"
                        checked={todo.status === "COMPLETED"}
                        onChange={() => toggleTodo(todo.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="todo-title">{todo.title}</span>
                      {(todo.due_date || todo.temporal?.due_date) && (
                        <span
                          className={`todo-due-date ${
                            isOverdue(todo.due_date || todo.temporal?.due_date)
                              ? "overdue"
                              : ""
                          }`}
                        >
                          {formatDate(todo.due_date || todo.temporal?.due_date)}
                        </span>
                      )}
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
                  </div>
                  <div className="todo-actions">
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
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    );
  };

  const groupedTasks = groupTasks(todos);

  return (
    <motion.div
      className="todo-list-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {renderTaskGroup(groupedTasks.overdue, "Overdue")}
      {renderTaskGroup(groupedTasks.dueToday, "Due Today")}
      {renderTaskGroup(groupedTasks.dueTomorrow, "Due Tomorrow")}
      {renderTaskGroup(groupedTasks.dueThisWeek, "Due This Week")}
      {renderTaskGroup(groupedTasks.dueThisMonth, "Due This Month")}
      {renderTaskGroup(groupedTasks.future, "Future Tasks")}
      {renderTaskGroup(groupedTasks.unscheduled, "Unscheduled")}
    </motion.div>
  );
}

export default TodoList;
