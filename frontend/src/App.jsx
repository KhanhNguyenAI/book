// src/App.jsx - CẬP NHẬT VỚI LOGIN/REGISTER ROUTES
import React from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, UseAuth } from "./context/AuthContext";

import Loading from "./components/ui/Loading";

// Pages
import Home from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BooksPage from "./pages/BooksPage.jsx";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import BookmarksPage from "./pages/BookmarksPage";
import BookDetailPage from "./pages/BookDetailPage.jsx";
import AddBookPage from "./pages/AddBookPage";
import CreateChapterPage from "./pages/CreateChapterPage";
import NotFound from "./pages/NotFound.jsx";
import MessagePage from "./pages/MessagePage.jsx";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBookManager from "./pages/AdminBookManager";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminChatbot from "./pages/admin/AdminChatbot";
import AdminReports from "./pages/admin/AdminReports";
import FavoritePage from "./pages/FavoritePage";

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = UseAuth();
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return children;
};

// Public Route Component (chỉ cho guest)                                             
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = UseAuth();
  if (loading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ==================== */}
          {/* PUBLIC ROUTES */}
          {/* ==================== */}
          <Route path="/" element={<Home />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />

          {/* ==================== */}
          {/* AUTH ROUTES - Chỉ truy cập khi CHƯA đăng nhập */}
          {/* ==================== */}
          <Route
            path="/auth/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* ==================== */}
          {/* PROTECTED ROUTES (Cần đăng nhập) */}
          {/* ==================== */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
<Route
  path="/chat"
  element={
    <ProtectedRoute>
      <ChatPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/messages/:roomId"
  element={
    <ProtectedRoute>
      <MessagePage />
    </ProtectedRoute>
  }
/>
          <Route
            path="/users/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookmarks"
            element={
              <ProtectedRoute>
                <BookmarksPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <FavoritePage />
              </ProtectedRoute>
            }
          />

          {/* ==================== */}
          {/* ADMIN ROUTES */}
          {/* ==================== */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="books" element={<AdminBookManager />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="chatbot" element={<AdminChatbot />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>
          <Route
            path="/add-book"
            element={
              <ProtectedRoute adminOnly={true}>
                <AddBookPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/books/:bookId/chapters/create"
            element={
              <ProtectedRoute adminOnly={true}>
                <CreateChapterPage />
              </ProtectedRoute>
            }
          />

          {/* ==================== */}
          {/* 404 ROUTE */}
          {/* ==================== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;