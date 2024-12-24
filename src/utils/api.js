const API_BASE_URL = "http://localhost:5000/api";

export async function fetchTodos() {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    throw error;
  }
}

export async function createTodo(task) {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to create todo:", error);
    throw error;
  }
}

export async function updateTodo(task) {
  try {
    // Handle both nested and unnested temporal data
    const temporalData = task.temporal || {
      due_date: task.due_date,
      start_date: task.start_date,
      recurrence: task.recurrence,
      reminder: task.reminder,
    };

    const response = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: task.id,
        ...task,
        // Always send temporal data at root level for backend
        due_date: temporalData.due_date,
        start_date: temporalData.start_date,
        recurrence: temporalData.recurrence,
        reminder: temporalData.reminder,
        // Remove nested temporal to avoid duplication
        temporal: undefined,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const updatedTask = await response.json();

    // Reconstruct temporal object for frontend compatibility
    return {
      ...updatedTask,
      temporal: {
        due_date: updatedTask.due_date,
        start_date: updatedTask.start_date,
        recurrence: updatedTask.recurrence,
        reminder: updatedTask.reminder,
      },
    };
  } catch (error) {
    console.error("Failed to update todo:", error);
    throw error;
  }
}

export async function deleteTodo(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to delete todo:", error);
    throw error;
  }
}
