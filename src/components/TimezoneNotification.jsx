import React, { useState } from "react";
import TimezoneService from "../utils/timezoneUtils";
import UserSettingsService from "../utils/userSettings";
import "./TimezoneNotification.css";

const TimezoneNotification = ({ taskTimezone, onTimezoneChange }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [preference, setPreference] = useState(null);

  const userTimezone = TimezoneService.getUserTimezone();
  const formattedTaskTz = TimezoneService.formatTimezoneDisplay(taskTimezone);
  const formattedUserTz = TimezoneService.formatTimezoneDisplay(userTimezone);

  const handleKeepOriginal = () => {
    if (preference === "always") {
      UserSettingsService.updateSettings({ keepOriginalTimezone: true });
    }
    setIsVisible(false);
  };

  const handleConvertTimezone = () => {
    if (preference === "always") {
      UserSettingsService.updateSettings({ convertToLocalTimezone: true });
    }
    onTimezoneChange(userTimezone);
    setIsVisible(false);
  };

  if (!isVisible || !TimezoneService.isTimezoneDifferent(taskTimezone)) {
    return null;
  }

  return (
    <div className="timezone-notification">
      <div className="notification-content">
        <p>
          This task was created in a different timezone ({formattedTaskTz}).
          You're currently in {formattedUserTz}.
        </p>
        <div className="notification-actions">
          <select
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            className="preference-select"
          >
            <option value={null}>Just this once</option>
            <option value="always">Remember my choice</option>
          </select>
          <div className="button-group">
            <button onClick={handleKeepOriginal} className="btn-secondary">
              Keep Original Time
            </button>
            <button onClick={handleConvertTimezone} className="btn-primary">
              Convert to My Timezone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimezoneNotification;
