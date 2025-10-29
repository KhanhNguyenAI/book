// src/services/admin.js
import api from "./api";

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
  toggleUserBan: async (userId) => {
    const response = await api.put(`/admin/users/${userId}/ban`);
    return response.data;
  },

  // Quản lý tin nhắn
  getReportedMessages: async () => {
    const response = await api.get("/admin/messages/reported");
    return response.data;
  },

  // Xử lý báo cáo
  resolveReport: async (reportId, action) => {
    const response = await api.put(`/admin/messages/reports/${reportId}`, {
      action,
    });
    return response.data;
  },

  // Xóa tin nhắn (admin)
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/admin/messages/${messageId}`);
    return response.data;
  },
};
