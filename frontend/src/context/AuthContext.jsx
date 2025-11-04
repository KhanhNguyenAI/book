// context/AuthContext.js - FIXED VERSION
import React, { createContext, useState, useContext, useEffect } from "react";
import { authService } from "../services/auth.js";

const AuthContext = createContext();

export const UseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("UseAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ THÊM computed property isAdmin
  const isAdmin = user?.role === "admin";

  // ✅ THÊM: Get token từ localStorage (reactive)
  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const hasValidToken = authService.isAuthenticated();

      if (hasValidToken) {
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        } else {
          // If we have token but no user data, fetch user info
          await getCurrentUser();
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      authService.clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
        authService.storeAuthData(getToken(), response.data);
      }
    } catch (error) {
      console.error("Get current user error:", error);
      logout();
    }
  };

  // ✅ THÊM HÀM updateUser - QUAN TRỌNG!
  const updateUser = (updatedUserData) => {
    try {
      console.log("🔄 Updating user context with:", updatedUserData);
      
      // Update state
      setUser(prevUser => ({
        ...prevUser,
        ...updatedUserData
      }));
      
      // Also update localStorage to keep data consistent
      const storedUser = authService.getStoredUser();
      if (storedUser) {
        const updatedUser = { ...storedUser, ...updatedUserData };
        authService.storeAuthData(getToken(), updatedUser);
      }
      
      console.log("✅ User context updated successfully");
    } catch (error) {
      console.error("Error updating user context:", error);
    }
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const result = await authService.login(credentials);

      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }

      return result;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const result = await authService.register(userData);

      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }

      return result;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const result = await authService.refreshToken();
      return result;
    } catch (error) {
      console.error("Token refresh error:", error);
      logout();
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isAdmin, // ✅ EXPORT isAdmin
    loading: isLoading, // ✅ THÊM alias 'loading' để match với App.jsx
    // ✅ THÊM TOKEN - 2 CÁCH AN TOÀN:
    token: getToken(), // Trả về token hiện tại
    getToken, // Function để lấy token mới nhất
    // Các hàm cũ vẫn giữ nguyên:
    login,
    register,
    logout,
    refreshToken,
    getCurrentUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;