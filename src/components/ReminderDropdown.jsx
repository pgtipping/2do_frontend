import React, { useState, useRef, useEffect } from "react";
import "./ReminderDropdown.css";
import TimePickerModal from "./TimePickerModal";
import DateService from "../utils/dateUtils";
import UserSettingsService from "../utils/userSettings";

function ReminderDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const weekDays = [
    { key: "sun", label: "S" },
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
    { key: "sat", label: "S" },
  ];

  useEffect(() => {
    if (isOpen && dropdownRef.current && inputRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate optimal position
      let top = inputRect.bottom + 8; // Default to below input
      let left = inputRect.left;

      // Check if dropdown would go below viewport
      if (top + dropdownRect.height > viewportHeight) {
        // Position above input if there's more space there
        top = inputRect.top - dropdownRect.height - 8;
      }

      // Ensure left position doesn't push dropdown off screen
      if (left + dropdownRect.width > viewportWidth) {
        left = viewportWidth - dropdownRect.width - 16;
      }

      // Ensure minimum spacing from edges
      top = Math.max(
        16,
        Math.min(top, viewportHeight - dropdownRect.height - 16)
      );
      left = Math.max(16, left);

      // Apply position
      dropdownRef.current.style.top = `${top}px`;
      dropdownRef.current.style.left = `${left}px`;
    }
  }, [isOpen]);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    });
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

  const formatReminderText = (dateStr) => {
    if (!dateStr) return null;
    return DateService.formatTaskDate(dateStr);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const handleDateSelect = (day) => {
    const selected = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );

    // Preserve existing time or use current time
    const timeToUse = value ? new Date(value) : new Date();
    selected.setHours(timeToUse.getHours(), timeToUse.getMinutes(), 0, 0);

    setTempSelectedDate(selected.toISOString());
  };

  const handleTimeSelect = (selectedTime) => {
    let baseDate;

    if (tempSelectedDate) {
      // If we have a temp selected date, update its time
      baseDate = new Date(tempSelectedDate);
      baseDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0,
        0
      );
      setTempSelectedDate(baseDate.toISOString());
      onChange(baseDate.toISOString());
    } else if (value) {
      // If we have a value but no temp date, update value's time
      baseDate = new Date(value);
      baseDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0,
        0
      );
      onChange(baseDate.toISOString());
    } else {
      // If no date is selected, use today with selected time
      baseDate = new Date();
      baseDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0,
        0
      );
      onChange(baseDate.toISOString());
    }
    setShowTimePicker(false);
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      // If we have a selected date, use it
      onChange(tempSelectedDate);
    }
    setTempSelectedDate(null);
    setIsOpen(false);
    setShowTimePicker(false);
  };

  const handleCancel = () => {
    setTempSelectedDate(null);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
    const today = new Date();
    const days = [];
    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(
        <div
          key={`${monthKey}-empty-${i}`}
          className="calendar-day other-month"
        ></div>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      const isToday = DateService.isSameDay(date, today);
      const isSelected =
        tempSelectedDate &&
        DateService.isSameDay(date, new Date(tempSelectedDate));
      const isPast = date < today;

      days.push(
        <div
          key={`${monthKey}-day-${day}`}
          className={`calendar-day ${isToday ? "today" : ""} ${
            isSelected ? "selected" : ""
          } ${isPast ? "disabled" : ""}`}
          onClick={() => !isPast && handleDateSelect(day)}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  // Format time for display
  const formatTimeFromISOString = (isoString) => {
    if (!isoString) return "Pick a time";
    return DateService.formatTime(isoString);
  };

  const reminderText = value ? formatReminderText(value) : null;

  return (
    <div className="reminder-dropdown">
      <div
        ref={inputRef}
        className="reminder-input"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="reminder-icon">🔔</span>
        {reminderText ? (
          <div className="reminder-text">
            <span>Remind me </span>
            <span>{reminderText}</span>
          </div>
        ) : (
          <span>Add reminder</span>
        )}
      </div>
      {isOpen && (
        <div ref={dropdownRef} className="reminder-options">
          <div className="reminder-header">Set reminder</div>
          <div className="calendar-header">
            <div className="month-year-selector">
              {DateService.formatCurrentYear(currentMonth.toISOString())}
            </div>
            <div className="calendar-nav">
              <button className="nav-arrow" onClick={handlePrevMonth}>
                ←
              </button>
              <button className="nav-arrow" onClick={handleNextMonth}>
                →
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {weekDays.map((day) => (
              <div key={day.key} className="weekday-header">
                {day.label}
              </div>
            ))}
            {renderCalendar()}
          </div>
          <div className="custom-date">
            <div
              className="reminder-option"
              onClick={() => setShowTimePicker(true)}
            >
              <span className="reminder-icon">⏰</span>
              <span>{formatTimeFromISOString(value || tempSelectedDate)}</span>
            </div>
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
      {showTimePicker && (
        <div className="time-picker-overlay">
          <TimePickerModal
            initialTime={
              tempSelectedDate
                ? new Date(tempSelectedDate)
                : value
                ? new Date(value)
                : new Date()
            }
            onConfirm={handleTimeSelect}
            onCancel={() => {
              setShowTimePicker(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ReminderDropdown;
