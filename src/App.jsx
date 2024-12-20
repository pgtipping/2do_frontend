import React, { useState, useEffect } from "react";
import "./App.css";
import TodoList from "./components/TodoList";
import TaskInput from "./components/TaskInput";
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
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "completed") {
      return todo.status === "COMPLETED";
    }
    if (filter === "important") {
      return todo.metadata?.isImportant;
    }
    const searchTerm = searchQuery.toLowerCase();
    return (
      todo.title.toLowerCase().includes(searchTerm) ||
      todo.description?.toLowerCase().includes(searchTerm)
    );
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

  return (
    <div className="app-container">
      <main className="main-content">
        <div className="task-list-container">
          <div className="filter-bar">
            <button
              onClick={() => setFilter("all")}
              className={filter === "all" ? "active" : ""}
            >
              All
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={filter === "completed" ? "active" : ""}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter("important")}
              className={filter === "important" ? "active" : ""}
            >
              Important
            </button>
          </div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <TodoList
            todos={filteredTodos}
            toggleTodo={toggleTodo}
            toggleImportant={toggleImportant}
            onSelectTask={handleSelectTask}
            onAddTodo={addTodo}
            onUpdateTask={updateTask}
            onDeleteTask={handleTaskModification}
          />
        </div>
        <div className="task-input-container">
          <TaskInput
            onAddTodo={addTodo}
            selectedTask={selectedTask}
            onUpdateTask={updateTask}
          />
        </div>
      </main>
      {selectedTask && (
        <aside className="task-details">
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
            <div className="due-date-dropdown">
              <div className="due-date-input">
                <span className="calendar-icon">📅</span>
                <span>
                  {selectedTask.temporal?.due_date
                    ? formatDateTime(selectedTask.temporal.due_date)
                    : "Add due date"}
                </span>
              </div>
            </div>
          </div>
          <div className="task-details-section">
            <div className="reminder-dropdown">
              <div className="reminder-input">
                <span className="reminder-bell">🔔</span>
                <span>
                  {selectedTask.temporal?.reminder
                    ? formatDateTime(selectedTask.temporal.reminder)
                    : "Remind me"}
                </span>
              </div>
            </div>
          </div>
          <div className="task-details-section">
            <div className="repeat-dropdown">
              <div className="repeat-input">
                <span className="repeat-icon">🔄</span>
                <div className="repeat-text">
                  {selectedTask.temporal?.recurrence || "Repeat"}
                </div>
              </div>
            </div>
          </div>
          <div className="task-details-section">
            <div className="category-dropdown">
              <div className="category-input">
                <span className="category-icon">🏷️</span>
                <div className="selected-categories">
                  <span className="category-placeholder">
                    {selectedTask.metadata?.category || "Pick a category"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="task-details-section">
            <div className="task-details-label">Add to Today</div>
            <button className="task-details-button">
              {selectedTask.metadata?.isToday
                ? "Added to Today"
                : "Add to Today"}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

export default App;
