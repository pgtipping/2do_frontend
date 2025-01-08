import React from "react";
import "./ToastContainer.css";

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✕"}
              {toast.type === "warning" && "⚠"}
              {toast.type === "info" && "ℹ"}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
