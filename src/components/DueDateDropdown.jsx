import React, { useState, useRef } from "react";
import "./DueDateDropdown.css";

function DueDateDropdown({ value, onChange, isOverdue }) {
  const [isOpen, setIsOpen] = useState(false);
  const datePickerRef = useRef(null);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    });
  };

  const getNextWeekday = (dayOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(9, 0, 0, 0);
    return date;
  };

  const formatDueText = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return "Today";
    }

    return formatDate(date);
  };

  const handleOptionClick = (date) => {
    onChange(date);
    setIsOpen(false);
  };

  const handleCustomDateClick = (e) => {
    e.stopPropagation();
    if (datePickerRef.current) {
      datePickerRef.current.showPicker();
    }
  };

  const dueText = value ? formatDueText(value) : null;
  const tomorrow = getNextWeekday(1);
  const nextWeek = getNextWeekday(7);

  return (
    <div className="due-date-dropdown">
      <div className="due-date-input" onClick={() => setIsOpen(!isOpen)}>
        <span className="calendar-icon">📅</span>
        {dueText ? (
          <div className={`due-date-text ${isOverdue ? "overdue" : ""}`}>
            {isOverdue ? (
              <>
                <span>Overdue, </span>
                <span>{dueText}</span>
              </>
            ) : (
              <>
                <span>Due </span>
                <span>{dueText}</span>
              </>
            )}
          </div>
        ) : (
          <span>Add due date</span>
        )}
      </div>
      {isOpen && (
        <div className="due-date-options">
          <div className="due-date-header">Due</div>
          <div
            className="due-date-option"
            onClick={() => handleOptionClick(getNextWeekday(0))}
          >
            <span className="calendar-icon">📅</span>
            Today
            <span className="day-label">{formatDate(getNextWeekday(0))}</span>
          </div>
          <div
            className="due-date-option"
            onClick={() => handleOptionClick(tomorrow)}
          >
            <span className="calendar-icon">📅</span>
            Tomorrow
            <span className="day-label">{formatDate(tomorrow)}</span>
          </div>
          <div
            className="due-date-option"
            onClick={() => handleOptionClick(nextWeek)}
          >
            <span className="calendar-icon">📅</span>
            Next week
            <span className="day-label">{formatDate(nextWeek)}</span>
          </div>
          <div className="due-date-option custom-date">
            <span className="calendar-icon">📅</span>
            <span onClick={handleCustomDateClick}>Pick a date</span>
            <input
              ref={datePickerRef}
              type="datetime-local"
              className="hidden-datetime-input"
              onChange={(e) => handleOptionClick(new Date(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DueDateDropdown;
