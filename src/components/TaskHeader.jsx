import React from "react";
import "./TaskHeader.css";

function TaskHeader({ isInputOpen, onToggleInput }) {
  return (
    <div className="task-header">
      <h1>Tasks</h1>
      <button
        className={`task-input-toggle ${isInputOpen ? "open" : ""}`}
        onClick={onToggleInput}
        aria-label={isInputOpen ? "Close task input" : "Open task input"}
      >
        {isInputOpen ? "×" : "+"}
      </button>
    </div>
  );
}

export default TaskHeader;
