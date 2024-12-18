/**
 * Analyzes tasks to find common scheduling patterns
 */

/**
 * Extract common times when tasks are scheduled
 * @param {Array} tasks - Array of tasks to analyze
 * @returns {Object} Common times and their frequency
 */
export const getCommonTaskTimes = (tasks) => {
  const timeMap = new Map();

  tasks.forEach((task) => {
    if (task.dueDate) {
      const time = new Date(task.dueDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      timeMap.set(time, (timeMap.get(time) || 0) + 1);
    }
  });

  // Convert to array and sort by frequency
  return Array.from(timeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) // Top 3 most common times
    .map(([time, count]) => ({
      time,
      frequency: count,
      percentage: Math.round((count / tasks.length) * 100),
    }));
};

/**
 * Analyze which days of the week are preferred for tasks
 * @param {Array} tasks - Array of tasks to analyze
 * @returns {Object} Preferred days and their frequency
 */
export const getPreferredDays = (tasks) => {
  const dayMap = new Map();
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  tasks.forEach((task) => {
    if (task.dueDate) {
      const day = daysOfWeek[new Date(task.dueDate).getDay()];
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
  });

  return Array.from(dayMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([day, count]) => ({
      day,
      frequency: count,
      percentage: Math.round((count / tasks.length) * 100),
    }));
};

/**
 * Get tasks that might be related to the input
 * @param {Array} tasks - All tasks
 * @param {string} input - User input text
 * @returns {Array} Related tasks
 */
export const findRelatedTasks = (tasks, input) => {
  const words = input.toLowerCase().split(" ");

  return tasks
    .filter((task) => {
      const taskText = `${task.text} ${task.description || ""}`.toLowerCase();
      return words.some((word) => word.length > 3 && taskText.includes(word));
    })
    .slice(-3); // Last 3 related tasks
};

/**
 * Get category distribution of tasks
 * @param {Array} tasks - Array of tasks
 * @returns {Object} Category distribution
 */
export const getCategoryDistribution = (tasks) => {
  const categoryMap = new Map();

  tasks.forEach((task) => {
    const categories = task.categories || [];
    categories.forEach((category) => {
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
  });

  return Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / tasks.length) * 100),
    }));
};
