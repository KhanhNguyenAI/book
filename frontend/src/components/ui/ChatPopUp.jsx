// ChatBot.jsx - Book Store Chatbot Component (Comic Style) với tính năng di chuyển
import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, Zap, X, Move, ThumbsUp, ThumbsDown } from "lucide-react";
import chatbotService from "../../services/chatBot";
import { useLanguage } from "../../context/LanguageContext";

const ChatPopUp = ({ className, onClose }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(chatbotService.generateSessionId());
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // Track pending conversation for feedback
  const [pendingConversation, setPendingConversation] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    checkHealth();

    // Center the chat window on mount
    if (chatWindowRef.current) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const chatWidth = chatWindowRef.current.offsetWidth;
      const chatHeight = chatWindowRef.current.offsetHeight;

      setPosition({
        x: (windowWidth - chatWidth) / 2,
        y: (windowHeight - chatHeight) / 3,
      });
    }
  }, []);

  // Drag and drop handlers
  const handleMouseDown = (e) => {
    if (!chatWindowRef.current) return;

    const rect = chatWindowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);

    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const checkHealth = async () => {
    try {
      await chatbotService.checkHealth();
    } catch (error) {
      setError("Cannot connect to API server", error);
    }
  };

  const sendMessage = async (text = input) => {
    if (!text.trim()) return;

    // Clear pending conversation if user sends a new message without feedback
    if (pendingConversation) {
      setPendingConversation(null);
    }

    const userMessageText = text.trim();
    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const response = await chatbotService.sendMessage(userMessageText, sessionId);
      const formattedResponse = chatbotService.formatChatResponse(response);

      const botMessage = {
        id: Date.now() + 1,
        text: formattedResponse.text,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        metadata: formattedResponse.metadata,
        showFeedback: true, // Show feedback UI for this message
      };

      setMessages((prev) => [...prev, botMessage]);
      
      // Store pending conversation for feedback
      setPendingConversation({
        userMessage: userMessageText,
        botResponse: formattedResponse.text,
        botMessageId: botMessage.id,
      });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);

      const errorMessage = {
        id: Date.now() + 1,
        text: err.message || t("sorryEncounteredError"),
        sender: "bot",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (isPositive) => {
    if (!pendingConversation) return;

    try {
      await chatbotService.submitFeedback(
        pendingConversation.userMessage,
        pendingConversation.botResponse,
        isPositive
      );

      // Update message to show feedback was submitted
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingConversation.botMessageId
            ? { ...msg, feedbackSubmitted: true, isPositive, showFeedback: false }
            : msg
        )
      );

      // Clear pending conversation
      setPendingConversation(null);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError(t("failedToSubmitFeedback"));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    { icon: "📚", text: t("showMeAllBooks") },
    { icon: "🔍", text: t("findProgrammingBooks") },
    { icon: "👨‍💼", text: t("businessBooks") },
    { icon: "❤️", text: t("romanceNovels") },
  ];

  return (
    <div
      className={`chatbot-overlay ${className}`}
      style={{ cursor: isDragging ? "grabbing" : "default" }}
    >
      <div
        ref={chatWindowRef}
        className="chatbot-window"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? "grabbing" : "default",
        }}
      >
        {/* Header với tính năng drag */}
        <div
          className="chatbot-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <div className="header-content">
            <div className="drag-handle">
              <Move size={16} />
            </div>
            <div className="bot-avatar">
              <span className="avatar-emoji">🤖</span>
            </div>
            <div className="header-text">
              <h1>{t("aiBookAssistant")}</h1>
              <p>
                {t("yourComicBookBuddy")}{" "}
                {isDragging ? t("dragging") : t("dragMe")}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span>{t("online")}</span>
            </div>
            <button onClick={onClose} className="close-chat-button">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="close-error">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="suggestions-section">
            <p className="suggestions-title">
              <Zap size={16} />
              {t("quickQuestions")}
            </p>
            <div className="suggestions-grid">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion.text)}
                  className="suggestion-button"
                >
                  <span className="suggestion-icon">{suggestion.icon}</span>
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome-section">
              <div className="welcome-emoji">📖</div>
              <h2>{t("welcomeToAIBookAssistant")}</h2>
              <p>
                {t("askMeAboutBooks")}
                📚✨
              </p>
              <div className="quick-actions">
                {[
                  {
                    icon: "📚",
                    text: t("browseBooks"),
                    query: "What books do you have?",
                  },
                  {
                    icon: "🔍",
                    text: t("findByGenre"),
                    query: t("showMeScienceFiction"),
                  },
                  {
                    icon: "👤",
                    text: t("findByAuthor"),
                    query: t("booksByAuthor"),
                  },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(item.query)}
                    className="quick-action-button"
                  >
                    <div className="action-emoji">{item.icon}</div>
                    <div className="action-text">{item.text}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-container ${
                    message.sender === "user" ? "user-message" : "bot-message"
                  }`}
                >
                  <div
                    className={`message-bubble ${
                      message.isError ? "error-bubble" : ""
                    }`}
                  >
                    <p className="message-text">{message.text}</p>

                    {/* Metadata */}
                    {message.metadata && (
                      <div className="message-metadata">
                        {message.metadata.books_found > 0 && (
                          <span className="books-found">
                            📚 {t("foundBooks")} {message.metadata.books_found} {t("booksLabel")}
                          </span>
                        )}
                        {message.metadata.language_detected && (
                          <span className="language-indicator">
                            🌐{" "}
                            {message.metadata.language_detected.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Feedback UI for bot messages */}
                    {message.sender === "bot" && !message.isError && (
                      <div className="feedback-section">
                        {message.showFeedback && !message.feedbackSubmitted ? (
                          <>
                            <span className="feedback-prompt">{t("wasThisResponseHelpful")}</span>
                            <div className="feedback-buttons">
                              <button
                                className="feedback-button feedback-positive"
                                onClick={() => handleFeedback(true)}
                                title={t("helpful")}
                              >
                                <ThumbsUp size={16} />
                                <span>{t("helpful")}</span>
                              </button>
                              <button
                                className="feedback-button feedback-negative"
                                onClick={() => handleFeedback(false)}
                                title={t("notHelpful")}
                              >
                                <ThumbsDown size={16} />
                                <span>{t("notHelpful")}</span>
                              </button>
                            </div>
                          </>
                        ) : message.feedbackSubmitted ? (
                          <div className="feedback-submitted">
                            {message.isPositive ? (
                              <span className="feedback-thanks">✅ {t("thankYouForPositiveFeedback")}</span>
                            ) : (
                              <span className="feedback-thanks">✅ {t("thankYouForFeedback")}</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="message-timestamp">{message.timestamp}</div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <span>{t("searchingThroughBookshelves")}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="input-section">
          <div className="input-container">
            <div className="input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("askMeAboutBooksPlaceholder")}
                disabled={isLoading}
                className="chat-input"
              />
              {input && (
                <button onClick={() => setInput("")} className="clear-input">
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="send-button"
            >
              {isLoading ? (
                <Loader2 className="loading-spinner" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .chatbot-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;

          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 50px;
        }

        .chatbot-window {
          position: absolute;
          width: 500px;
          max-width: 800px;
          height: 70vh;
          min-height: 500px;
          max-height: 80vh;
          background: white;
          border-radius: 25px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 4px #fff,
            0 0 0 8px #ff6b6b, 0 0 0 12px #4ecdc4;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 3px solid #333;
          transition: transform 0.1s ease;
          user-select: none;
          z-index : 2001;
        }

        /* Header Styles */
        .chatbot-header {
          background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #333;
          position: relative;
        }

        .chatbot-header::after {
          content: "";
          position: absolute;
          bottom: -3px;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #4ecdc4, #ff6b6b);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .drag-handle {
          color: white;
          opacity: 0.7;
          cursor: inherit;
          transition: opacity 0.3s ease;
        }

        .chatbot-header:hover .drag-handle {
          opacity: 1;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .close-chat-button {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid #333;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          z-index: 10;
        }

        .close-chat-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .bot-avatar {
          width: 50px;
          height: 50px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #333;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .avatar-emoji {
          font-size: 24px;
        }

        .header-text h1 {
          margin: 0;
          color: white;
          font-size: 20px;
          font-weight: bold;
          text-shadow: 2px 2px 0 #333;
        }

        .header-text p {
          margin: 3px 0 0 0;
          color: #ffeaa7;
          font-size: 12px;
          font-weight: bold;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-weight: bold;
          text-shadow: 1px 1px 0 #333;
          font-size: 12px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          background: #00b894;
          border-radius: 50%;
          border: 2px solid #333;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Error Banner */
        .error-banner {
          background: #ffeaa7;
          border: 2px solid #e17055;
          padding: 10px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-left: 6px solid #e17055;
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #d63031;
          font-weight: bold;
          font-size: 12px;
        }

        .error-icon {
          font-size: 16px;
        }

        .close-error {
          background: none;
          border: none;
          color: #d63031;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
        }

        .close-error:hover {
          background: #fab1a0;
        }

        /* Suggestions */
        .suggestions-section {
          padding: 15px 20px;
          background: #f8f9fa;
          border-bottom: 2px dashed #ddd;
        }

        .suggestions-title {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 0 12px 0;
          color: #2d3436;
          font-weight: bold;
          font-size: 13px;
        }

        .suggestions-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .suggestion-button {
          padding: 8px 12px;
          background: white;
          border: 2px solid #74b9ff;
          border-radius: 18px;
          color: #2d3436;
          cursor: pointer;
          font-size: 11px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .suggestion-button:hover {
          background: #74b9ff;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .suggestion-icon {
          font-size: 12px;
        }

        /* Chat Area */
        .chat-area {
          flex: 1;
          padding: 15px 20px;
          overflow-y: auto;
          background: linear-gradient(180deg, #dfe6e9 0%, #b2bec3 100%);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Welcome Section */
        .welcome-section {
          text-align: center;
          padding: 30px 20px;
          color: #2d3436;
        }

        .welcome-emoji {
          font-size: 50px;
          margin-bottom: 15px;
          display: block;
        }

        .welcome-section h2 {
          margin: 0 0 12px 0;
          color: #2d3436;
          font-size: 24px;
          text-shadow: 2px 2px 0 #fff;
        }

        .welcome-section p {
          margin: 0 0 25px 0;
          color: #636e72;
          font-size: 14px;
          line-height: 1.4;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          max-width: 400px;
          margin: 0 auto;
        }

        .quick-action-button {
          padding: 15px 12px;
          background: white;
          border: 3px solid #fd79a8;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .quick-action-button:hover {
          background: #fd79a8;
          transform: translateY(-3px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        }

        .action-emoji {
          font-size: 20px;
          margin-bottom: 6px;
        }

        .action-text {
          font-size: 11px;
          font-weight: bold;
          color: #2d3436;
        }

        .quick-action-button:hover .action-text {
          color: white;
        }

        /* Message Styles */
        .message-container {
          display: flex;
          flex-direction: column;
          max-width: 70%;
        }

        .user-message {
          align-self: flex-end;
          align-items: flex-end;
        }

        .bot-message {
          align-self: flex-start;
          align-items: flex-start;
        }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 20px;
          border: 2px solid #333;
          position: relative;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          word-wrap: break-word;
        }

        .user-message .message-bubble {
          background: linear-gradient(135deg, #74b9ff, #0984e3);
          color: white;
          border-bottom-right-radius: 5px;
        }

        .bot-message .message-bubble {
          background: white;
          color: #2d3436;
          border-bottom-left-radius: 5px;
        }

        .error-bubble {
          background: #ffeaa7 !important;
          color: #d63031 !important;
          border-color: #e17055 !important;
        }

        .message-text {
          margin: 0;
          line-height: 1.4;
          font-size: 13px;
        }

        .message-metadata {
          margin-top: 6px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .books-found,
        .language-indicator {
          font-size: 10px;
          padding: 2px 6px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          font-weight: bold;
        }

        .message-timestamp {
          font-size: 10px;
          color: #636e72;
          margin-top: 4px;
          font-weight: bold;
        }

        /* Feedback Section */
        .feedback-section {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed rgba(0, 0, 0, 0.1);
        }

        .feedback-prompt {
          display: block;
          font-size: 11px;
          color: #636e72;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .feedback-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .feedback-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: 2px solid #333;
          border-radius: 15px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .feedback-positive {
          background: white;
          color: #00b894;
          border-color: #00b894;
        }

        .feedback-positive:hover {
          background: #00b894;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 184, 148, 0.3);
        }

        .feedback-negative {
          background: white;
          color: #e17055;
          border-color: #e17055;
        }

        .feedback-negative:hover {
          background: #e17055;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(225, 112, 85, 0.3);
        }

        .feedback-submitted {
          margin-top: 4px;
        }

        .feedback-thanks {
          font-size: 10px;
          color: #00b894;
          font-weight: bold;
          font-style: italic;
        }

        /* Typing Indicator */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: white;
          border: 2px solid #333;
          border-radius: 20px;
          border-bottom-left-radius: 5px;
          align-self: flex-start;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .typing-dots {
          display: flex;
          gap: 3px;
        }

        .typing-dot {
          width: 6px;
          height: 6px;
          background: #74b9ff;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        .typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typing {
          0%,
          80%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .typing-indicator span {
          font-size: 11px;
          color: #636e72;
          font-weight: bold;
        }

        /* Input Section */
        .input-section {
          padding: 15px 20px;
          background: white;
          border-top: 3px solid #333;
        }

        .input-container {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .input-wrapper {
          flex: 1;
          position: relative;
        }

        .chat-input {
          width: 100%;
          padding: 12px 40px 12px 12px;
          border: 3px solid #74b9ff;
          border-radius: 20px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          background: #f8f9fa;
          color: black;
          transition: all 0.3s ease;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chat-input:focus {
          border-color: #0984e3;
          background: white;
          box-shadow: 0 0 0 3px rgba(116, 185, 255, 0.3);
        }

        .chat-input:disabled {
          background: #dfe6e9;
          border-color: #b2bec3;
          color: #636e72;
        }

        .clear-input {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #636e72;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
        }

        .clear-input:hover {
          background: #dfe6e9;
        }

        .send-button {
          padding: 12px;
          background: linear-gradient(135deg, #00b894, #00a085);
          border: 3px solid #333;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #00a085, #008c75);
          transform: scale(1.05);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        .send-button:disabled {
          background: #b2bec3;
          border-color: #636e72;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Scrollbar Styling */
        .chat-area::-webkit-scrollbar {
          width: 6px;
        }

        .chat-area::-webkit-scrollbar-track {
          background: #dfe6e9;
        }

        .chat-area::-webkit-scrollbar-thumb {
          background: #74b9ff;
          border-radius: 3px;
        }

        .chat-area::-webkit-scrollbar-thumb:hover {
          background: #0984e3;
        }
      `}</style>
    </div>
  );
};

export default ChatPopUp;
