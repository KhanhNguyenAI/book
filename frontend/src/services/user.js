// src/services/users.js
import api from "./axios";
export const userService = {
  getProfile: async () => {
    const response = await api.get("/users/profile");
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put("/users/profile", profileData);
    return response.data;
  },

  // src/services/users.js
updateAvatar: async (avatarFile) => {
  try {
    const formData = new FormData();
    formData.append("file", avatarFile);

    const response = await api.post("/users/upload-avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;

  } catch (error) {
    console.error("Avatar upload failed:", error);
    throw error.response?.data || error;
  }
},

deleteAvatar: async () => {
  const response = await api.delete("/users/avatar");
  return response.data;
},
  getPreferences: async () => {
    const response = await api.get("/users/preferences");
    return response.data;
  },

  updatePreferences: async (preferences) => {
    const response = await api.put("/users/preferences", { preferences });
    return response.data;
  },

  getLikedBooks: async () => {
    const response = await api.get("/users/liked-books");
    return response.data;
  }, // ============ READING HISTORY ENDPOINTS ============

  /**
   * Lấy sách đã xem hôm nay
   */
  getTodayReadingHistory: async () => {
    try {
      const response = await api.get("/users/history/today");
      return response.data;
    } catch (error) {
      console.error("Get today reading history failed:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Lấy tất cả sách đã xem (có phân trang)
   * @param {number} page - Trang hiện tại
   * @param {number} perPage - Số lượng mỗi trang
   */
  getAllReadingHistory: async (page = 1, perPage = 20) => {
    try {
      const response = await api.get("/users/history/books-all", {
        params: {
          page,
          per_page: perPage
        }
      });
      return response.data;
    } catch (error) {
      console.error("Get all reading history failed:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Cập nhật lịch sử đọc sách
   * @param {number} bookId - ID sách
   * @param {number} lastPage - Trang cuối cùng đã đọc
   */
  updateReadingHistory: async (bookId, lastPage = 0) => {
    try {
      const response = await api.post(`/users/history/${bookId}`, {
        last_page: lastPage
      });
      return response.data;
    } catch (error) {
      console.error("Update reading history failed:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Search users by username (for adding to rooms)
   * @param {string} query - Search query (min 2 chars)
   * @param {number} limit - Max results (default: 10)
   * @returns {Promise} - { suggestions: [...], count, query }
   */
  searchUsers: async (query, limit = 10) => {
    if (!query || query.length < 2) {
      return { suggestions: [], count: 0, query: '' };
    }
    
    try {
      const response = await api.get("/users/search", { 
        params: { q: query, limit } 
      });
      return response.data;
    } catch (error) {
      console.error("Search users error:", error);
      return { suggestions: [], count: 0, query };
    }
  },

  /**
   * Get public user profile by username
   * @param {string} username - Username to get profile for
   * @returns {Promise} - { user: {...} }
   */
  getPublicProfile: async (username) => {
    try {
      const response = await api.get(`/users/${username}/profile`);
      return response.data;
    } catch (error) {
      console.error("Get public profile error:", error);
      throw error.response?.data || error;
    }
  }
};
