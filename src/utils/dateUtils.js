import TimezoneService from "./timezoneUtils";

export const DateService = {
  // Format date for current year: "Mon, Dec 25"
  formatCurrentYear: (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  },

  // Format date for different year: "Dec 25, 2024"
  formatDifferentYear: (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },

  // Format time: "3 PM" or "3:30 PM"
  formatTime: (isoString) => {
    const date = new Date(isoString);
    const minutes = date.getMinutes();

    // If minutes are 0, show only hour
    if (minutes === 0) {
      return date
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
        })
        .replace(":00", ""); // Remove ":00"
    }

    // Show hours and minutes
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  },

  // Helper to check if two dates are the same day
  isSameDay: (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  },

  // Smart format based on date context
  formatTaskDate: (
    isoString,
    { includeTime = true, showTimezone = false } = {}
  ) => {
    const date = new Date(isoString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let formattedDate;
    let formattedTime = "";

    // Handle today and tomorrow
    if (DateService.isSameDay(date, now)) {
      formattedDate = "Today";
    } else if (DateService.isSameDay(date, tomorrow)) {
      formattedDate = "Tomorrow";
    } else {
      // Use year-based formatting
      formattedDate =
        date.getFullYear() === now.getFullYear()
          ? DateService.formatCurrentYear(isoString)
          : DateService.formatDifferentYear(isoString);
    }

    // Add time if requested and available
    if (includeTime) {
      formattedTime = ` at ${DateService.formatTime(isoString)}`;
    }

    // Add timezone if requested and different from user's timezone
    let timezoneDisplay = "";
    if (
      showTimezone &&
      TimezoneService.isTimezoneDifferent(date.getTimezoneOffset())
    ) {
      timezoneDisplay = ` (${TimezoneService.formatTimezoneDisplay(
        date.getTimezoneOffset()
      )})`;
    }

    return `${formattedDate}${formattedTime}${timezoneDisplay}`;
  },

  // Convert date to ISO string in user's timezone
  toUserTimezoneISO: (date) => {
    const userTimezone = TimezoneService.getUserTimezone();
    return TimezoneService.convertBetweenTimezones(
      date,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      userTimezone
    ).toISOString();
  },

  // Parse ISO string to user's timezone
  parseInUserTimezone: (isoString) => {
    const userTimezone = TimezoneService.getUserTimezone();
    return TimezoneService.convertBetweenTimezones(
      isoString,
      "UTC",
      userTimezone
    );
  },
};

export default DateService;
