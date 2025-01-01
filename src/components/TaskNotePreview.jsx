import React, { useState } from "react";
import "./TaskNotePreview.css";

const MAX_PREVIEW_LENGTH = 150;

export default function TaskNotePreview({
  content,
  maxLength = MAX_PREVIEW_LENGTH,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Strip HTML tags and get plain text
  const getPlainText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const plainText = getPlainText(content);
  const needsTruncation = plainText.length > maxLength;
  const displayText = isExpanded ? plainText : plainText.slice(0, maxLength);

  return (
    <div className="task-note-preview">
      <div className="preview-content">
        {displayText}
        {needsTruncation && !isExpanded && "..."}
      </div>
      {needsTruncation && (
        <button
          className="preview-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
}
