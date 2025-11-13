// src/services/admin.js
import api from "./axios";

export const adminService = {
  // Thống kê dashboard
  getDashboardStats: async () => {
    const response = await api.get("/admin/dashboard/stats");
    return response.data;
  },

  // Quản lý users
  getUsers: async (params = {}) => {
    const response = await api.get("/admin/users", { params });
    return response.data;
  },

  // Ban/Unban user
  toggleUserBan: async (userId, data) => {
    const response = await api.put(`/admin/users/${userId}/ban`, data);
    return response.data;
  },

  // Quản lý tin nhắn
  getMessages: async (params = {}) => {
    const response = await api.get("/admin/messages", { params });
    return response.data;
  },

  getMessageStats: async (params = {}) => {
    const response = await api.get("/admin/messages/stats", { params });
    return response.data;
  },

  getChatbotStats: async (params = {}) => {
    const response = await api.get("/admin/chatbot/stats", { params });
    return response.data;
  },

  // Xóa tin nhắn (admin)
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/admin/messages/${messageId}`);
    return response.data;
  },

  // Get reports
  getReports: async (params = {}) => {
    const response = await api.get("/admin/reports", { params });
    return response.data;
  },

  // Resolve report
  resolveReport: async (reportId, action) => {
    const response = await api.put(`/admin/reports/${reportId}/resolve`, { action });
    return response.data;
  },

  // Quản lý chatbot conversations
  getChatbotConversations: async (params = {}) => {
    const response = await api.get("/admin/chatbot/conversations", { params });
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId, role) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
};
