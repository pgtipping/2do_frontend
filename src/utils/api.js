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

export async function createTodo(task, useLLM = false) {
  try {
    // Ensure task data is properly formatted
    const taskData = useLLM ? { input: task.input } : { title: task };

    const response = await fetch(`${API_BASE_URL}/tasks?useLLM=${useLLM}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    }).catch((error) => {
      // Handle network errors
      throw new Error("Unable to reach server");
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Unable to save task");
    }

    const data = await response.json();
    return data.task;
  } catch (error) {
    console.error("Failed to create todo:", error);
    throw error; // Propagate specific error message to component
  }
}

export async function updateTodo(task, useLLM = false) {
  try {
    // Handle both nested and unnested temporal data
    const temporalData = task.temporal || {
      due_date: task.due_date,
      start_date: task.start_date,
      recurrence: task.recurrence,
      reminder: task.reminder,
    };

    const response = await fetch(
      `${API_BASE_URL}/tasks/${task.id}?useLLM=${useLLM}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          useLLM
            ? {
                input: task.title,
                taskId: task.id,
              }
            : {
                ...task,
                // Always send temporal data at root level for backend
                due_date: temporalData.due_date,
                start_date: temporalData.start_date,
                recurrence: temporalData.recurrence,
                reminder: temporalData.reminder,
                // Remove nested temporal to avoid duplication
                temporal: undefined,
              }
        ),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const updatedTask = data.task;

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
