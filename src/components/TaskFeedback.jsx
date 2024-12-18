import React from "react";
import "./TaskFeedback.css";

const TaskFeedback = ({ feedback, analysis, onAnswerQuestion }) => {
  if (!feedback && !analysis) return null;

  return (
    <div className="task-feedback">
      {feedback?.display && (
        <div className="feedback-message">{feedback.display}</div>
      )}

      {analysis?.suggestions?.length > 0 && (
        <div className="feedback-section">
          <h4>Suggestions:</h4>
          <ul>
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis?.missing_info?.length > 0 && (
        <div className="feedback-section">
          <h4>Missing Information:</h4>
          <ul>
            {analysis.missing_info.map((info, index) => (
              <li key={index}>{info}</li>
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
