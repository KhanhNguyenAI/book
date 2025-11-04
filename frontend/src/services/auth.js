// services/auth.service.js
import api from "./axios";

// Auth service functions
export const authService = {
  // Register new user
  async register(userData) {
    try {
      const response = await api.post("auth/register", userData);
      return _handleAuthResponse(response);
    } catch (error) {
      throw _handleError(error);
    }
  },

  // Login user
  async login(credentials) {
    try {
      const response = await api.post("auth/login", credentials);
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

  // Refresh token
  async refreshToken() {
    try {
      const response = await api.post("auth/refresh");

      if (response.data.success && response.data.data.token) {
        localStorage.setItem("token", response.data.data.token);
      }

      return response.data;
    } catch (error) {
      throw _handleError(error);
    }
  },

  // Logout user
  async logout() {
    try {
      const response = await api.post("auth/logout");

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
    const token = localStorage.getItem("token");
    if (!token) return false;

    // Basic JWT validation
    try {
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        _clearAuthData();
        return false;
      }

      // Check token expiration
      const payload = JSON.parse(atob(tokenParts[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        _clearAuthData();
        return false;
      }

      return true;
    } catch (error) {
      _clearAuthData();
      console.log(error);
      return false;
    }
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

  // Store auth data
  storeAuthData(token, user) {
    localStorage.setItem("token", token);
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
    const { token, refreshToken, user } = response.data.data;

    // Store tokens and user data
    authService.storeAuthData(token, user);

    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
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
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export default authService;
