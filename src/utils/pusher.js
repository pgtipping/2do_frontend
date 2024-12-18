import Pusher from "pusher-js";

// Initialize Pusher client
const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  encrypted: true,
});

// Subscribe to todo-app channel
const channel = pusher.subscribe("todo-app");

export const initializePusher = (onNotification) => {
  // Bind to notification events
  channel.bind("notification", (data) => {
    console.log("Received notification:", data);
    if (onNotification) {
      onNotification(data);
    }
  });

  return () => {
    // Cleanup function
    channel.unbind("notification");
    pusher.unsubscribe("todo-app");
  };
};

export default pusher;
