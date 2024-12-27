import React, { useState } from "react";
import "./TimePickerModal.css";

function TimePickerModal({ initialTime, onConfirm, onCancel }) {
  const [hour, setHour] = useState(
    initialTime ? initialTime.getHours() % 12 || 12 : 12
  );
  const [minute, setMinute] = useState(
    initialTime ? initialTime.getMinutes() : 0
  );
  const [isPM, setIsPM] = useState(
    initialTime ? initialTime.getHours() >= 12 : false
  );

  const handleHourChange = (value) => {
    let newHour = parseInt(value, 10);
    if (isNaN(newHour)) return;
    if (newHour < 1) newHour = 12;
    if (newHour > 12) newHour = 1;
    setHour(newHour);
  };

  const handleMinuteChange = (value) => {
    let newMinute = parseInt(value, 10);
    if (isNaN(newMinute)) return;
    if (newMinute < 0) newMinute = 59;
    if (newMinute > 59) newMinute = 0;
    setMinute(newMinute);
  };

  const handleConfirm = () => {
    const date = initialTime ? new Date(initialTime) : new Date();
    let hours = hour;
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    date.setHours(hours, minute, 0, 0);
    onConfirm(date);
  };

  return (
    <div className="time-picker-modal">
      <div className="time-picker-header">Enter time</div>
      <div className="time-picker-inputs">
        <div className="time-input-group">
          <input
            type="text"
            className="time-input"
            value={hour.toString().padStart(2, "0")}
            onChange={(e) => handleHourChange(e.target.value)}
          />
          <label>Hour</label>
        </div>
        <div className="time-separator">:</div>
        <div className="time-input-group">
          <input
            type="text"
            className="time-input"
            value={minute.toString().padStart(2, "0")}
            onChange={(e) => handleMinuteChange(e.target.value)}
          />
          <label>Minute</label>
        </div>
        <div className="meridiem-toggle">
          <button
            className={`meridiem-btn ${!isPM ? "active" : ""}`}
            onClick={() => setIsPM(false)}
          >
            AM
          </button>
          <button
            className={`meridiem-btn ${isPM ? "active" : ""}`}
            onClick={() => setIsPM(true)}
          >
            PM
          </button>
        </div>
      </div>
      <div className="time-picker-actions">
        <button className="time-picker-btn cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="time-picker-btn confirm" onClick={handleConfirm}>
          OK
        </button>
      </div>
    </div>
  );
}

export default TimePickerModal;
