import React, { useState, useRef, useEffect } from "react";
import "./TaskInput.css";
import { createTodo, updateTodo } from "../utils/api";

function TaskInput({
  onAddTodo,
  selectedTask,
  onUpdateTask,
  isVisible,
  onClose,
}) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setText(selectedTask.title || selectedTask.text || "");
      setIsUpdateMode(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setText("");
      setIsUpdateMode(false);
    }
  }, [selectedTask]);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      if (isUpdateMode && selectedTask) {
        const updatedTask = await updateTodo({
          ...selectedTask,
          title: text.trim(),
        });
        onUpdateTask(updatedTask);
      } else {
        const newTask = await createTodo({
          title: text.trim(),
          completed: false,
        });
        onAddTodo(newTask);
      }
      setText("");
      setIsUpdateMode(false);
      onClose(); // Close after successful submission
    } catch (error) {
      console.error("Failed to handle task:", error);
    }
  };

  if (!isVisible) return null;

  return (
    <form onSubmit={handleSubmit} className="task-input-container">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a task"
        className="task-input-field"
      />
      <button type="submit" className="add-task-button" disabled={!text.trim()}>
        {isUpdateMode ? "Update" : "Add"}
      </button>
    </form>
  );
}

export default TaskInput;
