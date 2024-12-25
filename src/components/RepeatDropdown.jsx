import React, { useState } from "react";
import "./RepeatDropdown.css";

const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const INTERVAL_TYPES = ["days", "weeks", "months", "years"];

function RepeatDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");

  // Initialize state from value prop
  React.useEffect(() => {
    if (value) {
      if (
        value.toLowerCase().includes("day") &&
        !["daily", "weekday"].includes(value.toLowerCase())
      ) {
        // Parse selected days from the value
        const daysString = value.toLowerCase();
        const newSelectedDays = WEEKDAYS_FULL.map((day, index) =>
          daysString.includes(day.toLowerCase()) ? index : -1
        ).filter((index) => index !== -1);

        setSelectedDays(newSelectedDays);
        setSelectedPeriod("");
      } else {
        // Handle period options (Daily, Weekly, Monthly, etc.)
        setSelectedPeriod(value);
        setSelectedDays([]);
      }
    } else {
      setSelectedPeriod("");
      setSelectedDays([]);
    }
  }, [value]);

  const formatDisplayText = () => {
    if (selectedDays.length > 0) {
      const dayNames = selectedDays
        .map((index) => WEEKDAYS_FULL[index])
        .map((day) => day + "s")
        .join(", ");
      return dayNames;
    }

    if (selectedPeriod) {
      return selectedPeriod;
    }

    return "Repeat";
  };

  const handleOptionClick = (option) => {
    setSelectedPeriod(option);
    setSelectedDays([]);
    onChange(option);
    setIsOpen(false);
  };

  const toggleDay = (dayIndex) => {
    const newSelectedDays = selectedDays.includes(dayIndex)
      ? selectedDays.filter((d) => d !== dayIndex)
      : [...selectedDays, dayIndex].sort();

    setSelectedDays(newSelectedDays);
    setSelectedPeriod("");

    if (newSelectedDays.length > 0) {
      // Send singular form for storage
      const dayNames = newSelectedDays
        .map((index) => WEEKDAYS_FULL[index])
        .join(", ");
      onChange(dayNames);
    } else {
      onChange("");
    }
  };

  return (
    <div className="repeat-dropdown">
      <div className="repeat-input" onClick={() => setIsOpen(!isOpen)}>
        <span className="repeat-icon">🔄</span>
        <div className="repeat-text">{formatDisplayText()}</div>
      </div>
      {isOpen && (
        <div className="repeat-options">
          <div className="repeat-header">Set repeat</div>
          <div className="period-selector">
            <div
              className={`period-option ${
                selectedPeriod === "Daily" ? "selected" : ""
              }`}
              onClick={() => handleOptionClick("Daily")}
            >
              Daily
            </div>
            <div
              className={`period-option ${
                selectedPeriod === "Weekly" ? "selected" : ""
              }`}
              onClick={() => handleOptionClick("Weekly")}
            >
              Weekly
            </div>
            <div
              className={`period-option ${
                selectedPeriod === "Monthly" ? "selected" : ""
              }`}
              onClick={() => handleOptionClick("Monthly")}
            >
              Monthly
            </div>
          </div>
          <div className="period-selector">
            <div
              className={`period-option ${
                selectedPeriod === "Bi-weekly" ? "selected" : ""
              }`}
              onClick={() => handleOptionClick("Bi-weekly")}
            >
              Bi-weekly
            </div>
            <div
              className={`period-option ${
                selectedPeriod === "Yearly" ? "selected" : ""
              }`}
              onClick={() => handleOptionClick("Yearly")}
            >
              Yearly
            </div>
            <div
              className={`period-option ${
                selectedPeriod === "Quarterly" ? "selected" : ""
              }`}
              onClick={() => handleOptionClick("Quarterly")}
            >
              Quarterly
            </div>
          </div>
          <div className="section-label">Select days</div>
          <div className="weekday-selector">
            {WEEKDAYS_SHORT.map((day, index) => (
              <button
                key={day}
                className={`weekday-btn ${
                  selectedDays.includes(index) ? "selected" : ""
                }`}
                onClick={() => toggleDay(index)}
              >
                {day}
              </button>
            ))}
          </div>
          {selectedDays.length > 0 && (
            <button className="save-btn" onClick={() => setIsOpen(false)}>
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RepeatDropdown;
