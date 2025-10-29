// src/pages/BookDetailPage.jsx
import React from "react";
import { useParams } from "react-router-dom";
import { UseAuth } from "../context/AuthContext";

const BookDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated } = UseAuth();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Chi tiết sách #{id}</h1>
      </div>

      <div className="book-detail">
        <p>Thông tin chi tiết về cuốn sách...</p>

        {isAuthenticated ? (
          <div className="authenticated-features">
            <h3>Tính năng cho thành viên:</h3>
            <button className="btn btn-primary">Đánh dấu trang</button>
            <button className="btn btn-secondary">Thêm bình luận</button>
            <button className="btn btn-primary">Thêm vào lịch sử</button>
          </div>
        ) : (
          <div className="guest-message">
            <p>
              🔒 Đăng nhập để sử dụng các tính năng: đánh dấu trang, bình luận,
              theo dõi lịch sử đọc
            </p>
            <div className="auth-prompts">
              <a href="/login" className="btn btn-primary">
                Đăng nhập
              </a>
              <a href="/register" className="btn btn-secondary">
                Đăng ký
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDetailPage;
