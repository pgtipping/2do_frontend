import React from "react";
import "./TaskFeedback.css";

const TaskFeedback = ({ feedback, analysis, onAnswerQuestion }) => {
  if (!feedback && !analysis) return null;

  const getFeedbackClass = () => {
    const classes = ["task-feedback"];
    if (feedback?.type) classes.push(`feedback-${feedback.type}`);
    if (feedback?.requiresAttention) classes.push("requires-attention");
    return classes.join(" ");
  };

  return (
    <div className={getFeedbackClass()}>
      {feedback?.display && (
        <div className="feedback-message">
          <span className="feedback-icon">
            {feedback.type === "success" && "✓"}
            {feedback.type === "info" && "ℹ"}
            {feedback.type === "pending" && "⋯"}
            {feedback.type === "error" && "⚠"}
          </span>
          <span className="feedback-text">{feedback.display}</span>
          {feedback.action === "update_later" && (
            <button
              className="feedback-action"
              onClick={() => onAnswerQuestion("update", "now")}
            >
              Update Now
            </button>
          )}
        </div>
      )}

      {analysis?.suggestions?.length > 0 && (
        <div className="feedback-section suggestions">
          <h4>Suggestions:</h4>
          <ul>
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis?.missing_info?.length > 0 && feedback?.requiresAttention && (
        <div className="feedback-section missing-info">
          <h4>Would you like to add:</h4>
          <ul>
            {analysis.missing_info.map((info, index) => (
              <li key={index} className="missing-info-item">
                <span>{info}</span>
                <div className="missing-info-actions">
                  <button onClick={() => onAnswerQuestion(info, "yes")}>
                    Yes
                  </button>
                  <button onClick={() => onAnswerQuestion(info, "no")}>
                    Not Now
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis?.clarifying_questions?.length > 0 && (
        <div className="feedback-section questions">
          <h4>Please clarify:</h4>
          {analysis.clarifying_questions.map((question, index) => (
            <div key={index} className="question-item">
              <p>{question}</p>
              <input
                type="text"
                placeholder="Type your answer..."
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    onAnswerQuestion(question, e.target.value);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskFeedback;
