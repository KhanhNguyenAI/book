// src/services/users.js
import api from "./api";

export const userService = {
  // Lấy thông tin profile
  getProfile: async () => {
    const response = await api.get("/users/profile");
    return response.data;
  },

  // Cập nhật profile
  updateProfile: async (profileData) => {
    const response = await api.put("/users/profile", profileData);
    return response.data;
  },

  // Cập nhật avatar
  updateAvatar: async (avatarFile) => {
    const formData = new FormData();
    formData.append("avatar", avatarFile);

    const response = await api.put("/users/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Lấy danh mục yêu thích
  getPreferences: async () => {
    const response = await api.get("/users/preferences");
    return response.data;
  },

  // Cập nhật danh mục yêu thích
  updatePreferences: async (preferences) => {
    const response = await api.put("/users/preferences", { preferences });
    return response.data;
  },

  // Lấy sách đã thích
  getLikedBooks: async () => {
    const response = await api.get("/users/liked-books");
    return response.data;
  },
};
