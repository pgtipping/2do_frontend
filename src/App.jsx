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
  const migrateTaskToNewStructure = (oldTask) => {
    // Return early if task is already in new structure
    if (oldTask.metadata && oldTask.temporal && oldTask.status) {
      return oldTask;
    }

    return {
      id: oldTask.id || Date.now().toString(),
      title: oldTask.text || oldTask.title, // Handle both old and new field names
      description: oldTask.description || "",
      priority: {
        level: oldTask.priority || "Medium",
        reasoning: "Migrated from old task structure",
      },
      temporal: {
        due_date: oldTask.dueDate || null,
        start_date: oldTask.startDate || null,
        recurrence: oldTask.recurrence || null,
      },
      status: oldTask.completed ? "COMPLETED" : "TODO",
      tags: oldTask.tags || [],
      dependencies: oldTask.dependencies || [],
      metadata: {
        isImportant: oldTask.isImportant || false,
        isToday: oldTask.isToday || false,
        category: oldTask.category || "All",
        categories: oldTask.categories || [],
      },
      created_at: oldTask.created_at || new Date().toISOString(),
      updated_at: oldTask.updated_at || new Date().toISOString(),
    };
  };

  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem("todos");
    if (!savedTodos) return [];

    // Migrate existing tasks
    const parsedTodos = JSON.parse(savedTodos);
    return parsedTodos.map(migrateTaskToNewStructure);
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

      if (!todoData.title) {
        console.error("Task title is missing");
        throw new Error("Task title is required");
      }

      // Create new todo using standardized schema
      const newTodo = {
        id: todoData.id || Date.now().toString(),
        title: todoData.title,
        description: todoData.description || "",
        priority: {
          level: todoData.priority?.level || "Medium",
          reasoning:
            todoData.priority?.reasoning || "Default priority assigned",
        },
        temporal: {
          due_date: todoData.temporal?.due_date || null,
          start_date: todoData.temporal?.start_date || null,
          recurrence: todoData.temporal?.recurrence || null,
        },
        status: todoData.status || "TODO",
        tags: todoData.tags || [],
        dependencies: todoData.dependencies || [],
        metadata: {
          isImportant:
            todoData.metadata?.isImportant ||
            todoData.priority?.level === "Critical" ||
            todoData.priority?.level === "High",
          isToday: filter === "Today" || todoData.metadata?.isToday || false,
          category: todoData.metadata?.category || filter,
          categories: todoData.metadata?.categories || [],
        },
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
        todo.id === id
          ? {
              ...todo,
              status: todo.status === "COMPLETED" ? "TODO" : "COMPLETED",
            }
          : todo
      )
    );
  };

  const toggleImportant = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              metadata: {
                ...todo.metadata,
                isImportant: !todo.metadata?.isImportant,
              },
            }
          : todo
      )
    );
  };

  const updateTaskField = (taskId, field, value) => {
    const updatedTodos = todos.map((todo) => {
      if (todo.id === taskId) {
        // Handle nested fields
        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          return {
            ...todo,
            [parent]: {
              ...todo[parent],
              [child]: value,
            },
          };
        }
        return { ...todo, [field]: value };
      }
      return todo;
    });
    setTodos(updatedTodos);
    setSelectedTask((prev) => {
      if (!prev) return prev;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });
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
          return todo.metadata?.isToday;
        case "Important":
          return todo.metadata?.isImportant;
        case "Planned":
          return todo.temporal?.due_date;
        case "Completed":
          return todo.status === "COMPLETED";
        case "All":
          return true;
        default:
          return todo.metadata?.category === category;
      }
    }).length;
  };

  const filteredTodos = todos.filter((todo) => {
    // Only apply search filter if there's a search query
    if (searchQuery) {
      const searchText = todo?.title || todo?.text || "";
      const matchesSearch = searchText
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    switch (filter) {
      case "Today":
        return todo.metadata?.isToday || todo.isToday;
      case "Important":
        return todo.metadata?.isImportant || todo.isImportant;
      case "Planned":
        return todo.temporal?.due_date || todo.dueDate;
      case "Completed":
        return todo.status === "COMPLETED" || todo.completed;
      case "All":
        return true;
      default:
        return (todo.metadata?.category || todo.category) === filter;
    }
  });

  const updateTask = (taskId, updatedTask) => {
    // Prevent removal of title
    if (updatedTask.hasOwnProperty("title") && !updatedTask.title) {
      console.error("Cannot update task: Title is required");
      throw new Error("Task title is required");
    }

    setTodos(
      todos.map((todo) => {
        if (todo.id === taskId) {
          // Ensure nested structures are preserved
          const updatedTodo = { ...todo };

          // Update metadata if provided
          if (updatedTask.metadata) {
            updatedTodo.metadata = {
              ...updatedTodo.metadata,
              ...updatedTask.metadata,
            };
          }

          // Update temporal if provided
          if (updatedTask.temporal) {
            updatedTodo.temporal = {
              ...updatedTodo.temporal,
              ...updatedTask.temporal,
            };
          }

          // Update priority if provided
          if (updatedTask.priority) {
            updatedTodo.priority = {
              ...updatedTodo.priority,
              ...updatedTask.priority,
            };
          }

          // Update top-level fields
          return {
            ...updatedTodo,
            ...updatedTask,
            // Restore nested objects if they were overwritten
            metadata: updatedTodo.metadata,
            temporal: updatedTodo.temporal,
            priority: updatedTodo.priority,
          };
        }
        return todo;
      })
    );

    // If the updated task is currently selected, update the selection
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => {
        if (!prev) return prev;
        const updatedSelection = { ...prev };

        // Update nested structures
        if (updatedTask.metadata) {
          updatedSelection.metadata = {
            ...updatedSelection.metadata,
            ...updatedTask.metadata,
          };
        }
        if (updatedTask.temporal) {
          updatedSelection.temporal = {
            ...updatedSelection.temporal,
            ...updatedTask.temporal,
          };
        }
        if (updatedTask.priority) {
          updatedSelection.priority = {
            ...updatedSelection.priority,
            ...updatedTask.priority,
          };
        }

        return {
          ...updatedSelection,
          ...updatedTask,
          // Restore nested objects
          metadata: updatedSelection.metadata,
          temporal: updatedSelection.temporal,
          priority: updatedSelection.priority,
        };
      });
    }

    // Store priority feedback if priority was changed
    if (updatedTask.priority?.level) {
      const originalTask = todos.find((t) => t.id === taskId);
      if (updatedTask.priority.level !== originalTask?.priority?.level) {
        storePriorityFeedback(
          taskId,
          updatedTask.priority.level,
          originalTask?.priority?.level
        );
      }
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
            userInput: task.title,
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
