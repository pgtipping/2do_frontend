import React, { useState, useRef } from "react";
import "./DueDateDropdown.css";
import TimePickerModal from "./TimePickerModal";
import DateService from "../utils/dateUtils";
import UserSettingsService from "../utils/userSettings";

function DueDateDropdown({ value, onChange, isOverdue }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const weekDays = [
    { key: "sun", label: "S" },
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
    { key: "sat", label: "S" },
  ];

  const formatDate = (date) => {
    return DateService.formatCurrentYear(date.toISOString());
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
    // If we have a value, update its time only
    if (value) {
      const existingDate = new Date(value);
      existingDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0,
        0
      );
      onChange(existingDate.toISOString());
    } else {
      // If no value, use today with selected time
      const today = new Date();
      today.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      onChange(today.toISOString());
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

  const dueText = value ? formatDueText(value) : null;

  // Format time for display
  const formatTimeFromISOString = (isoString) => {
    if (!isoString) return "Pick a time";
    return DateService.formatTime(isoString);
  };

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
          <div className="due-date-header">Select date</div>
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
              className="due-date-option"
              onClick={() => setShowTimePicker(true)}
            >
              <span className="calendar-icon">⏰</span>
              <span>{formatTimeFromISOString(tempSelectedDate)}</span>
            </div>
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
      {showTimePicker && (
        <div className="time-picker-overlay">
          <TimePickerModal
            initialTime={
              tempSelectedDate ? new Date(tempSelectedDate) : new Date()
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

export default DueDateDropdown;
