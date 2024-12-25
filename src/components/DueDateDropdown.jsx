import React, { useState, useRef } from "react";
import "./DueDateDropdown.css";

function DueDateDropdown({ value, onChange, isOverdue }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
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

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;

    if (minutes === 0) {
      return `@${displayHours}${ampm}`;
    }
    return `@${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;
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
      return `Today ${formatTime(date)}`;
    }

    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const handleOptionClick = (date, isCustomDateTime = false) => {
    let selectedDate;

    // Handle datetime-local input value
    if (isCustomDateTime) {
      // For datetime-local input, create date from the raw value
      selectedDate = new Date(date);
      if (isNaN(selectedDate.getTime())) {
        console.error("Invalid date selected");
        return;
      }
      // Preserve the exact time from the datetime picker
      setTempSelectedDate(selectedDate);
      return;
    }

    // Handle preset options
    selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      console.error("Invalid date selected");
      return;
    }

    // Set default time for preset options
    selectedDate.setHours(9, 0, 0, 0);
    setTempSelectedDate(selectedDate);
  };

  const handleCustomDateClick = (e) => {
    e.stopPropagation();
    if (datePickerRef.current) {
      const today = new Date();
      datePickerRef.current.min = today.toISOString().slice(0, 16);

      // Initialize with current value if it exists
      if (tempSelectedDate) {
        datePickerRef.current.value = tempSelectedDate
          .toISOString()
          .slice(0, 16);
      } else if (value) {
        const currentValue = new Date(value);
        if (!isNaN(currentValue.getTime())) {
          datePickerRef.current.value = currentValue.toISOString().slice(0, 16);
        }
      }

      datePickerRef.current.showPicker();
    }
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      const isoString = tempSelectedDate.toISOString();
      onChange(isoString);
      setTempSelectedDate(null);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedDate(null);
    setIsOpen(false);
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
            className={`due-date-option ${
              tempSelectedDate?.getTime() === getNextWeekday(0).getTime()
                ? "selected"
                : ""
            }`}
            onClick={() => handleOptionClick(getNextWeekday(0))}
          >
            <span className="calendar-icon">📅</span>
            Today
            <span className="day-label">
              {formatDate(getNextWeekday(0))} {formatTime(getNextWeekday(0))}
            </span>
          </div>
          <div
            className={`due-date-option ${
              tempSelectedDate?.getTime() === tomorrow.getTime()
                ? "selected"
                : ""
            }`}
            onClick={() => handleOptionClick(tomorrow)}
          >
            <span className="calendar-icon">📅</span>
            Tomorrow
            <span className="day-label">
              {formatDate(tomorrow)} {formatTime(tomorrow)}
            </span>
          </div>
          <div
            className={`due-date-option ${
              tempSelectedDate?.getTime() === nextWeek.getTime()
                ? "selected"
                : ""
            }`}
            onClick={() => handleOptionClick(nextWeek)}
          >
            <span className="calendar-icon">📅</span>
            Next week
            <span className="day-label">
              {formatDate(nextWeek)} {formatTime(nextWeek)}
            </span>
          </div>
          <div className="due-date-option custom-date">
            <span className="calendar-icon">📅</span>
            <span onClick={handleCustomDateClick}>Pick a date & time</span>
            <input
              ref={datePickerRef}
              type="datetime-local"
              className="hidden-datetime-input"
              onChange={(e) => handleOptionClick(e.target.value, true)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="due-date-actions">
            <button
              className="due-date-action-button cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="due-date-action-button confirm"
              onClick={handleConfirm}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DueDateDropdown;
