import React, { useState, useRef, useEffect } from "react";
import TodoItem from "./TodoItem";
import TaskFeedback from "./TaskFeedback";
import { motion, AnimatePresence } from "framer-motion";
import { initializePusher } from "../utils/pusher";
import {
  getCommonTaskTimes,
  getPreferredDays,
  findRelatedTasks,
  getCategoryDistribution,
} from "../utils/TaskPatternAnalysis";
import "./TodoList.css";

function TodoList({
  todos,
  toggleTodo,
  toggleImportant,
  onSelectTask,
  onAddTodo,
  onUpdateTask,
  onDeleteTask,
}) {
  const [newTask, setNewTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reminder, setReminder] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [filter, setFilter] = useState("all");
  const [filteredTodos, setFilteredTodos] = useState(todos);
  const recognitionRef = useRef(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [taskFeedback, setTaskFeedback] = useState(null);
  const [taskAnalysis, setTaskAnalysis] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const recurrenceOptions = [
    { value: "", label: "Never" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const initializeSpeechRecognition = () => {
    if (!recognitionRef.current) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        let finalTranscript = "";
        let lastSpeechTime = Date.now();
        let processingTimeout = null;
        let isStartPhrase = false;
        let speechBuffer = [];

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = "";

          // Collect all transcripts
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
              .trim()
              .toLowerCase();

            // Check if this is a start phrase
            if (transcript === "add a task" || transcript === "add task") {
              isStartPhrase = true;
              continue; // Skip adding this to the transcript
            }

            if (event.results[i].isFinal) {
              // Only add to final transcript if it's not just a start phrase
              if (!isStartPhrase || transcript.length > 10) {
                speechBuffer.push(transcript);
                lastSpeechTime = Date.now();
              }
              isStartPhrase = false;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          // Update input field with current transcription
          const currentText = [...speechBuffer, interimTranscript]
            .join(" ")
            .trim();
          setNewTask(currentText);

          // Clear any existing timeout
          if (processingTimeout) {
            clearTimeout(processingTimeout);
          }

          // Set new timeout to process after 2.5 seconds of silence
          processingTimeout = setTimeout(() => {
            if (Date.now() - lastSpeechTime > 2500 && speechBuffer.length > 0) {
              const finalText = speechBuffer.join(" ").trim();

              // Don't process if it's too short or just a command
              if (
                finalText.length > 5 &&
                !["add a task", "add task"].includes(finalText)
              ) {
                parseTask(finalText);
                speechBuffer = [];
                recognitionRef.current.stop();
              }
            }
          }, 2500);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "no-speech") {
            speakToUser(
              "Sorry, I had trouble understanding that. Please try again."
            );
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          // Only stop listening if we've processed something
          if (speechBuffer.length === 0) {
            recognitionRef.current.start(); // Keep listening if nothing processed
          } else {
            setIsListening(false);
          }
        };
      }
    }
  };

  const speakToUser = (message) => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(message);
      speech.lang = "en-US";
      speech.rate = 1.0;
      speech.pitch = 1.0;
      speech.volume = 1.0;

      // Log the speech attempt
      console.log("Speaking to user:", message);

      // Add event handlers for debugging
      speech.onstart = () => console.log("Speech started");
      speech.onend = () => console.log("Speech ended");
      speech.onerror = (error) => console.error("Speech error:", error);

      window.speechSynthesis.speak(speech);
    } catch (error) {
      console.error("Error in speech synthesis:", error);
    }
  };

  // Initialize speech synthesis on component mount
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const defaultVoice = voices.find((voice) =>
          voice.lang.startsWith("en-")
        );
        setSelectedVoice(defaultVoice || voices[0]);
      };

      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      console.warn("Speech synthesis not supported");
    }
  }, []);

  const toggleVoiceInput = async () => {
    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }

    try {
      if (!isListening) {
        // Get LLM feedback for starting voice input
        const response = await fetch(
          "http://localhost:5000/api/voice-feedback",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "start_listening",
            }),
          }
        );

        const data = await response.json();

        recognitionRef.current.start();
        setIsListening(true);

        // Use LLM's feedback for voice start
        if (data.feedback?.voice) {
          speakToUser(data.feedback.voice);
        }
      } else {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } catch (error) {
      console.error("Error in voice input:", error);
      // Let the LLM handle any voice input errors in the next interaction
    }
  };

  const handleSpeechError = async (event) => {
    try {
      // Get LLM feedback for speech error
      const response = await fetch("http://localhost:5000/api/voice-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "speech_error",
          error: event.error,
        }),
      });

      const data = await response.json();

      if (event.error !== "no-speech") {
        // Use LLM's feedback for speech error
        if (data.feedback?.voice) {
          speakToUser(data.feedback.voice);
        }
      }
      setIsListening(false);
    } catch (error) {
      console.error("Error getting speech error feedback:", error);
      setIsListening(false);
    }
  };

  const handleTaskModification = async (input, currentTask = null) => {
    try {
      setIsProcessing(true);
      const response = await fetch("http://localhost:5000/api/tasks/modify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: input,
          currentTask: currentTask,
          allTasks: todos,
          recentActions: recentActions,
          requestSource: isListening ? "voice" : "text",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process modification");
      }

      const data = await response.json();
      if (data.success) {
        // Provide feedback
        if (isListening) {
          speakToUser(data.feedback.voice);
        }

        // Apply modifications
        if (
          data.modifications.action.type === "update" &&
          data.modifications.taskId
        ) {
          const updatedTask = {
            ...currentTask,
            ...data.modifications.newValues,
          };
          onUpdateTask(data.modifications.taskId, updatedTask);

          // Add to recent actions
          setRecentActions((prev) => [
            ...prev,
            {
              type: "update",
              taskId: data.modifications.taskId,
              timestamp: new Date().toISOString(),
              changes: data.modifications.changes,
              status: data.modifications.newValues.status,
            },
          ]);
        } else if (data.modifications.action.type === "create") {
          const newTask = await onAddTodo(data.modifications.newValues);

          // Add to recent actions
          setRecentActions((prev) => [
            ...prev,
            {
              type: "create",
              taskId: newTask.id,
              timestamp: new Date().toISOString(),
            },
          ]);
        } else if (data.modifications.action.type === "delete") {
          // Handle bulk delete
          if (
            data.modifications.action.targetTask.identifier ===
            "all completed tasks"
          ) {
            const completedTasks = todos.filter((task) => task.completed);
            const completedTaskIds = completedTasks.map((task) => task.id);

            // Delete all completed tasks at once
            onDeleteTask(completedTaskIds);

            // Add bulk deletion to recent actions
            setRecentActions((prev) => [
              ...prev,
              {
                type: "bulk_delete",
                taskIds: completedTaskIds,
                timestamp: new Date().toISOString(),
                reason: "completed tasks deletion",
              },
            ]);

            // Provide feedback about bulk action
            if (isListening) {
              speakToUser(`Deleted ${completedTasks.length} completed tasks.`);
            }
          } else {
            // Single task deletion
            onDeleteTask(data.modifications.taskId);
            setRecentActions((prev) => [
              ...prev,
              {
                type: "delete",
                taskId: data.modifications.taskId,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        }

        setNewTask("");
      }
    } catch (error) {
      console.error("Error modifying task:", error);
      const errorMessage = "Sorry, I had trouble with that. Please try again.";
      if (isListening) {
        speakToUser(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to resolve relative dates
  const resolveRelativeDate = (input) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.setDate(now.getDate() + 1))
      .toISOString()
      .split("T")[0];

    // Replace relative date terms with actual dates
    return input.replace(
      /\b(today|tomorrow|next week|next month)\b/gi,
      (match) => {
        switch (match.toLowerCase()) {
          case "today":
            return today;
          case "tomorrow":
            return tomorrow;
          case "next week":
            const nextWeek = new Date(now.setDate(now.getDate() + 7));
            return nextWeek.toISOString().split("T")[0];
          case "next month":
            const nextMonth = new Date(now.setMonth(now.getMonth() + 1));
            return nextMonth.toISOString().split("T")[0];
          default:
            return match;
        }
      }
    );
  };

  const parseTask = async (input) => {
    try {
      setIsProcessing(true);
      setTaskFeedback(null);
      setTaskAnalysis(null);

      // Resolve relative dates in the input
      const resolvedInput = resolveRelativeDate(input);

      // First get LLM feedback and task parsing
      const parseResponse = await fetch(
        "http://localhost:5000/api/parse-task",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userInput: resolvedInput,
            requestSource: isListening ? "voice" : "text",
            sessionContext: {
              timezone: {
                name: Intl.DateTimeFormat().resolvedOptions().timeZone,
                current_time: new Date().toLocaleString(),
              },
              tasks: {
                recent: todos.slice(-5), // Last 5 tasks
                similar: findRelatedTasks(todos, input), // Tasks similar to current input
                today: todos.filter((t) => t.isToday), // Today's tasks
                category: todos.filter((t) => t.category === filter).slice(-3), // Last 3 from current category
                patterns: {
                  common_times: getCommonTaskTimes(todos),
                  preferred_days: getPreferredDays(todos),
                  categories: getCategoryDistribution(todos),
                },
              },
              userPreferences: {
                defaultPriority: "medium",
                defaultReminder: 15,
                preferredTime: "morning",
                currentFilter: filter,
              },
            },
            recentActions: recentActions,
          }),
        }
      );

      const data = await parseResponse.json();
      console.log("=== Task Creation Data Flow ===");
      console.log("1. Raw response from /api/parse-task:", data);
      console.log("2. Task data from response:", data.task);

      // Update feedback state with LLM's feedback
      setTaskFeedback(data.feedback);
      setTaskAnalysis(data.analysis);

      if (!data.success) {
        console.log("3. Task creation failed:", data.error);
        throw new Error(data.error || "Failed to create task");
      }

      // Handle confirmation required
      if (data.requiresConfirmation) {
        console.log("3. Task requires confirmation");
        if (data.feedback?.voice) {
          speakToUser(data.feedback.voice);
        }
        return;
      }

      // If we have task data, create the task
      if (data.task) {
        // Create the task object
        const taskToAdd = {
          id: Date.now().toString(),
          text: data.task.title,
          description: data.task.description || "",
          dueDate: data.task.due_date || null,
          priority: data.task.priority?.toLowerCase() || "medium",
          status: data.task.status || "pending",
          tags: data.task.tags || [],
          isImportant:
            data.task.priority === "Critical" || data.task.priority === "High",
          completed: data.task.status === "COMPLETED",
          reminder: data.task.reminder || null,
          recurrence: data.task.recurrence || null,
          category: filter,
          categories: data.task.categories || [],
          isToday: data.task.due_date
            ? new Date(data.task.due_date).toDateString() ===
              new Date().toDateString()
            : filter === "Today",
          startDate: data.task.start_date || null,
          completionDate: data.task.completion_date || null,
        };

        console.log("3. Task object created from backend data:", {
          backendTask: data.task,
          frontendTask: taskToAdd,
        });

        // Add the task through the parent's handler
        const createdTask = await onAddTodo(taskToAdd);
        console.log("4. Task returned from addTodo:", createdTask);

        // Provide feedback
        if (data.feedback?.voice && isListening) {
          speakToUser(data.feedback.voice);
        }

        // Add to recent actions
        setRecentActions((prev) => [
          ...prev,
          {
            type: "create",
            taskId: createdTask.id,
            timestamp: new Date().toISOString(),
            task: taskToAdd,
          },
        ]);

        // Clear input
        setNewTask("");
        setDueDate("");
        setReminder("");
        setRecurrence("");
      }
    } catch (error) {
      console.error("Error creating task:", error);

      // Get LLM error feedback
      try {
        const errorResponse = await fetch(
          "http://localhost:5000/api/error-feedback",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              error: error.message,
              context: {
                input: input,
                action: "create_task",
              },
            }),
          }
        );

        const errorFeedback = await errorResponse.json();
        setTaskFeedback(errorFeedback.feedback);

        if (errorFeedback.feedback?.voice && isListening) {
          speakToUser(errorFeedback.feedback.voice);
        }
      } catch (feedbackError) {
        console.error("Error getting LLM feedback:", feedbackError);
        // Provide basic error feedback if LLM feedback fails
        setTaskFeedback({
          voice: "Sorry, I encountered an error. Please try again.",
          display: "Error creating task",
        });
        if (isListening) {
          speakToUser("Sorry, I encountered an error. Please try again.");
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle answering clarifying questions
  const handleAnswerQuestion = async (question, answer) => {
    const updatedInput = `${newTask} - ${question}: ${answer}`;
    setNewTask(updatedInput);
    await parseTask(updatedInput);
  };

  // Add notification handling
  useEffect(() => {
    const cleanup = initializePusher((data) => {
      if (notificationTypes.includes(data.type)) {
        try {
          fetch("http://localhost:5000/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: data.type,
              message: data.data.message,
              taskId: data.data.taskId,
              timestamp: new Date().toISOString(),
              status: "unread",
              priority: data.data.priority || "normal",
              duration: data.data.duration || 5000,
            }),
          });

          if (isListening && data.data.feedback?.voice) {
            speakToUser(data.data.feedback.voice);
          }
        } catch (error) {
          console.error("Error saving notification:", error);
        }
      }
    });

    return () => cleanup();
  }, [isListening]);

  // Clean up old actions periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setRecentActions((prev) =>
        prev.filter((action) => new Date(action.timestamp) > fiveMinutesAgo)
      );
    }, 60000); // Run every minute

    return () => clearInterval(cleanup);
  }, []);

  const generateTaskFeedback = (task) => {
    let feedback = `I've created a task: ${task.text}.`;

    if (task.status) {
      feedback += ` Status is ${task.status.name}`;
      if (task.status.reason) {
        feedback += ` (${task.status.reason})`;
      }
      if (task.status.description) {
        feedback += `. ${task.status.description}`;
      }
      feedback += ".";
    }

    if (task.dueDate) {
      feedback += ` Due ${new Date(task.dueDate).toLocaleString()}.`;
    }

    if (task.priority) {
      feedback += ` Priority is ${task.priority}`;
      if (task.priorityConfidence < 0.8) {
        feedback += ` (${Math.round(
          task.priorityConfidence * 100
        )}% confident).`;
        feedback += ` Reasoning: ${task.priorityReasoning}. Let me know if you'd like to adjust this.`;
      } else {
        feedback += ".";
      }
    }

    if (task.location) {
      feedback += ` Location: ${task.location}.`;
    }

    if (task.status?.metadata?.blockedBy?.length > 0) {
      feedback += ` Blocked by: ${task.status.metadata.blockedBy.join(", ")}.`;
    }

    if (task.dependencies?.length > 0) {
      feedback += ` Depends on: ${task.dependencies.join(", ")}.`;
    }

    return feedback;
  };

  const handleKeyPress = async (e) => {
    // Prevent submission if input is too short or looks like an incomplete command
    if (e.key === "Enter" && newTask.trim()) {
      const input = newTask.trim().toLowerCase();
      if (
        input === "add a task" ||
        input === "add task" ||
        input.endsWith("...") ||
        input.length < 5
      ) {
        return; // Don't submit incomplete inputs
      }
      e.preventDefault();
      await parseTask(newTask);
    }
  };

  const handleAddKeyPress = async (e) => {
    // Prevent submission if input is too short or looks like an incomplete command
    if ((e.key === "Enter" || e.key === " ") && newTask.trim()) {
      const input = newTask.trim().toLowerCase();
      if (
        input === "add a task" ||
        input === "add task" ||
        input.endsWith("...") ||
        input.length < 5
      ) {
        return; // Don't submit incomplete inputs
      }
      e.preventDefault();
      await parseTask(newTask);
    }
  };

  const addTodo = () => {
    // Prevent submission if input is too short or looks like an incomplete command
    if (!newTask.trim()) return;
    const input = newTask.trim().toLowerCase();
    if (
      input === "add a task" ||
      input === "add task" ||
      input.endsWith("...") ||
      input.length < 5
    ) {
      return; // Don't submit incomplete inputs
    }
    parseTask(newTask);
  };

  // Update filtered todos whenever todos or filter changes
  useEffect(() => {
    updateFilteredTodos(todos);
  }, [todos, filter]);

  const updateFilteredTodos = (taskList) => {
    let filtered = taskList;

    switch (filter) {
      case "all":
        filtered = taskList;
        break;
      case "active":
        filtered = taskList.filter((todo) => !todo.completed);
        break;
      case "completed":
        filtered = taskList.filter((todo) => todo.completed);
        break;
      case "important":
        filtered = taskList.filter((todo) => todo.important);
        break;
      default:
        // Filter by category
        filtered = taskList.filter((todo) => todo.category === filter);
    }

    setFilteredTodos(filtered);
  };

  return (
    <div className="todo-list">
      <AnimatePresence>
        {filteredTodos.map((todo) => (
          <motion.div
            key={todo.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <TodoItem
              todo={todo}
              toggleTodo={toggleTodo}
              toggleImportant={toggleImportant}
              onSelectTask={onSelectTask}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="add-task-section">
        <div className="add-task-container">
          <div className="add-task-row">
            <div className="checkbox-placeholder" />
            <input
              type="text"
              className="add-task-input"
              placeholder={
                isListening
                  ? "Listening..."
                  : "Add a task (try voice input or type naturally)"
              }
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing || isListening}
              autoFocus
            />
            <button
              className={`voice-input-button ${isListening ? "listening" : ""}`}
              onClick={toggleVoiceInput}
              title="Use voice input"
              disabled={isProcessing}
            >
              🎤
            </button>
            <span
              className="add-text"
              onClick={addTodo}
              onKeyPress={handleAddKeyPress}
              role="button"
              tabIndex={0}
              style={{ opacity: isProcessing ? 0.5 : 1 }}
            >
              {isProcessing ? "Processing..." : "Add"}
            </span>
          </div>
          <div className="task-options">
            <button className="option-button" title="Set due date">
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="hidden-input"
              />
              <span className="calendar-icon">📅</span>
            </button>
            <button className="option-button" title="Set reminder">
              <input
                type="datetime-local"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="hidden-input"
              />
              <span className="bell-icon">🔔</span>
            </button>
            <div className="option-button" title="Set recurrence">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="recurrence-select"
              >
                {recurrenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="recurrence-icon">🔄</span>
            </div>
            <button
              className="add-task-button"
              onClick={addTodo}
              disabled={
                isProcessing || !newTask.trim() || newTask.trim().length < 5
              }
              title={isProcessing ? "Processing..." : "Add Task"}
            >
              {isProcessing ? "..." : "Add Task"}
            </button>
          </div>
          <TaskFeedback
            feedback={taskFeedback}
            analysis={taskAnalysis}
            onAnswerQuestion={handleAnswerQuestion}
          />
        </div>
      </div>
    </div>
  );
}

export default TodoList;
