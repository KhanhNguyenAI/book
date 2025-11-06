// src/services/post.js
import api from "./axios";

export const postService = {
  /**
   * Create a new post
   * @param {string} content - Post content
   * @param {string} imageUrl - Optional image URL from Supabase
   */
  createPost: async (content = "", imageUrl = "") => {
    try {
      const response = await api.post("/posts", {
        content: content.trim(),
        image_url: imageUrl || null
      });
      return response.data;
    } catch (error) {
      console.error("Create post failed:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get all posts (feed) with pagination
   * @param {number} page - Page number
   * @param {number} perPage - Posts per page
   * @param {number} userId - Optional: filter by user ID
   */
  getPosts: async (page = 1, perPage = 20, userId = null) => {
    try {
      const params = { page, per_page: perPage };
      if (userId) {
        params.user_id = userId;
      }
      const response = await api.get("/posts", { params });
      return response.data;
    } catch (error) {
      console.error("Get posts failed:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get a specific post by ID
   * @param {number} postId - Post ID
   */
  getPost: async (postId) => {
    try {
      const response = await api.get(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error("Get post failed:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete a post
   * @param {number} postId - Post ID
   */
  deletePost: async (postId) => {
    try {
      const response = await api.delete(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error("Delete post failed:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Upload image for post to Supabase
   * @param {File} file - Image file
   */
  uploadPostImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/posts/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Post image upload failed:", error);
      throw error.response?.data || error;
    }
  },
};

