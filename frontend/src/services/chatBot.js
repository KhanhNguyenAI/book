// services/chatbotService.js
// Service layer for chatbot API interactions

import api from "./axios";

class ChatbotService {
  constructor() {
    this.baseURL = "/bot"; // Adjust based on your API routes
  }

  // ============ CHAT METHODS ============

  /**
   * Send message to chatbot
   * @param {string} message - User message
   * @param {string} sessionId - Session identifier
   * @returns {Promise} Chat response
   */
  async sendMessage(message, sessionId = null) {
    try {
      console.log("🤖 [Chatbot] Sending message:", { message, sessionId });

      const payload = {
        message: message.trim(),
        session_id: sessionId || `session_${Date.now()}`,
      };

      const response = await api.post("/chat", payload);
      console.log("✅ [Chatbot] Message response:", response.data);

      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Send message error:", error);
      throw this._handleError(error);
    }
  }

  /**
   * Detect language of text
   * @param {string} text - Text to analyze
   * @returns {Promise} Language detection result
   */
  async detectLanguage(text) {
    try {
      console.log(
        "🌐 [Chatbot] Detecting language for text:",
        text.substring(0, 50) + "..."
      );

      const response = await api.post("/detect-language", { text });
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Language detection error:", error);
      throw this._handleError(error);
    }
  }

  // ============ BOOK METHODS ============

  /**
   * Get all books from database
   * @returns {Promise} List of books
   */
  async getAllBooks() {
    try {
      console.log("📚 [Chatbot] Fetching all books");

      const response = await api.get("/books");
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Get books error:", error);
      throw this._handleError(error);
    }
  }

  /**
   * Search books by query
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @returns {Promise} Search results
   */
  async searchBooks(query, limit = 10) {
    try {
      console.log("🔍 [Chatbot] Searching books:", { query, limit });

      // Adjust this endpoint based on your API
      const response = await api.get("/books/search", {
        params: { q: query, limit },
      });
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Search books error:", error);
      throw this._handleError(error);
    }
  }

  // ============ STATISTICS METHODS ============

  /**
   * Get chatbot statistics
   * @returns {Promise} Statistics data
   */
  async getStats() {
    try {
      console.log("📊 [Chatbot] Fetching statistics");

      const response = await api.get("/stats");
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Get stats error:", error);
      throw this._handleError(error);
    }
  }

  /**
   * Get chat history for current user
   * @param {number} limit - Number of history items
   * @returns {Promise} Chat history
   */
  async getChatHistory(limit = 20) {
    try {
      console.log("📝 [Chatbot] Fetching chat history:", { limit });

      const response = await api.get("/bot/history", {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Get chat history error:", error);
      throw this._handleError(error);
    }
  }

  // ============ VECTOR DB METHODS ============

  /**
   * Get vector database information
   * @returns {Promise} Vector DB info
   */
  async getVectorDBInfo() {
    try {
      console.log("🗄️ [Chatbot] Fetching vector DB info");

      const response = await api.get("/vector-db-info");
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Get vector DB info error:", error);
      throw this._handleError(error);
    }
  }

  /**
   * Rebuild vector database (admin function)
   * @returns {Promise} Rebuild result
   */
  async rebuildVectorDB() {
    try {
      console.log("🔄 [Chatbot] Rebuilding vector database");

      const response = await api.post("/rebuild-vector-db");
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Rebuild vector DB error:", error);
      throw this._handleError(error);
    }
  }

  // ============ HEALTH CHECK ============

  /**
   * Check chatbot health status
   * @returns {Promise} Health status
   */
  async checkHealth() {
    try {
      console.log("❤️ [Chatbot] Checking health status");

      const response = await api.get("/health");
      return response.data;
    } catch (error) {
      console.error("❌ [Chatbot] Health check error:", error);
      throw this._handleError(error);
    }
  }

  // ============ ERROR HANDLING ============

  /**
   * Handle API errors consistently
   * @param {Error} error - Original error
   * @returns {Error} Formatted error
   */
  _handleError(error) {
    // Extract meaningful error message
    let message = "An unexpected error occurred";

    if (error.response) {
      // Server responded with error status
      message =
        error.response.data?.message ||
        error.response.data?.error ||
        `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request made but no response received
      message = "No response from server. Please check your connection.";
    } else {
      // Something else happened
      message = error.message;
    }

    // Create enhanced error object
    const enhancedError = new Error(message);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    enhancedError.code = error.code;

    return enhancedError;
  }

  // ============ UTILITY METHODS ============

  /**
   * Format book data for display
   * @param {Object} book - Raw book data
   * @returns {Object} Formatted book data
   */
  formatBookData(book) {
    return {
      id: book.id,
      title: book.title || "Unknown Title",
      author: book.author || "Unknown Author",
      description: book.description || "No description available",
      category: book.category_name || book.category || "Uncategorized",
      year: book.publication_year || "Unknown",
      rating: book.average_rating || 0,
      ratingCount: book.rating_count || 0,
      coverImage: book.cover_image || book.image_path || null,
      pdfPath: book.pdf_path || null,
    };
  }

  /**
   * Format chat response data
   * @param {Object} response - Raw API response
   * @returns {Object} Formatted chat data
   */
  formatChatResponse(response) {
    return {
      text: response.response,
      metadata: response.metadata || {},
      status: response.status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate session ID for user
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
const chatbotService = new ChatbotService();
export default chatbotService;
