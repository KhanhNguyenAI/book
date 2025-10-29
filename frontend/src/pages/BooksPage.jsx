// src/pages/BooksPage.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BookCard from "../components/ui/BookCard";
import { bookService } from "../services/book";

// chatbot 
import Chatbot from "../components/ui/chatbot";
import ChatPopup from "../components/ui/ChatPopUp";


const BooksPage = () => {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [newBooks, setNewBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const booksPerPage = 12;
  
  // Tính toán sách cho trang hiện tại
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = allBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(allBooks.length / booksPerPage);
  
  //chatbot
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCardClick = (bookId) => {
    window.location.href = `/book/${bookId}`;
  };

  useEffect(() => {
    loadBooksData();
    checkAdminPermission();
  }, []);

  const checkAdminPermission = () => {
    const userRole = localStorage.getItem("userRole");
    setIsAdmin(userRole === "admin");
  };

  //chatbot
  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  // SỬA: Load books data và lấy 3 sách có view_count cao nhất
  const loadBooksData = async () => {
    try {
      const [popularResponse, allBooksResponse] = await Promise.all([
        bookService.getPopularBooks(),
        bookService.getBooks({ per_page: 100 }),
      ]);

      console.log("🎯 CHECK is_favorite IN RESPONSE:");
      console.log(
        "- Popular books:",
        popularResponse.books?.map((b) => ({ id: b.id, is_fav: b.is_favorite })) || []
      );
      console.log(
        "- All books:",
        allBooksResponse.books?.map((b) => ({ id: b.id, is_fav: b.is_favorite })) || []
      );

      const books = allBooksResponse.books || [];
      const popularBooks = popularResponse.books || [];

      // ĐẢM BẢO is_favorite luôn có giá trị
      const booksWithFavorite = books.map((book) => ({
        ...book,
        is_favorite: book.is_favorite || false,
      }));

      // SỬA: Lấy 3 sách có view_count cao nhất từ tất cả sách
      const topViewedBooks = [...booksWithFavorite]
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 3);

      console.log("🔥 TOP 3 SÁCH CÓ VIEW CAO NHẤT:", 
        topViewedBooks.map(b => ({ title: b.title, views: b.view_count }))
      );

      const sortedBooks = [...booksWithFavorite].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      // SỬA: Set featuredBooks là top 3 sách có view cao nhất
      setFeaturedBooks(topViewedBooks);
      setNewBooks(sortedBooks.slice(0, 10));
      setAllBooks(booksWithFavorite);
    } catch (error) {
      console.error("❌ Error loading books:", error);
      setFeaturedBooks([]);
      setNewBooks([]);
      setAllBooks([]);
    } finally {
      setLoading(false);
    }
  };

  // Giữ nguyên các hàm xử lý khác
  const handleFavoriteClick = async (bookId, isFavorite) => {
    try {
      console.log(
        `❤️ Updating favorite: Book ${bookId}, Favorite: ${isFavorite}`
      );

      if (isFavorite) {
        const response = await bookService.addFavorite(bookId);
        console.log(`✅ Đã thêm sách ${bookId} vào yêu thích:`, response);
      } else {
        const response = await bookService.removeFavorite(bookId);
        console.log(`❌ Đã xóa sách ${bookId} khỏi yêu thích:`, response);
      }

      // Cập nhật UI
      updateBookFavoriteStatus(bookId, isFavorite);
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật yêu thích:", error);
    }
  };

  const updateBookFavoriteStatus = (bookId, isFavorite) => {
    console.log(`🔄 Updating UI: Book ${bookId} -> is_favorite: ${isFavorite}`);

    setFeaturedBooks((prev) =>
      prev.map((book) =>
        book.id === bookId ? { ...book, is_favorite: isFavorite } : book
      )
    );
    setNewBooks((prev) =>
      prev.map((book) =>
        book.id === bookId ? { ...book, is_favorite: isFavorite } : book
      )
    );
    setAllBooks((prev) =>
      prev.map((book) =>
        book.id === bookId ? { ...book, is_favorite: isFavorite } : book
      )
    );
  };

  const handleBookmarkClick = async (bookId, currentStatus) => {
    try {
      if (currentStatus) {
        await bookService.deleteBookmark(bookId);
      } else {
        await bookService.addBookmark(bookId, { page_number: 1 });
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật bookmark:", error);
    }
  };

  const handleRatingClick = async (bookId, rating) => {
    try {
      await bookService.rateBook(bookId, { rating });
      // Reload data để cập nhật rating mới
      await loadBooksData();
    } catch (error) {
      console.error("Lỗi khi đánh giá:", error);
    }
  };

  const handleDeleteClick = (bookId, bookTitle) => {
    setDeleteConfirm({ bookId, bookTitle });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await bookService.deleteBook(deleteConfirm.bookId);
      console.log(`Đã xóa sách: ${deleteConfirm.bookTitle}`);

      // Reload data sau khi xóa
      await loadBooksData();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Lỗi khi xóa sách:", error);
      alert("Có lỗi xảy ra khi xóa sách!");
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Nút Previous
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="comic-pagination-btn"
      >
        ⬅ TRƯỚC
      </button>
    );

    // Các nút số trang
    for (let page = startPage; page <= endPage; page++) {
      pages.push(
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={`comic-pagination-btn ${
            currentPage === page ? "active" : ""
          }`}
        >
          {page}
        </button>
      );
    }

    // Nút Next
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="comic-pagination-btn"
      >
        SAU ➡
      </button>
    );

    return pages;
  };

  if (loading) {
    return (
      <StyledWrapper>
        {/* <Header /> */}
        <div className="loading-container">
          <div className="comic-spinner"></div>
          <p className="comic-text">ĐANG TẢI SÁCH...</p>
        </div>
        <Footer />
      </StyledWrapper>
    );
  }

  return ( 
    <StyledWrapper>
      <Header />
      {/* ✅ THÊM NÚT CHATBOT VÀO BOOKSPAGE */}
      <div className="chatbot-floating-button" onClick={handleOpenChat}>
        <Chatbot />
      </div>

      {/* ✅ THÊM CHAT POPUP VÀO BOOKSPAGE */}
      {isChatOpen && (
        <ChatPopup className="chatbot-popup" onClose={handleCloseChat} />
      )}
      
      {/* Modal xác nhận xóa */}
      {deleteConfirm && (
        <div className="comic-modal-overlay">
          <div className="comic-modal">
            <div className="modal-header">
              <h3>🗑️ XÓA SÁCH</h3>
              <div className="modal-close" onClick={cancelDelete}>
                ×
              </div>
            </div>
            <div className="modal-body">
              <p>Bạn có chắc muốn xóa sách:</p>
              <p className="book-title-delete">"{deleteConfirm.bookTitle}"</p>
              <p className="warning-text">Hành động này không thể hoàn tác!</p>
            </div>
            <div className="modal-actions">
              <button className="comic-btn cancel-btn" onClick={cancelDelete}>
                HUỶ
              </button>
              <button className="comic-btn delete-btn" onClick={confirmDelete}>
                XÓA
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        {/* Phần sách nổi bật - CHỈ 3 SÁCH CÓ VIEW CAO NHẤT */}
        <section className="featured-section">
          <h2 className="comic-section-title">🔥 TOP 3 SÁCH ĐƯỢC XEM NHIỀU NHẤT</h2>
          {featuredBooks.length > 0 ? (
            <div className="books-grid featured">
              {featuredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onCardClick={handleCardClick}
                  onFavoriteClick={handleFavoriteClick}
                  onBookmarkClick={handleBookmarkClick}
                  onRatingClick={handleRatingClick}
                  onDeleteClick={isAdmin ? handleDeleteClick : null}
                  variant="featured"
                  isAdmin={isAdmin}
                  showViewCount={true} // Hiển thị số lượt xem
                />
              ))}
            </div>
          ) : (
            <div className="comic-empty-state">
              <div className="empty-icon">📚</div>
              <p>Chưa có sách nổi bật</p>
            </div>
          )}
        </section>

        {/* Phần sách mới - scroll ngang */}
        <section className="new-books-section">
          <h2 className="comic-section-title">🎯 SÁCH MỚI NHẤT</h2>
          {newBooks.length > 0 ? (
            <div className="comic-scroll-container">
              <div className="scroll-content">
                {newBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onCardClick={handleCardClick}
                    onFavoriteClick={handleFavoriteClick}
                    onBookmarkClick={handleBookmarkClick}
                    onRatingClick={handleRatingClick}
                    onDeleteClick={isAdmin ? handleDeleteClick : null}
                    variant="horizontal"
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="comic-empty-state">
              <div className="empty-icon">🆕</div>
              <p>Chưa có sách mới</p>
            </div>
          )}
        </section>

        {/* Tất cả sách trong thư viện */}
        <section className="all-books-section">
          <div className="section-header">
            <h2 className="comic-section-title">
              📖 TẤT CẢ SÁCH TRONG THƯ VIỆN
            </h2>
            <span className="comic-book-count">({allBooks.length} SÁCH)</span>
          </div>

          {currentBooks.length > 0 ? (
            <>
              <div className="books-grid all-books">
                {currentBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onCardClick={handleCardClick}
                    onFavoriteClick={handleFavoriteClick}
                    onBookmarkClick={handleBookmarkClick}
                    onRatingClick={handleRatingClick}
                    onDeleteClick={isAdmin ? handleDeleteClick : null}
                    variant="default"
                    isAdmin={isAdmin}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="comic-pagination">{renderPagination()}</div>
              )}
            </>
          ) : (
            <div className="comic-empty-state">
              <div className="empty-icon">😔</div>
              <p>Thư viện chưa có sách nào</p>
            </div>
          )}
        </section>
      </main>
          <Footer/>
     
    </StyledWrapper>

  );
};

// Styled Components
const StyledWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
  color: #2c3e50;
  width: 100vw;
  font-family: "Comic Neue", cursive;
 position: relative; /* ✅ THÊM DÒNG NÀY */
//chatbot 
  .chatbot-floating-button {
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 1000;
    cursor: pointer;
    transition: transform 0.3s ease;
    
    
    &:hover {
      transform: scale(1.1);
    }
  }  /* ✅ THÊM STYLE CHO CHAT POPUP */
  .chatbot-popup {
    position: fixed;
    bottom: 100px;
    right: 30px;
    z-index: 1001;
  }
  .main-content {
    flex: 1;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 1rem;
  }

  .comic-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #2c3e50;
    border-top: 4px solid #ff6b6b;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .comic-text {
    font-size: 1.2rem;
    font-weight: bold;
    color: #2c3e50;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .comic-section-title {
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
    color: #2c3e50;
    text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.1);
  }

  .books-grid {
    display: grid;
    gap: 2rem;

    &.featured {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    &.all-books {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
  }

  .comic-scroll-container {
    overflow-x: auto;
    padding: 1rem 0;

    .scroll-content {
      display: flex;
      gap: 2rem;
      padding: 0 1rem;
    }
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .comic-book-count {
    background: #2c3e50;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: bold;
    border: 3px solid white;
  }

  .comic-empty-state {
    text-align: center;
    padding: 3rem;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    border: 4px solid #2c3e50;

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    p {
      font-size: 1.2rem;
      color: #636e72;
      font-weight: bold;
    }
  }

  .comic-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 3rem;
    flex-wrap: wrap;

    .comic-pagination-btn {
      background: white;
      border: 3px solid #2c3e50;
      padding: 0.8rem 1.2rem;
      border-radius: 15px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
      box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.2);

      &:hover:not(:disabled) {
        transform: translate(-2px, -2px);
        box-shadow: 5px 5px 0px rgba(0, 0, 0, 0.2);
        background: #4ecdc4;
        color: white;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.active {
        background: #ff6b6b;
        color: white;
        border-color: #e74c3c;
      }
    }
  }

  .comic-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .comic-modal {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    border: 4px solid #2c3e50;
    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      h3 {
        margin: 0;
        color: #2c3e50;
      }

      .modal-close {
        cursor: pointer;
        font-size: 1.5rem;
        font-weight: bold;
        padding: 0.5rem;

        &:hover {
          color: #ff6b6b;
        }
      }
    }

    .modal-body {
      margin-bottom: 2rem;

      .book-title-delete {
        font-weight: bold;
        color: #e74c3c;
        font-size: 1.2rem;
        margin: 1rem 0;
      }

      .warning-text {
        color: #e74c3c;
        font-weight: bold;
      }
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;

      .comic-btn {
        padding: 0.8rem 1.5rem;
        border: 3px solid #2c3e50;
        border-radius: 15px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
        box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.2);

        &.cancel-btn {
          background: white;
          color: #2c3e50;

          &:hover {
            background: #dfe6e9;
          }
        }

        &.delete-btn {
          background: #e74c3c;
          color: white;
          border-color: #c0392b;

          &:hover {
            background: #c0392b;
          }
        }

        &:hover {
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0px rgba(0, 0, 0, 0.2);
        }
      }
    }
  }
`;

export default BooksPage;
