import React, { useState, useEffect } from "react";
import "./App.css";
import TodoList from "./components/TodoList";
import ReminderDropdown from "./components/ReminderDropdown";
import DueDateDropdown from "./components/DueDateDropdown";
import RepeatDropdown from "./components/RepeatDropdown";
import CategoryDropdown from "./components/CategoryDropdown";
import NotificationBell from "./components/NotificationBell";
import { NotificationProvider } from "./contexts/NotificationContext";

function App() {
  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem("todos");
    return savedTodos ? JSON.parse(savedTodos) : [];
  });
  const [categories] = useState([
    "Today",
    "Important",
    "Planned",
    "All",
    "Completed",
  ]);
  const [filter, setFilter] = useState("Today");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = (todoData) => {
    try {
      console.log("=== AddTodo Function ===");
      console.log("1. Received todoData:", todoData);

      // Ensure todoData exists
      if (!todoData) {
        console.error("todoData is undefined");
        throw new Error("Invalid todo data");
      }

      if (!todoData.text && !todoData.title) {
        console.error("Task text/title is missing");
        throw new Error("Task text/title is required");
      }

      const newTodo = {
        id: Date.now(),
        text: todoData.text || todoData.title || "",
        description: todoData.description || "",
        completed: todoData.completed || false,
        isToday: todoData.isToday || filter === "Today",
        isImportant: todoData.isImportant || false,
        dueDate: todoData.dueDate || null,
        reminder: todoData.reminder || null,
        recurrence: todoData.recurrence || null,
        tags: todoData.tags || [],
        category: todoData.category || filter,
        categories: todoData.categories || [],
        priority: todoData.priority
          ? todoData.priority.toLowerCase()
          : "medium",
        startDate: todoData.startDate || null,
        completionDate: todoData.completionDate || null,
      };

      console.log("2. Created newTodo:", newTodo);
      setTodos((prevTodos) => {
        console.log("3. Previous todos:", prevTodos);
        const updatedTodos = [...prevTodos, newTodo];
        console.log("4. Updated todos:", updatedTodos);
        return updatedTodos;
      });

      console.log("5. Returning newTodo:", newTodo);
      return newTodo;
    } catch (error) {
      console.error("Error in addTodo:", error);
      throw error;
    }
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const toggleImportant = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, isImportant: !todo.isImportant } : todo
      )
    );
  };

  const updateTaskField = (taskId, field, value) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === taskId ? { ...todo, [field]: value } : todo
    );
    setTodos(updatedTodos);
    setSelectedTask((prev) => ({ ...prev, [field]: value }));
  };

  const isOverdue = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getCategoryCount = (category) => {
    return todos.filter((todo) => {
      switch (category) {
        case "Today":
          return todo.isToday;
        case "Important":
          return todo.isImportant;
        case "Planned":
          return todo.dueDate;
        case "Completed":
          return todo.completed;
        case "All":
          return true;
        default:
          return todo.category === category;
      }
    }).length;
  };

  const filteredTodos = todos.filter((todo) => {
    const matchesSearch = todo.text
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    switch (filter) {
      case "Today":
        return todo.isToday;
      case "Important":
        return todo.isImportant;
      case "Planned":
        return todo.dueDate;
      case "Completed":
        return todo.completed;
      case "All":
        return true;
      default:
        return todo.category === filter;
    }
  });

  const updateTask = (taskId, updatedTask) => {
    setTodos(
      todos.map((todo) =>
        todo.id === taskId ? { ...todo, ...updatedTask } : todo
      )
    );

    // If the updated task is currently selected, update the selection
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, ...updatedTask });
    }

    // Store priority feedback if priority was changed
    if (
      updatedTask.priority &&
      updatedTask.priority !== todos.find((t) => t.id === taskId)?.priority
    ) {
      storePriorityFeedback(
        taskId,
        updatedTask.priority,
        todos.find((t) => t.id === taskId)?.priority
      );
    }
  };

  const deleteTask = (taskId) => {
    // If taskId is an array, handle bulk deletion
    if (Array.isArray(taskId)) {
      setTodos(todos.filter((todo) => !taskId.includes(todo.id)));
    } else {
      // Handle single task deletion
      setTodos(todos.filter((todo) => todo.id !== taskId));
    }

    // Clear selection if deleted task was selected
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const storePriorityFeedback = async (
    taskId,
    newPriority,
    originalPriority
  ) => {
    try {
      const task = todos.find((t) => t.id === taskId);
      if (!task) return;

      await fetch(
        `http://localhost:5000/api/tasks/${taskId}/priority-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newPriority,
            originalPriority,
            userInput: task.text,
          }),
        }
      );
    } catch (error) {
      console.error("Error storing priority feedback:", error);
    }
  };

  return (
    <NotificationProvider>
      <div className="app">
        <aside className="sidebar">
          <nav>
            {categories.map((category) => (
              <div
                key={category}
                className={`nav-item ${filter === category ? "active" : ""}`}
                onClick={() => setFilter(category)}
              >
                <span className="nav-item-icon">
                  {category === "Today" && "☀️"}
                  {category === "Important" && "⭐"}
                  {category === "Planned" && "📅"}
                  {category === "All" && "📋"}
                  {category === "Completed" && "✓"}
                </span>
                {category}
                <span className="nav-item-count">
                  {getCategoryCount(category)}
                </span>
              </div>
            ))}
          </nav>
        </aside>

        <main className="main-content">
          <header className="header">
            <h1>{filter}</h1>
            <input
              type="text"
              className="search-bar"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <NotificationBell />
          </header>

          <TodoList
            todos={filteredTodos}
            toggleTodo={toggleTodo}
            toggleImportant={toggleImportant}
            onSelectTask={setSelectedTask}
            onAddTodo={addTodo}
            onUpdateTask={updateTask}
            onDeleteTask={(taskId) => {
              // If it's a bulk delete, pass array of IDs
              if (Array.isArray(taskId)) {
                deleteTask(taskId);
              } else {
                // Single task delete
                deleteTask(taskId);
              }
            }}
          />
        </main>

        {selectedTask && (
          <aside className="right-panel">
            <div className="task-details">
              <div className="task-details-header">
                <h2 className="task-details-title">{selectedTask.text}</h2>
                <button
                  className={`task-details-star ${
                    selectedTask.isImportant ? "active" : ""
                  }`}
                  onClick={() =>
                    updateTaskField(
                      selectedTask.id,
                      "isImportant",
                      !selectedTask.isImportant
                    )
                  }
                >
                  ⭐
                </button>
              </div>

              <div className="task-details-section">
                <DueDateDropdown
                  value={selectedTask.dueDate}
                  isOverdue={isOverdue(selectedTask.dueDate)}
                  onChange={(date) =>
                    updateTaskField(
                      selectedTask.id,
                      "dueDate",
                      date.toISOString()
                    )
                  }
                />
              </div>

              <div className="task-details-section">
                <ReminderDropdown
                  value={selectedTask.reminder}
                  onChange={(date) =>
                    updateTaskField(
                      selectedTask.id,
                      "reminder",
                      date.toISOString()
                    )
                  }
                />
              </div>

              <div className="task-details-section">
                <RepeatDropdown
                  value={selectedTask.recurrence}
                  onChange={(value) =>
                    updateTaskField(selectedTask.id, "recurrence", value)
                  }
                />
              </div>

              <div className="task-details-section">
                <CategoryDropdown
                  selectedCategories={selectedTask.categories || []}
                  onChange={(categories) =>
                    updateTaskField(selectedTask.id, "categories", categories)
                  }
                />
              </div>

              <div className="task-details-section">
                <div className="task-details-label">Add to My Day</div>
                <button
                  onClick={() =>
                    updateTaskField(
                      selectedTask.id,
                      "isToday",
                      !selectedTask.isToday
                    )
                  }
                  className="task-details-button"
                >
                  {selectedTask.isToday ? "Remove from Today" : "Add to Today"}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </NotificationProvider>
  );
}

export default App;
