const API_BASE_URL = "http://localhost:5000/api";

export const parseTask = async (userInput) => {
  try {
    const response = await fetch(`${API_BASE_URL}/parse-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userInput }),
    });

    if (!response.ok) {
      throw new Error("Failed to parse task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error parsing task:", error);
    throw error;
  }
};
