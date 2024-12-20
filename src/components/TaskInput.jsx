import React, { useState, useRef, useEffect } from "react";
import "./TaskInput.css";
import TaskFeedback from "./TaskFeedback";

function TaskInput({ onAddTodo, selectedTask, onUpdateTask }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const inputRef = useRef(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false); // Track update mode

  useEffect(() => {
    if (selectedTask) {
      setText(selectedTask.title || selectedTask.text || "");
      setIsUpdateMode(true); // Set update mode if a task is selected
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setText("");
      setIsUpdateMode(false); // Reset update mode if no task is selected
    }
  }, [selectedTask]);

  const handleInputChange = (e) => {
    setText(e.target.value);
  };

  const handleAddTask = async () => {
    if (!text.trim()) return;

    try {
      setFeedback({
        type: "pending",
        display: "Processing...",
        requiresAttention: false,
      });
      const response = await fetch("http://localhost:5000/api/parse-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userInput: text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setFeedback({
          type: "error",
          display: errorData.feedback?.display || "Failed to create task",
          requiresAttention: true,
        });
        return;
      }

      const data = await response.json();
      setAnalysis(data.analysis);

      if (isUpdateMode && selectedTask) {
        // Update existing task
        onUpdateTask(selectedTask.id, {
          title: data.task.title,
          description: data.task.description,
          priority: data.task.priority,
          temporal: data.task.temporal,
          tags: data.task.tags,
          dependencies: data.task.dependencies,
        });
        setFeedback({
          type: "success",
          display: data.feedback?.display || "Task updated successfully",
          requiresAttention: false,
        });
      } else {
        // Create new task
        const newTodo = onAddTodo(data.task);
        if (newTodo) {
          setFeedback({
            type: "success",
            display: data.feedback?.display || "Task created successfully",
            requiresAttention: false,
          });
        } else {
          setFeedback({
            type: "error",
            display: "Failed to create task",
            requiresAttention: true,
          });
        }
      }
      setText("");
    } catch (error) {
      console.error("Error creating task:", error);
      setFeedback({
        type: "error",
        display: "Failed to create task",
        requiresAttention: true,
      });
    }
  };

  const handleAnswerQuestion = async (question, answer) => {
    if (!text.trim()) return;

    try {
      setFeedback({
        type: "pending",
        display: "Processing...",
        requiresAttention: false,
      });
      const response = await fetch("http://localhost:5000/api/parse-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: text,
          answer: { question, answer },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setFeedback({
          type: "error",
          display: errorData.feedback?.display || "Failed to create task",
          requiresAttention: true,
        });
        return;
      }

      const data = await response.json();
      setAnalysis(data.analysis);

      if (isUpdateMode && selectedTask) {
        // Update existing task
        onUpdateTask(selectedTask.id, {
          title: data.task.title,
          description: data.task.description,
          priority: data.task.priority,
          temporal: data.task.temporal,
          tags: data.task.tags,
          dependencies: data.task.dependencies,
        });
        setFeedback({
          type: "success",
          display: data.feedback?.display || "Task updated successfully",
          requiresAttention: false,
        });
      } else {
        // Create new task
        const newTodo = onAddTodo(data.task);
        if (newTodo) {
          setFeedback({
            type: "success",
            display: data.feedback?.display || "Task created successfully",
            requiresAttention: false,
          });
        } else {
          setFeedback({
            type: "error",
            display: "Failed to create task",
            requiresAttention: true,
          });
        }
      }
      setText("");
    } catch (error) {
      console.error("Error creating task:", error);
      setFeedback({
        type: "error",
        display: "Failed to create task",
        requiresAttention: true,
      });
    }
  };

  return (
    <div className="task-input">
      <input
        type="text"
        placeholder="Add a task..."
        value={text}
        onChange={handleInputChange}
        ref={inputRef}
      />
      <button onClick={handleAddTask}>{isUpdateMode ? "Update" : "Add"}</button>
      <TaskFeedback
        feedback={feedback}
        analysis={analysis}
        onAnswerQuestion={handleAnswerQuestion}
      />
    </div>
  );
}

export default TaskInput;
