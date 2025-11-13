// services/api.js
import axios from "axios";
import { tokenStorage } from "../utils/tokenStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for chatbot operations
  withCredentials: true, // Quan trọng: để gửi httpOnly cookies
});

// Flag để tránh infinite loop khi refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();

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
        tokenStorage.removeAccessToken();
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

// Response interceptor với auto refresh và retry
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error("❌ [API] Response error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });

    // Nếu là 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu đang refresh, đợi refresh xong
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      // Bắt đầu refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("🔄 [API] Auto refreshing token...");
        
        // Gọi refresh endpoint (RT tự động gửi qua cookie)
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (refreshResponse.data.success && refreshResponse.data.data.token) {
          const newToken = refreshResponse.data.data.token;
          tokenStorage.setAccessToken(newToken);
          
          console.log("✅ [API] Token refreshed successfully");
          
          // Process queue
          processQueue(null, newToken);
          
          // Retry original request với token mới
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          isRefreshing = false;
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("❌ [API] Token refresh failed:", refreshError);
        
        // Refresh failed - logout
        processQueue(refreshError, null);
        tokenStorage.removeAccessToken();
        localStorage.removeItem("user");
        
        // Redirect to login
        if (!window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login";
        }
        
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 401) {
      // Token refresh failed hoặc không thể refresh
      tokenStorage.removeAccessToken();
      localStorage.removeItem("user");

      if (!window.location.pathname.includes("/auth/login")) {
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
