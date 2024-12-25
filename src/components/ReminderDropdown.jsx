import React, { useState, useRef } from "react";
import "./ReminderDropdown.css";

function ReminderDropdown({ value, onChange }) {
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

  const formatTime = (date) => {
    return date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  const getNextWeekday = (dayOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(9, 0, 0, 0);
    return date;
  };

  const formatReminderText = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return {
      time: "Remind me",
      day: formatDate(date),
    };
  };

  const handleOptionClick = (date) => {
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      console.error("Invalid date selected");
      return;
    }

    if (selectedDate.getHours() === 0 && selectedDate.getMinutes() === 0) {
      selectedDate.setHours(9, 0, 0, 0);
    }

    setTempSelectedDate(selectedDate);
  };

  const handleCustomDateClick = (e) => {
    e.stopPropagation();
    if (datePickerRef.current) {
      const now = new Date();
      datePickerRef.current.min = now.toISOString().slice(0, 16);
      datePickerRef.current.showPicker();
    }
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      onChange(tempSelectedDate.toISOString());
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedDate(null);
    setIsOpen(false);
  };

  const reminderText = value ? formatReminderText(value) : null;
  const tomorrow = getNextWeekday(1);
  const nextWeek = getNextWeekday(7);

  return (
    <div className="reminder-dropdown">
      <div className="reminder-input" onClick={() => setIsOpen(!isOpen)}>
        <span className="reminder-bell">🔔</span>
        {reminderText ? (
          <div className="selected-reminder">
            <div className="reminder-time">{reminderText.time}</div>
            <div className="reminder-day">{reminderText.day}</div>
          </div>
        ) : (
          <span>Remind me</span>
        )}
      </div>
      {isOpen && (
        <div className="reminder-options">
          <div className="reminder-header">Reminder</div>
          <div
            className={`reminder-option ${
              tempSelectedDate?.getTime() === getNextWeekday(0).getTime()
                ? "selected"
                : ""
            }`}
            onClick={() => handleOptionClick(getNextWeekday(0))}
          >
            <span className="time-icon">⏰</span>
            Later today
          </div>
          <div
            className={`reminder-option ${
              tempSelectedDate?.getTime() === tomorrow.getTime()
                ? "selected"
                : ""
            }`}
            onClick={() => handleOptionClick(tomorrow)}
          >
            <span className="time-icon">⏰</span>
            Tomorrow
            <span className="time-detail">{formatDate(tomorrow)}</span>
          </div>
          <div
            className={`reminder-option ${
              tempSelectedDate?.getTime() === nextWeek.getTime()
                ? "selected"
                : ""
            }`}
            onClick={() => handleOptionClick(nextWeek)}
          >
            <span className="time-icon">⏰</span>
            Next week
            <span className="time-detail">{formatDate(nextWeek)}</span>
          </div>
          <div className="reminder-option custom-date">
            <span className="calendar-icon">📅</span>
            <span onClick={handleCustomDateClick}>Pick a date & time</span>
            <input
              ref={datePickerRef}
              type="datetime-local"
              className="hidden-datetime-input"
              onChange={(e) => handleOptionClick(new Date(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="reminder-actions">
            <button
              className="reminder-action-button cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="reminder-action-button confirm"
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

export default ReminderDropdown;
