// src/pages/ReadingHistoryPage.jsx
import React from "react";
import { UseAuth } from "../context/AuthContext";

const ReadingHistoryPage = () => {
  const { user } = UseAuth();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📖 Lịch sử đọc sách</h1>
        <p>Theo dõi các cuốn sách bạn đã đọc</p>
      </div>

      <div className="content-section">
        <p>Chào {user?.username}, đây là lịch sử đọc sách của bạn.</p>
        {/* Thêm component lịch sử đọc sau */}
      </div>
    </div>
  );
};

export default ReadingHistoryPage;
