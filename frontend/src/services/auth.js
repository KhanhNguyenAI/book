// services/auth.service.js
import api from "./axios";
import { tokenStorage } from "../utils/tokenStorage";

// Auth service functions
export const authService = {
  // Register new user
  async register(userData) {
    try {
      const response = await api.post("auth/register", userData, {
        withCredentials: true
      });
      return _handleAuthResponse(response);
    } catch (error) {
      throw _handleError(error);
    }
  },

  // Login user
  async login(credentials) {
    try {
      const response = await api.post("auth/login", credentials, {
        withCredentials: true
      });
      return _handleAuthResponse(response);
    } catch (error) {
      throw _handleError(error);
    }
  },

  // Get current user info
  async getCurrentUser() {
    try {
      const response = await api.get("auth/me");
      return response.data;
    } catch (error) {
      throw _handleError(error);
    }
  },

  // Refresh token (manual - thường không cần vì auto refresh)
  async refreshToken() {
    try {
      const response = await api.post("auth/refresh", {}, {
        withCredentials: true
      });

      if (response.data.success && response.data.data.token) {
        tokenStorage.setAccessToken(response.data.data.token);
      }

      return response.data;
    } catch (error) {
      throw _handleError(error);
    }
  },

  // Logout user
  async logout() {
    try {
      const response = await api.post("auth/logout", {}, {
        withCredentials: true
      });

      // Clear local storage regardless of API response
      _clearAuthData();

      return response.data;
    } catch (error) {
      // Still clear local storage even if API call fails
      _clearAuthData();
      throw _handleError(error);
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return tokenStorage.isTokenValid();
  },

  // Get stored user data
  getStoredUser() {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // Store auth data (AT trong memory, user trong localStorage)
  storeAuthData(token, user) {
    tokenStorage.setAccessToken(token);
    localStorage.setItem("user", JSON.stringify(user));
  },

  // Clear auth data
  clearAuthData() {
    _clearAuthData();
  },
};

// Private helper functions
function _handleAuthResponse(response) {
  if (response.data.success && response.data.data) {
    const { token, user } = response.data.data;

    // Store AT trong memory, user trong localStorage
    // RT tự động trong httpOnly cookie
    authService.storeAuthData(token, user);
  }

  return response.data;
}

function _handleError(error) {
  if (error.response?.data) {
    // Server responded with error
    return {
      message: error.response.data.message || "An error occurred",
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: "Network error: Unable to connect to server",
      status: 0,
    };
  } else {
    // Something else happened
    return {
      message: error.message || "An unexpected error occurred",
      status: -1,
    };
  }
}

function _clearAuthData() {
  tokenStorage.removeAccessToken();
  localStorage.removeItem("user");
  // RT sẽ được xóa bởi backend khi logout (cookie expire)
}

export default authService;
