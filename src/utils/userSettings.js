// Default user settings
const DEFAULT_SETTINGS = {
  preferredTimezone: null, // Will use detected timezone if null
  showTimezoneIndicator: false,
  autoDetectTimezone: true,
  dateTimePreferences: {
    showSeconds: false,
    use24HourFormat: false,
    showWeekday: true,
  },
};

// Local storage key
const SETTINGS_KEY = "2do_user_settings";

export const UserSettingsService = {
  // Get all user settings
  getUserSettings: () => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
        : DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Error reading user settings:", error);
      return DEFAULT_SETTINGS;
    }
  },

  // Update specific settings
  updateSettings: (updates) => {
    try {
      const current = UserSettingsService.getUserSettings();
      const updated = { ...current, ...updates };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error("Error updating user settings:", error);
      return null;
    }
  },

  // Set timezone preference
  setTimezonePreference: (timezone) => {
    return UserSettingsService.updateSettings({
      preferredTimezone: timezone,
      autoDetectTimezone: false, // Disable auto-detect when manually set
    });
  },

  // Toggle timezone indicator
  toggleTimezoneIndicator: (show) => {
    return UserSettingsService.updateSettings({
      showTimezoneIndicator: show,
    });
  },

  // Toggle automatic timezone detection
  toggleAutoDetectTimezone: (enable) => {
    return UserSettingsService.updateSettings({
      autoDetectTimezone: enable,
      preferredTimezone: enable
        ? null
        : UserSettingsService.getUserSettings().preferredTimezone,
    });
  },

  // Reset settings to default
  resetSettings: () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Error resetting user settings:", error);
      return null;
    }
  },
};

// For backward compatibility
export const getUserSettings = UserSettingsService.getUserSettings;
export default UserSettingsService;
