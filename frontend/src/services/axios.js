// services/api.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for chatbot operations
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url}`, {
      hasToken: !!token,
      hasData: !!config.data,
      dataType: config.data instanceof FormData ? "FormData" : "JSON",
    });

    if (token) {
      // Validate token format
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        console.error("❌ [API] Invalid JWT token format");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        throw new Error("Invalid JWT token format");
      }

      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only set Content-Type for non-FormData requests
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => {
    console.error("❌ [API] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("❌ [API] Response error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      console.log("🔐 [API] 401 Unauthorized - clearing auth data");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Only redirect if not already on login page
      if (!window.location.pathname.includes("auth/login")) {
        window.location.href = "auth/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
