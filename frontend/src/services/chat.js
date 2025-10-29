// src/services/chat.js
import api from "./api";

export const chatService = {
  // Lấy tin nhắn
  getMessages: async (params = {}) => {
    const response = await api.get("/messages", { params });
    return response.data;
  },

  // Gửi tin nhắn
  sendMessage: async (messageData) => {
    const response = await api.post("/messages", messageData);
    return response.data;
  },

  // Trả lời tin nhắn
  replyMessage: async (parentId, messageData) => {
    const response = await api.post(`/messages/${parentId}/reply`, messageData);
    return response.data;
  },

  // Xóa tin nhắn
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  // Báo cáo tin nhắn
  reportMessage: async (messageId, reason) => {
    const response = await api.post("/messages/report", {
      message_id: messageId,
      reason: reason,
    });
    return response.data;
  },
};
