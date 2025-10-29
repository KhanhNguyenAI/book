// src/pages/BookmarksPage.jsx
import React from "react";
import { UseAuth } from "../context/AuthContext";

const BookmarksPage = () => {
  const { user } = UseAuth();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🔖 Bookmark của tôi</h1>
        <p>Những trang sách bạn đã đánh dấu</p>
      </div>

      <div className="content-section">
        <p>Chào {user?.username}, đây là các bookmark của bạn.</p>
        {/* Thêm component bookmark sau */}
      </div>
    </div>
  );
};

export default BookmarksPage;
