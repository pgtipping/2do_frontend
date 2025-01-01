import React, { useState, useRef, useEffect } from "react";
import "./TaskInput.css";
import TaskConversation from "./TaskConversation";
import { initializePusher } from "../utils/pusher";
import {
  getCommonTaskTimes,
  getPreferredDays,
  findRelatedTasks,
  getCategoryDistribution,
} from "../utils/TaskPatternAnalysis";

function TaskInput({ onAddTodo, selectedTask, onUpdateTask, todos }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [llmResponse, setLlmResponse] = useState(null);
  const [conversationContext, setConversationContext] = useState({});
  const inputRef = useRef(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [recentActions, setRecentActions] = useState([]);

  useEffect(() => {
    if (selectedTask) {
      setText(selectedTask.title || selectedTask.text || "");
      setIsUpdateMode(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setText("");
      setIsUpdateMode(false);
    }
  }, [selectedTask]);

  // Initialize speech synthesis
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const defaultVoice = voices.find((voice) =>
          voice.lang.startsWith("en-")
        );
      };

      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      console.warn("Speech synthesis not supported");
    }
  }, []);

  const initializeSpeechRecognition = () => {
    if (!recognitionRef.current) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        let finalTranscript = "";
        let lastSpeechTime = Date.now();
        let processingTimeout = null;
        let isStartPhrase = false;
        let speechBuffer = [];

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
              .trim()
              .toLowerCase();

            if (transcript === "add a task" || transcript === "add task") {
              isStartPhrase = true;
              continue;
            }

            if (event.results[i].isFinal) {
              if (!isStartPhrase || transcript.length > 10) {
                speechBuffer.push(transcript);
                lastSpeechTime = Date.now();
              }
              isStartPhrase = false;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentText = [...speechBuffer, interimTranscript]
            .join(" ")
            .trim();
          setText(currentText);

          if (processingTimeout) {
            clearTimeout(processingTimeout);
          }

          processingTimeout = setTimeout(() => {
            if (Date.now() - lastSpeechTime > 2500 && speechBuffer.length > 0) {
              const finalText = speechBuffer.join(" ").trim();

              if (
                finalText.length > 5 &&
                !["add a task", "add task"].includes(finalText)
              ) {
                handleAddTask(finalText);
                speechBuffer = [];
                recognitionRef.current.stop();
              }
            }
          }, 2500);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "no-speech") {
            speakToUser(
              "Sorry, I had trouble understanding that. Please try again."
            );
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          if (speechBuffer.length === 0) {
            recognitionRef.current.start();
          } else {
            setIsListening(false);
          }
        };
      }
    }
  };

  const speakToUser = (message) => {
    try {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(message);
      speech.lang = "en-US";
      speech.rate = 1.0;
      speech.pitch = 1.0;
      speech.volume = 1.0;

      window.speechSynthesis.speak(speech);
    } catch (error) {
      console.error("Error in speech synthesis:", error);
    }
  };

  const toggleVoiceInput = async () => {
    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }

    try {
      if (!isListening) {
        const response = await fetch(
          "http://localhost:5000/api/voice-feedback",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "start_listening",
            }),
          }
        );

        const data = await response.json();
        recognitionRef.current.start();
        setIsListening(true);

        if (data.feedback?.voice) {
          speakToUser(data.feedback.voice);
        }
      } else {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } catch (error) {
      console.error("Error in voice input:", error);
    }
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
  };

  // Clean up old actions periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setRecentActions((prev) =>
        prev.filter((action) => new Date(action.timestamp) > fiveMinutesAgo)
      );
    }, 60000); // Run every minute

    return () => clearInterval(cleanup);
  }, []);

  const handleAddTask = async (inputText = text) => {
    if (!inputText.trim()) return;

    try {
      setIsProcessing(true);
      setFeedback({
        type: "pending",
        display: "Processing...",
      });

      const response = await fetch("http://localhost:5000/api/parse-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: inputText,
          sessionContext: conversationContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setFeedback({
          type: "error",
          display: errorData.feedback?.display || "Failed to create task",
        });
        return;
      }

      const data = await response.json();

      // Update conversation context
      if (data.task) {
        setConversationContext((prev) => ({
          ...prev,
          lastTaskId: data.task.id,
          lastAction: isUpdateMode ? "update" : "create",
        }));
      }

      // Set LLM response for conversation
      setLlmResponse(data.llm_response);

      if (isUpdateMode && selectedTask) {
        onUpdateTask(selectedTask.id, data.task);
        if (isListening) {
          speakToUser(`Updated task: ${data.task.title}`);
        }
        setFeedback({
          type: "success",
          display: data.feedback?.display || "Task updated successfully",
        });
      } else {
        const newTodo = await onAddTodo(data.task);
        if (newTodo) {
          if (isListening) {
            speakToUser(`Created task: ${data.task.title}`);
          }
          setFeedback({
            type: "success",
            display: data.feedback?.display || "Task created successfully",
          });
        } else {
          setFeedback({
            type: "error",
            display: "Failed to create task",
          });
        }
      }

      // Only clear text if no follow-up needed
      if (!data.llm_response?.message) {
        setText("");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      setFeedback({
        type: "error",
        display: "Failed to create task",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to resolve relative dates
  const resolveRelativeDate = (input) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.setDate(now.getDate() + 1))
      .toISOString()
      .split("T")[0];

    // Replace relative date terms with actual dates
    return input.replace(
      /\b(today|tomorrow|next week|next month)\b/gi,
      (match) => {
        switch (match.toLowerCase()) {
          case "today":
            return today;
          case "tomorrow":
            return tomorrow;
          case "next week":
            const nextWeek = new Date(now.setDate(now.getDate() + 7));
            return nextWeek.toISOString().split("T")[0];
          case "next month":
            const nextMonth = new Date(now.setMonth(now.getMonth() + 1));
            return nextMonth.toISOString().split("T")[0];
          default:
            return match;
        }
      }
    );
  };

  const handleKeyPress = async (e) => {
    if (e.key === "Enter" && text.trim()) {
      const input = text.trim().toLowerCase();
      if (
        input === "add a task" ||
        input === "add task" ||
        input.endsWith("...") ||
        input.length < 5
      ) {
        return;
      }
      e.preventDefault();
      await handleAddTask();
    }
  };

  const handleAnswerQuestion = async (type, answer) => {
    try {
      setIsProcessing(true);
      setFeedback({
        type: "pending",
        display: "Processing...",
      });

      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: answer,
          sessionContext: {
            ...conversationContext,
            responseType: type,
            previousMessage: llmResponse?.message,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setFeedback({
          type: "error",
          display: errorData.feedback?.display || "Failed to process response",
        });
        return;
      }

      const data = await response.json();

      // Update conversation context
      setConversationContext((prev) => ({
        ...prev,
        lastResponse: answer,
        lastResponseType: type,
      }));

      // Update LLM response for continued conversation
      setLlmResponse(data.llm_response);

      setFeedback({
        type: "success",
        display: data.feedback?.display || "Response processed successfully",
      });

      // Only clear text if conversation is complete
      if (!data.llm_response?.message) {
        setText("");
        setLlmResponse(null);
        setConversationContext({});
      }
    } catch (error) {
      console.error("Error processing response:", error);
      setFeedback({
        type: "error",
        display: "Failed to process response",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Add notification handling
  useEffect(() => {
    const cleanup = initializePusher((data) => {
      if (data.type && data.data) {
        try {
          fetch("http://localhost:5000/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: data.type,
              message: data.data.message,
              taskId: data.data.taskId,
              timestamp: new Date().toISOString(),
              status: "unread",
              priority: data.data.priority || "normal",
              duration: data.data.duration || 5000,
            }),
          });

          if (isListening && data.data.feedback?.voice) {
            speakToUser(data.data.feedback.voice);
          }
        } catch (error) {
          console.error("Error saving notification:", error);
        }
      }
    });

    return () => cleanup();
  }, [isListening]);

  return (
    <div className="task-input">
      <div className="task-input-container">
        <input
          type="text"
          className="task-input-field"
          placeholder={
            isListening
              ? "Listening..."
              : "Add a task (try voice input or type naturally)"
          }
          value={text}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isProcessing || isListening}
          ref={inputRef}
        />
        <button
          className={`voice-input-button ${isListening ? "listening" : ""}`}
          onClick={toggleVoiceInput}
          title="Use voice input"
          disabled={isProcessing}
        >
          🎤
        </button>
        <button
          className="add-task-button"
          onClick={() => handleAddTask()}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : isUpdateMode ? "Update" : "Add"}
        </button>
      </div>
      <TaskConversation
        feedback={feedback}
        llm_response={llmResponse}
        onAnswerQuestion={handleAnswerQuestion}
      />
    </div>
  );
}

export default TaskInput;
