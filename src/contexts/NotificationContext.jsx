import React, { createContext, useContext, useState, useEffect } from "react";
import { initializePusher } from "../utils/pusher";
import ToastContainer from "../components/ToastContainer";

const NotificationContext = createContext();
const STORAGE_KEY = "2do_notifications";

export function NotificationProvider({ children }) {
  // Initialize notifications from localStorage
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).filter((n) => !n.isRead).length : 0;
  });

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    // Initialize Pusher and bind to notifications
    const cleanup = initializePusher((data) => {
      try {
        console.log("Received notification:", data);

        const notification = {
          id: Date.now(),
          type: data.type,
          message: data.data.message,
          timestamp: data.timestamp,
          isRead: false,
          data: data.data,
        };
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch (error) {
        console.error("Error processing notification:", error);
      }
    });

    // Fetch existing notifications only if localStorage is empty
    if (notifications.length === 0) {
      fetchNotifications();
    }

    // Cleanup Pusher subscription on unmount
    return () => {
      cleanup();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/notifications");
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notificationId}/mark-read`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);
  };

  const clearNotifications = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/notifications/clear",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications([]);
        localStorage.removeItem(STORAGE_KEY);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const showNotification = (message, type = "info") => {
    // Create persistent notification in the list
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Create temporary toast notification
    const toast = {
      id: Date.now() + 1, // Ensure unique ID
      message,
      type,
    };
    setToasts((prev) => [toast, ...prev].slice(0, 3)); // Keep max 3 toasts

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      removeToast(toast.id);
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        showNotification,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
