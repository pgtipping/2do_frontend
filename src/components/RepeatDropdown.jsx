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
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [interval, setInterval] = useState(1);
  const [intervalType, setIntervalType] = useState("weeks");
  const [selectedDays, setSelectedDays] = useState([]);

  const parseCustomValue = (value) => {
    if (!value || !value.includes("custom:")) return null;
    try {
      const [_, data] = value.split("custom:");
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  };

  const formatCustomRepeat = (data) => {
    if (!data) return "";
    const { interval, type, days } = data;
    const plural = interval > 1 ? "s" : "";

    if (type === "weeks" && days?.length > 0) {
      const dayNames = days
        .map((i) => WEEKDAYS_FULL[i])
        .reduce((acc, day, i, arr) => {
          if (i === 0) return day;
          if (i === arr.length - 1) return `${acc} & ${day}`;
          return `${acc}, ${day}`;
        });
      return `Every ${interval} week${plural}\n${dayNames}`;
    }

    return `Every ${interval} ${type.slice(0, -1)}${plural}`;
  };

  const handleSave = () => {
    if (intervalType === "weeks" && selectedDays.length === 0) {
      return; // Don't save if no weekdays are selected for weekly repeat
    }

    const customData = {
      interval,
      type: intervalType,
      ...(intervalType === "weeks" && { days: selectedDays }),
    };
    onChange(`custom:${JSON.stringify(customData)}`);
    setIsCustomizing(false);
    setIsOpen(false);
  };

  const handleOptionClick = (option) => {
    if (option === "custom") {
      setIsCustomizing(true);
    } else {
      onChange(option);
      setIsOpen(false);
    }
  };

  const toggleDay = (dayIndex) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const incrementInterval = () => {
    setInterval((prev) => prev + 1);
  };

  const decrementInterval = () => {
    setInterval((prev) => Math.max(1, prev - 1));
  };

  const customValue = parseCustomValue(value);
  const displayText = customValue
    ? formatCustomRepeat(customValue)
    : value || "Repeat";

  return (
    <div className="repeat-dropdown">
      <div className="repeat-input" onClick={() => setIsOpen(!isOpen)}>
        <span className="repeat-icon">🔄</span>
        <div className="repeat-text">{displayText}</div>
      </div>
      {isOpen && !isCustomizing && (
        <div className="repeat-options">
          <div className="repeat-header">Repeat</div>
          <div
            className="repeat-option"
            onClick={() => handleOptionClick("daily")}
          >
            <span className="repeat-icon">📅</span>
            Daily
          </div>
          <div
            className="repeat-option"
            onClick={() => handleOptionClick("weekly")}
          >
            <span className="repeat-icon">📅</span>
            Weekly
          </div>
          <div
            className="repeat-option"
            onClick={() => handleOptionClick("monthly")}
          >
            <span className="repeat-icon">📅</span>
            Monthly
          </div>
          <div
            className="repeat-option"
            onClick={() => handleOptionClick("yearly")}
          >
            <span className="repeat-icon">📅</span>
            Yearly
          </div>
          <div
            className="repeat-option custom"
            onClick={() => handleOptionClick("custom")}
          >
            <span className="repeat-icon">⚙️</span>
            Custom
          </div>
        </div>
      )}
      {isOpen && isCustomizing && (
        <div className="repeat-custom">
          <div className="repeat-header">Custom</div>
          <div className="repeat-custom-content">
            <div className="repeat-interval">
              <div className="number-input-container">
                <input
                  type="number"
                  min="1"
                  value={interval}
                  onChange={(e) =>
                    setInterval(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
                <div className="number-controls">
                  <button
                    className="number-control-btn"
                    onClick={incrementInterval}
                    type="button"
                  >
                    ▲
                  </button>
                  <button
                    className="number-control-btn"
                    onClick={decrementInterval}
                    type="button"
                  >
                    ▼
                  </button>
                </div>
              </div>
              <select
                value={intervalType}
                onChange={(e) => {
                  setIntervalType(e.target.value);
                  if (e.target.value !== "weeks") {
                    setSelectedDays([]);
                  }
                }}
              >
                {INTERVAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {intervalType === "weeks" && (
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
            )}
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={intervalType === "weeks" && selectedDays.length === 0}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepeatDropdown;
