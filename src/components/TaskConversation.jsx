import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./TaskConversation.css";

const TaskConversation = ({ feedback, llm_response, onAnswerQuestion }) => {
  const [conversationState, setConversationState] = useState({
    messages: [],
    isTyping: false,
    context: {
      currentTask: null,
      lastQuestion: null,
      pendingQuestions: [],
    },
  });

  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle new LLM responses
  useEffect(() => {
    if (llm_response?.message) {
      setConversationState((prev) => ({
        ...prev,
        isTyping: true,
      }));

      // Simulate natural typing delay
      setTimeout(() => {
        try {
          let messageContent = llm_response.message;

          // Add the new message to the conversation
          setConversationState((prev) => ({
            messages: [
              ...prev.messages,
              {
                type: "assistant",
                content: messageContent,
                timestamp: new Date(),
              },
            ],
            isTyping: false,
            context: prev.context,
          }));
        } catch (e) {
          console.error("Error processing LLM response:", e);
          setConversationState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                type: "assistant",
                content: "I apologize, but I couldn't process that properly.",
                timestamp: new Date(),
              },
            ],
            isTyping: false,
          }));
        }
      }, 1000);
    }
  }, [llm_response]);

  // Handle user input
  const handleUserInput = (text) => {
    // Add user message to conversation
    setConversationState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          type: "user",
          content: text,
          timestamp: new Date(),
        },
      ],
      context: {
        ...prev.context,
        lastQuestion: prev.context.pendingQuestions[0],
        pendingQuestions: prev.context.pendingQuestions.slice(1),
      },
    }));

    // Send to parent handler
    onAnswerQuestion("user_response", text);
  };

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [conversationState.messages]);

  // Handle error feedback
  useEffect(() => {
    if (feedback?.type === "error") {
      setConversationState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            type: "error",
            content: feedback.display,
            timestamp: new Date(),
          },
        ],
      }));
    }
  }, [feedback]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        <AnimatePresence>
          {conversationState.messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`message ${msg.type}`}
            >
              <div className="message-content">{msg.content}</div>
              {msg.timestamp && (
                <div className="message-timestamp">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </motion.div>
          ))}

          {conversationState.isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="typing-indicator"
            >
              <span></span>
              <span></span>
              <span></span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      <div className="message-input-container">
        <textarea
          className="message-input"
          placeholder="Type your response..."
          rows="1"
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (e.target.value.trim()) {
                handleUserInput(e.target.value.trim());
                e.target.value = "";
                e.target.style.height = "inherit";
              }
            }
          }}
          onChange={(e) => {
            // Auto-grow textarea
            e.target.style.height = "inherit";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
        />
        <button
          className="send-button"
          onClick={(e) => {
            const textarea = e.target.previousElementSibling;
            if (textarea.value.trim()) {
              handleUserInput(textarea.value.trim());
              textarea.value = "";
              textarea.style.height = "inherit";
            }
          }}
        >
          <span className="send-icon">↵</span>
        </button>
      </div>
    </div>
  );
};

// Helper function to generate response from parsed JSON
function generateResponseFromParsed(parsed) {
  const task = parsed.task || {};
  const analysis = parsed.analysis || {};
  let conversation = [];

  // Task understanding
  if (task.title) {
    conversation.push(`I understand you want to ${task.title.toLowerCase()}.`);
  }

  // Task description if available
  if (task.description) {
    conversation.push(`Here's what I've noted: ${task.description}`);
  }

  // Priority and reasoning
  if (task.priority?.level) {
    conversation.push(
      `I've set this as a ${task.priority.level} priority task.`
    );
    if (task.priority?.reasoning) {
      conversation.push(`Here's why: ${task.priority.reasoning}`);
    }
  }

  // Temporal information
  if (task.temporal?.due_date || task.due_date) {
    const dueDate = new Date(task.temporal?.due_date || task.due_date);
    conversation.push(`This task is due on ${dueDate.toLocaleDateString()}.`);
  }

  // Missing information
  if (analysis.missing_info?.length > 0) {
    conversation.push(
      "\nTo help you better organize this task, I have a few questions:"
    );
    analysis.missing_info.forEach((q) => conversation.push(`• ${q}`));
  }

  // Task insights
  if (analysis.insights?.length > 0) {
    conversation.push("\nBased on your task history:");
    analysis.insights.forEach((insight) => conversation.push(`• ${insight}`));
  }

  // Task suggestions
  if (analysis.suggestions?.length > 0) {
    conversation.push("\nI have some suggestions that might help:");
    analysis.suggestions.forEach((suggestion) =>
      conversation.push(`• ${suggestion}`)
    );
  }

  return conversation.join("\n");
}

export default TaskConversation;
