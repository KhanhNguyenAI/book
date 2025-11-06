// src/pages/BooksPage.jsx
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BookCard from "../components/ui/BookCard";
import { bookService } from "../services/book";
import { UseAuth } from "../context/AuthContext"; 
import { useLanguage } from "../context/LanguageContext";
// chatbot 
import Chatbot from "../components/ui/chatbot";
import ChatPopup from "../components/ui/ChatPopUp";

import { FaHome, FaLeaf, FaTree, FaSeedling } from "react-icons/fa";
import HomeButton from "../components/ui/HomeButton";

const BooksPage = () => {
  const navigate = useNavigate();
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [newBooks, setNewBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const booksPerPage = 12;
  const { isAuthenticated, user } = UseAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  
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

  const handleHomeClick = () => {
    navigate("/");
  };

  const handleCardClick = (bookId) => {
   navigate(`/books/${bookId}`);
  };

  useEffect(() => {
    loadBooksData();
  }, []);

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const loadBooksData = async () => {
    try {
      const [popularResponse, allBooksResponse] = await Promise.all([
        bookService.getPopularBooks(),
        bookService.getBooks({ per_page: 100 }),
      ]);

      const books = allBooksResponse.books || [];
      const popularBooks = popularResponse.books || [];

      const booksWithFavorite = books.map((book) => ({
        ...book,
        is_favorite: book.is_favorite || false,
      }));

      const topViewedBooks = [...booksWithFavorite]
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 3);

      const sortedBooks = [...booksWithFavorite].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

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

  const handleFavoriteClick = async (bookId, isFavorite) => {
    try {
      if (isFavorite) {
        await bookService.addFavorite(bookId);
      } else {
        await bookService.removeFavorite(bookId);
      }
      updateBookFavoriteStatus(bookId, isFavorite);
    } catch (error) {
      console.error("❌ Error updating favorite:", error);
    }
  };

  const updateBookFavoriteStatus = (bookId, isFavorite) => {
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
      console.error("Error updating bookmark:", error);
    }
  };

  const handleRatingClick = async (bookId, rating) => {
    try {
      await bookService.rateBook(bookId, { rating });
      await loadBooksData();
    } catch (error) {
      console.error("Error rating book:", error);
    }
  };

  const handleDeleteClick = (bookId, bookTitle) => {
    setDeleteConfirm({ bookId, bookTitle });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await bookService.deleteBook(deleteConfirm.bookId);
      await loadBooksData();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("An error occurred while deleting the book!");
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

    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="nature-pagination-btn"
      >
        <FaLeaf className="pagination-icon" /> {t("prev")}
      </button>
    );

    for (let page = startPage; page <= endPage; page++) {
      pages.push(
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={`nature-pagination-btn ${
            currentPage === page ? "active" : ""
          }`}
        >
          {page}
        </button>
      );
    }

    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="nature-pagination-btn"
      >
        {t("next")} <FaLeaf className="pagination-icon" />
      </button>
    );

    return pages;
  };

  if (loading) {
    return (
      <StyledWrapper>
        <div className="loading-container">
          <div className="nature-spinner">
            <FaSeedling className="spinner-icon" />
          </div>
          <p className="nature-text">{t("loadingBooks")}</p>
        </div>
        <Footer />
      </StyledWrapper>
    );
  }

  return ( 
    <StyledWrapper>
      <Header />
      
     <HomeButton />

      <div className="chatbot-floating-button" onClick={handleOpenChat}>
        <Chatbot />
      </div>

      {isChatOpen && (
        <ChatPopup className="chatbot-popup" onClose={handleCloseChat} />
      )}
      
      {deleteConfirm && (
        <div className="nature-modal-overlay">
          <div className="nature-modal">
            <div className="modal-header">
              <FaTree className="modal-icon" />
              <h3>Delete Book</h3>
              <div className="modal-close" onClick={cancelDelete}>
                ×
              </div>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the book:</p>
              <p className="book-title-delete">"{deleteConfirm.bookTitle}"</p>
              <p className="warning-text">This action cannot be undone!</p>
            </div>
            <div className="modal-actions">
              <button className="nature-btn cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="nature-btn delete-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        {/* Decorative elements */}
        <div className="floating-leaf leaf-1">🍃</div>
        <div className="floating-leaf leaf-2">🌿</div>
        <div className="floating-leaf leaf-3">🍂</div>

        <section className="featured-section">
          <div className="section-title-container">
            <FaSeedling className="title-icon" />
            <h2 className="nature-section-title">{t("featuredBooks")}</h2>
            <FaSeedling className="title-icon" />
          </div>
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
                  onDeleteClick={handleDeleteClick}
                  variant="featured"
                  isAdmin={isAdmin}
                  showViewCount={true}
                />
              ))}
            </div>
          ) : (
            <div className="nature-empty-state">
              <div className="empty-icon">📚</div>
              <p>No featured books yet</p>
            </div>
          )}
        </section>

        <section className="new-books-section">
          <div className="section-title-container">
            <FaLeaf className="title-icon" />
            <h2 className="nature-section-title">{t("latestBooks")}</h2>
            <FaLeaf className="title-icon" />
          </div>
          {newBooks.length > 0 ? (
            <div className="nature-scroll-container">
              <div className="scroll-content">
                {newBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onCardClick={handleCardClick}
                    onFavoriteClick={handleFavoriteClick}
                    onBookmarkClick={handleBookmarkClick}
                    onRatingClick={handleRatingClick}
                    onDeleteClick={handleDeleteClick}
                    variant="horizontal"
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="nature-empty-state">
              <div className="empty-icon">🆕</div>
              <p>{t("noNewBooksYet")}</p>
            </div>
          )}
        </section>

        <section className="all-books-section">
          <div className="section-header">
            <div className="section-title-container">
              <FaTree className="title-icon" />
              <h2 className="nature-section-title">{t("bookLibrary")}</h2>
            </div>
            <span className="nature-book-count">{allBooks.length} {t("books")}</span>
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
                    onDeleteClick={handleDeleteClick}
                    variant="default"
                    isAdmin={isAdmin}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="nature-pagination">{renderPagination()}</div>
              )}
            </>
          ) : (
            <div className="nature-empty-state">
              <div className="empty-icon">🌱</div>
              <p>{t("libraryHasNoBooks")}</p>
              <p className="empty-subtext">{t("pleaseCheckBackLater")}</p>
            </div>
          )}
        </section>
      </main>
      
      <Footer/>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: #2d3436;
  min-width: 100vw;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  overflow-x: hidden;

  /* Background texture */
  &::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 80%, rgba(120, 219, 226, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(233, 212, 96, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(120, 219, 226, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  .main-content {
    position: relative;
    z-index: 1;
  }

  .floating-leaf {
    position: fixed;
    font-size: 2rem;
    opacity: 0.1;
    z-index: 0;
    animation: float 20s infinite linear;
    
    &.leaf-1 {
      top: 10%;
      left: 5%;
      animation-delay: 0s;
    }
    
    &.leaf-2 {
      top: 60%;
      right: 10%;
      animation-delay: -7s;
    }
    
    &.leaf-3 {
      bottom: 20%;
      left: 15%;
      animation-delay: -14s;
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-30px) rotate(120deg);
    }
    66% {
      transform: translateY(15px) rotate(240deg);
    }
  }

  .homeback-button {
    position: absolute;
    top: 16vh;
    left: 20px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid #81b214;
    border-radius: 25px;
    padding: 12px 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    color: #2d3436;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      background: #81b214;
      color: white;
    }

    .home-icon {
      font-size: 1.3rem;
    }

    .home-text {
      font-weight: 600;
      font-size: 0.9rem;
    }
  }

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
  }

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
    gap: 1.5rem;
  }

  .nature-spinner {
    width: 80px;
    height: 80px;
    border: 2px solid #e8f4f4;
    border-top: 2px solid #81b214;
    border-radius: 50%;
    animation: spin 1.5s linear infinite;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .spinner-icon {
      color: #81b214;
      font-size: 1.5rem;
      animation: pulse 2s ease-in-out infinite;
    }
  }

  .nature-text {
    font-size: 1.1rem;
    font-weight: 500;
    color: #2d3436;
    letter-spacing: 0.5px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .section-title-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .title-icon {
    color: #81b214;
    font-size: 1.5rem;
    opacity: 0.8;
  }

  .nature-section-title {
    font-size: 2.2rem;
    margin: 0;
    text-align: center;
    color: #2d3436;
    font-weight: 300;
    letter-spacing: 1px;
    position: relative;
    
    &::after {
      content: "";
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #81b214, transparent);
    }
  }

  .books-grid {
    display: grid;
    gap: 2.5rem;

    &.featured {
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }

    &.all-books {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
  }

  .nature-scroll-container {
    overflow-x: auto;
    padding: 1.5rem 0;
    margin: 0 -1rem;

    &::-webkit-scrollbar {
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(129, 178, 20, 0.1);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: #81b214;
      border-radius: 3px;
    }

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
    margin-bottom: 3rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(129, 178, 20, 0.2);
  }

  .nature-book-count {
    background: rgba(129, 178, 20, 0.1);
    color: #2d3436;
    padding: 0.6rem 1.2rem;
    border-radius: 20px;
    font-weight: 500;
    font-size: 0.9rem;
    border: 1px solid rgba(129, 178, 20, 0.3);
  }

  .nature-empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 20px;
    border: 1px solid rgba(129, 178, 20, 0.2);
    backdrop-filter: blur(10px);
    margin: 2rem 0;

    .empty-icon {
      font-size: 3.5rem;
      margin-bottom: 1.5rem;
      opacity: 0.7;
    }

    p {
      font-size: 1.2rem;
      color: #636e72;
      font-weight: 400;
      margin: 0.5rem 0;
    }

    .empty-subtext {
      font-size: 1rem;
      color: #81b214;
      font-style: italic;
    }
  }

  .nature-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.8rem;
    margin-top: 4rem;
    flex-wrap: wrap;

    .nature-pagination-btn {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(129, 178, 20, 0.3);
      padding: 0.8rem 1.4rem;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      color: #2d3436;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      backdrop-filter: blur(10px);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        background: #81b214;
        color: white;
        box-shadow: 0 4px 15px rgba(129, 178, 20, 0.3);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &.active {
        background: #81b214;
        color: white;
        border-color: #81b214;
      }

      .pagination-icon {
        font-size: 0.9rem;
      }
    }
  }

  .nature-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(45, 52, 54, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .nature-modal {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 2.5rem;
    border: 1px solid rgba(129, 178, 20, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    max-width: 480px;
    width: 90%;
    backdrop-filter: blur(20px);

    .modal-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(129, 178, 20, 0.2);

      .modal-icon {
        color: #e74c3c;
        font-size: 1.5rem;
      }

      h3 {
        margin: 0;
        color: #2d3436;
        font-weight: 500;
        flex: 1;
      }

      .modal-close {
        cursor: pointer;
        font-size: 1.8rem;
        font-weight: 300;
        padding: 0.5rem;
        color: #636e72;
        transition: color 0.3s ease;

        &:hover {
          color: #e74c3c;
        }
      }
    }

    .modal-body {
      margin-bottom: 2.5rem;
      text-align: center;

      .book-title-delete {
        font-weight: 600;
        color: #e74c3c;
        font-size: 1.3rem;
        margin: 1.5rem 0;
        padding: 1rem;
        background: rgba(231, 76, 60, 0.05);
        border-radius: 10px;
        border-left: 3px solid #e74c3c;
      }

      .warning-text {
        color: #e74c3c;
        font-weight: 500;
        font-size: 0.9rem;
      }
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;

      .nature-btn {
        padding: 0.9rem 2rem;
        border: 1px solid;
        border-radius: 25px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        min-width: 120px;

        &.cancel-btn {
          background: transparent;
          color: #636e72;
          border-color: #b2bec3;

          &:hover {
            background: #636e72;
            color: white;
            border-color: #636e72;
          }
        }

        &.delete-btn {
          background: #e74c3c;
          color: white;
          border-color: #e74c3c;

          &:hover {
            background: #c0392b;
            border-color: #c0392b;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
          }
        }
      }
    }
  }

  @media (max-width: 768px) {
    .homeback-button {
      top: 10px;
      left: 10px;
      padding: 10px 15px;
      
      .home-text {
        display: none;
      }
    }

    .main-content {
      padding: 1rem;
    }

    .nature-section-title {
      font-size: 1.8rem;
    }

    .section-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .books-grid {
      &.featured,
      &.all-books {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
    }

    .modal-actions {
      flex-direction: column;
      
      .nature-btn {
        width: 100%;
      }
    }
  }
`;

export default BooksPage;