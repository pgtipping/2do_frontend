import React, { useState, useEffect } from "react";
import "./App.css";
import TodoList from "./components/TodoList";
import TaskInput from "./components/TaskInput";
import DueDateDropdown from "./components/DueDateDropdown";
import ReminderDropdown from "./components/ReminderDropdown";
import RepeatDropdown from "./components/RepeatDropdown";
import { fetchTodos, createTodo, updateTodo, deleteTodo } from "./utils/api";
import { useNotifications } from "./contexts/NotificationContext";
import { v4 as uuidv4 } from "uuid";

function App() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const { showNotification } = useNotifications();

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const todos = await fetchTodos();
      setTodos(todos);
    } catch (error) {
      console.error("Error loading todos:", error);
    }
  };

  const addTodo = async (title) => {
    try {
      const newTask = {
        id: uuidv4(),
        title,
        status: "PENDING",
        metadata: { isImportant: false },
      };
      const createdTask = await createTodo(newTask);
      setTodos([...todos, createdTask]);
      showNotification("Task created successfully", "success");
    } catch (error) {
      console.error("Error creating todo:", error);
      showNotification("Error creating task", "error");
      return null;
    }
  };

  const updateTask = async (updatedTask) => {
    try {
      const updatedTaskFromServer = await updateTodo(updatedTask);
      const updatedTodos = todos.map((todo) =>
        todo.id === updatedTaskFromServer.id ? updatedTaskFromServer : todo
      );
      setTodos(updatedTodos);
      setSelectedTask(updatedTaskFromServer);
      showNotification("Task updated successfully", "success");
    } catch (error) {
      console.error("Error updating todo:", error);
      showNotification("Error updating task", "error");
    }
  };

  const deleteTask = async (id) => {
    try {
      await deleteTodo(id);
      const updatedTodos = todos.filter((todo) => todo.id !== id);
      setTodos(updatedTodos);
      setSelectedTask(null);
      showNotification("Task deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting todo:", error);
      showNotification("Error deleting task", "error");
    }
  };

  const toggleTodo = async (id) => {
    try {
      const todoToUpdate = todos.find((todo) => todo.id === id);
      if (!todoToUpdate) {
        console.error("Todo not found");
        return;
      }
      const updatedTodo = {
        ...todoToUpdate,
        status: todoToUpdate.status === "PENDING" ? "COMPLETED" : "PENDING",
      };
      const updatedTodoFromServer = await updateTodo(updatedTodo);
      const updatedTodos = todos.map((todo) =>
        todo.id === updatedTodoFromServer.id ? updatedTodoFromServer : todo
      );
      setTodos(updatedTodos);
      showNotification("Task status updated", "success");
    } catch (error) {
      console.error("Error toggling todo:", error);
      showNotification("Error updating task status", "error");
    }
  };

  const toggleImportant = async (id) => {
    try {
      const todoToUpdate = todos.find((todo) => todo.id === id);
      if (!todoToUpdate) {
        console.error("Todo not found");
        return;
      }
      const updatedTodo = {
        ...todoToUpdate,
        metadata: {
          ...todoToUpdate.metadata,
          isImportant: !todoToUpdate.metadata?.isImportant,
        },
      };
      const updatedTodoFromServer = await updateTodo(updatedTodo);
      const updatedTodos = todos.map((todo) =>
        todo.id === updatedTodoFromServer.id ? updatedTodoFromServer : todo
      );
      setTodos(updatedTodos);
      showNotification("Task importance updated", "success");
    } catch (error) {
      console.error("Error toggling importance:", error);
      showNotification("Error updating task importance", "error");
    }
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
  };

  const handleTaskModification = async (id) => {
    try {
      await deleteTask(id);
    } catch (error) {
      console.error("Error deleting task:", error);
      showNotification("Error deleting task", "error");
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSelectedTask(null); // Clear selected task when changing filters
  };

  // Helper function to check if a task is due today
  const isTaskDueToday = (task) => {
    const dueDate = task.temporal?.due_date || task.due_date;
    if (!dueDate) return false;

    const taskDate = new Date(dueDate);
    const today = new Date();

    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  };

  const filteredTodos = todos.filter((todo) => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch =
      todo.title.toLowerCase().includes(searchTerm) ||
      todo.description?.toLowerCase().includes(searchTerm);

    if (!matchesSearch) return false;

    switch (filter) {
      case "completed":
        return todo.status === "COMPLETED";
      case "important":
        return todo.metadata?.isImportant;
      case "today":
        return isTaskDueToday(todo);
      default:
        return true;
    }
  });

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

  const handleDueDateChange = async (date) => {
    if (!selectedTask) return;
    try {
      // Validate date is not in the past
      const selectedDate = new Date(date);
      const now = new Date();
      now.setSeconds(0, 0); // Reset seconds and milliseconds for fair comparison
      if (selectedDate < now) {
        showNotification("Due date cannot be in the past", "error");
        return;
      }

      // Validate date is valid
      if (isNaN(selectedDate.getTime())) {
        showNotification("Invalid date format", "error");
        return;
      }

      // Check if the selected date is today
      const today = new Date();
      const isToday =
        selectedDate.getDate() === today.getDate() &&
        selectedDate.getMonth() === today.getMonth() &&
        selectedDate.getFullYear() === today.getFullYear();

      const updatedTask = {
        ...selectedTask,
        temporal: {
          ...selectedTask.temporal,
          due_date: date,
        },
        metadata: {
          ...selectedTask.metadata,
          isToday: isToday || selectedTask.metadata?.isToday || false,
        },
      };
      await updateTask(updatedTask);
      showNotification("Due date updated", "success");
    } catch (error) {
      console.error("Error updating due date:", error);
      showNotification("Error updating due date", "error");
    }
  };

  const handleReminderChange = async (date) => {
    if (!selectedTask) return;
    try {
      // Validate date is not in the past
      const selectedDate = new Date(date);
      const now = new Date();
      if (selectedDate < now) {
        showNotification("Reminder cannot be in the past", "error");
        return;
      }

      // Validate date is valid
      if (isNaN(selectedDate.getTime())) {
        showNotification("Invalid date format", "error");
        return;
      }

      // Validate reminder is not after due date
      if (
        selectedTask.temporal?.due_date &&
        selectedDate > new Date(selectedTask.temporal.due_date)
      ) {
        showNotification("Reminder cannot be after due date", "error");
        return;
      }

      const updatedTask = {
        ...selectedTask,
        temporal: {
          ...selectedTask.temporal,
          reminder: selectedDate.toISOString(),
        },
      };
      await updateTask(updatedTask);
      showNotification("Reminder updated", "success");
    } catch (error) {
      console.error("Error updating reminder:", error);
      showNotification("Error updating reminder", "error");
    }
  };

  const handleRecurrenceChange = async (recurrence) => {
    if (!selectedTask) return;
    try {
      // Validate recurrence pattern
      const validPatterns = [
        "Daily",
        "Weekdays",
        "Weekly",
        "Monthly",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
        "Bi-weekly",
        "Quarterly",
        "Yearly",
        "",
      ];

      // Check if it's a comma-separated list of valid days
      const isValidDaysList = recurrence
        .split(", ")
        .every((day) => validPatterns.includes(day));

      if (!validPatterns.includes(recurrence) && !isValidDaysList) {
        showNotification("Invalid recurrence pattern", "error");
        return;
      }

      const updatedTask = {
        ...selectedTask,
        temporal: {
          ...selectedTask.temporal,
          recurrence: recurrence || null,
        },
      };
      await updateTask(updatedTask);
      showNotification("Recurrence updated", "success");
    } catch (error) {
      console.error("Error updating recurrence:", error);
      showNotification("Error updating recurrence", "error");
    }
  };

  const handleCategoryChange = async (category) => {
    if (!selectedTask) return;
    try {
      const updatedTask = {
        ...selectedTask,
        metadata: {
          ...selectedTask.metadata,
          category,
        },
      };
      await updateTask(updatedTask);
      showNotification("Category updated", "success");
    } catch (error) {
      console.error("Error updating category:", error);
      showNotification("Error updating category", "error");
    }
  };

  const toggleAddToToday = async () => {
    if (!selectedTask) return;
    try {
      let newDueDate = null;

      if (!isTaskDueToday(selectedTask)) {
        const today = new Date();

        // Extract time from any existing due date
        let hours = 9; // default
        let minutes = 0;

        const existingDueDate = selectedTask.temporal?.due_date;
        if (existingDueDate) {
          const existingDate = new Date(existingDueDate);
          hours = existingDate.getHours();
          minutes = existingDate.getMinutes();
        }

        // Set the time
        today.setHours(hours);
        today.setMinutes(minutes);
        today.setSeconds(0);
        today.setMilliseconds(0);

        newDueDate = today.toISOString();
      }

      const updatedTask = {
        ...selectedTask,
        temporal: {
          ...selectedTask.temporal,
          due_date: newDueDate,
          reminder: null, // Clear any reminders when moving to today
        },
      };
      await updateTask(updatedTask);
      showNotification(
        `Task ${newDueDate ? "added to" : "removed from"} Today`,
        "success"
      );
    } catch (error) {
      console.error("Error updating Today status:", error);
      showNotification("Error updating Today status", "error");
    }
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div
          className={`nav-item ${filter === "all" ? "active" : ""}`}
          onClick={() => handleFilterChange("all")}
        >
          <span className="nav-item-icon">📝</span>
          <span>All Tasks</span>
          <span className="nav-item-count">{todos.length}</span>
        </div>
        <div
          className={`nav-item ${filter === "today" ? "active" : ""}`}
          onClick={() => handleFilterChange("today")}
        >
          <span className="nav-item-icon">📅</span>
          <span>Today</span>
          <span className="nav-item-count">
            {todos.filter(isTaskDueToday).length}
          </span>
        </div>
        <div
          className={`nav-item ${filter === "important" ? "active" : ""}`}
          onClick={() => handleFilterChange("important")}
        >
          <span className="nav-item-icon">⭐</span>
          <span>Important</span>
          <span className="nav-item-count">
            {todos.filter((t) => t.metadata?.isImportant).length}
          </span>
        </div>
        <div
          className={`nav-item ${filter === "completed" ? "active" : ""}`}
          onClick={() => handleFilterChange("completed")}
        >
          <span className="nav-item-icon">✅</span>
          <span>Completed</span>
          <span className="nav-item-count">
            {todos.filter((t) => t.status === "COMPLETED").length}
          </span>
        </div>
      </nav>

      <main className="main-content">
        <header className="header">
          <h1>Tasks</h1>
          <input
            type="text"
            className="search-bar"
            placeholder="Search tasks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </header>

        <div className="todo-list">
          <TodoList
            todos={filteredTodos}
            toggleTodo={toggleTodo}
            toggleImportant={toggleImportant}
            onSelectTask={handleSelectTask}
            onUpdateTask={updateTask}
            onDeleteTask={handleTaskModification}
            selectedTask={selectedTask}
          />
          <div className="task-input-container">
            <TaskInput
              onAddTodo={addTodo}
              selectedTask={selectedTask}
              onUpdateTask={updateTask}
              todos={todos}
            />
          </div>
        </div>
      </main>

      {selectedTask && (
        <aside className="right-panel">
          <div className="task-details">
            <div className="task-details-header">
              <h2 className="task-details-title">{selectedTask.title}</h2>
              <button
                className={`task-details-star ${
                  selectedTask.metadata?.isImportant ? "active" : ""
                }`}
                onClick={() => toggleImportant(selectedTask.id)}
              >
                ⭐
              </button>
            </div>
            <div className="task-details-section">
              <DueDateDropdown
                value={selectedTask.temporal?.due_date || selectedTask.due_date}
                onChange={handleDueDateChange}
                isOverdue={
                  selectedTask.temporal?.due_date &&
                  new Date(selectedTask.temporal.due_date) < new Date()
                }
              />
            </div>
            <div className="task-details-section">
              <ReminderDropdown
                value={selectedTask.temporal?.reminder || selectedTask.reminder}
                onChange={handleReminderChange}
              />
            </div>
            <div className="task-details-section">
              <RepeatDropdown
                value={
                  selectedTask.temporal?.recurrence ||
                  selectedTask.recurrence ||
                  ""
                }
                onChange={handleRecurrenceChange}
              />
            </div>
            <div className="task-details-section">
              <div className="category-dropdown">
                <div className="category-input">
                  <span className="category-icon">🏷️</span>
                  <select
                    className="category-select"
                    value={selectedTask.metadata?.category || ""}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="">No category</option>
                    <optgroup label="Work">
                      <option value="WORK_TASKS">📋 Tasks</option>
                      <option value="WORK_MEETINGS">👥 Meetings</option>
                      <option value="WORK_DEADLINES">⏰ Deadlines</option>
                      <option value="WORK_PROJECTS">📊 Projects</option>
                    </optgroup>
                    <optgroup label="Personal">
                      <option value="PERSONAL_TASKS">🏠 Tasks</option>
                      <option value="PERSONAL_HEALTH">❤️ Health</option>
                      <option value="PERSONAL_FINANCE">💰 Finance</option>
                      <option value="PERSONAL_SHOPPING">🛒 Shopping</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="LEARNING">📚 Learning</option>
                      <option value="EVENTS">🎉 Events</option>
                      <option value="IDEAS">💡 Ideas</option>
                      <option value="SOMEDAY">🌟 Someday</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
            <div className="task-details-section">
              <button
                className={`task-details-button ${
                  isTaskDueToday(selectedTask) ? "active" : ""
                }`}
                onClick={toggleAddToToday}
              >
                {isTaskDueToday(selectedTask)
                  ? "Added to Today"
                  : "Add to Today"}
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default App;
