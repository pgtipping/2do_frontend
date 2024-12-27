// Core timezone utilities
import { getUserSettings } from "./userSettings";

export const TimezoneService = {
  // Detect user's current timezone
  detectUserTimezone: () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  // Get user's preferred timezone (from settings or detected)
  getUserTimezone: () => {
    const settings = getUserSettings();
    return settings.preferredTimezone || TimezoneService.detectUserTimezone();
  },

  // Convert date between timezones
  convertBetweenTimezones: (date, fromTimezone, toTimezone) => {
    const originalDate = new Date(date);

    // Create formatter for source timezone
    const fromFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: fromTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Get date parts in source timezone
    const parts = fromFormatter.formatToParts(originalDate);
    const dateParts = {};
    parts.forEach((part) => {
      if (part.type !== "literal") {
        dateParts[part.type] = part.value;
      }
    });

    // Create date in target timezone
    const targetDate = new Date(
      Date.UTC(
        parseInt(dateParts.year),
        parseInt(dateParts.month) - 1,
        parseInt(dateParts.day),
        parseInt(dateParts.hour),
        parseInt(dateParts.minute),
        parseInt(dateParts.second)
      )
    );

    return targetDate;
  },

  // Check if task timezone differs from user timezone
  isTimezoneDifferent: (taskTimezone) => {
    const userTimezone = TimezoneService.getUserTimezone();
    return taskTimezone !== userTimezone;
  },

  // Format timezone for display
  formatTimezoneDisplay: (timezone) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "short",
      })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName").value;
    } catch (error) {
      console.error("Error formatting timezone:", error);
      return timezone;
    }
  },
};

export default TimezoneService;
