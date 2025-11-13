// src/pages/BooksPage.jsx
import { useNavigate } from "react-router-dom";
import React, { useState, useMemo, useCallback } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FaHome, FaLeaf, FaTree, FaSeedling } from "react-icons/fa";


const BooksPage = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const booksPerPage = 10;
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = UseAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  const {
    data: popularBooksData,
    isLoading: popularBooksLoading,
    isError: isPopularBooksError,
  } = useQuery({
    queryKey: ["books", "popular"],
    queryFn: () => bookService.getPopularBooks(),
    enabled: !authLoading,
  });

  const {
    data: booksData,
    isLoading: booksLoading,
    isError: isBooksError,
    error: booksError,
    isFetching: isFetchingBooks,
  } = useQuery({
    queryKey: ["books", "list"],
    queryFn: () => bookService.getBooks({ per_page: 200 }),
    enabled: !authLoading,
  });

  const featuredBooks = useMemo(() => {
    const popularBooks = popularBooksData?.books ?? [];
    const uniqueFeatured = [];
    const seenIds = new Set();

    for (const book of popularBooks) {
      if (book?.id == null) continue;
      if (seenIds.has(book.id)) continue;
      seenIds.add(book.id);
      uniqueFeatured.push(book);
      if (uniqueFeatured.length === 4) break;
    }

    return uniqueFeatured;
  }, [popularBooksData]);

  const allBooks = useMemo(() => {
    const books = booksData?.books ?? [];
    const seenIds = new Set();
    const uniqueBooks = [];

    for (const book of books) {
      if (book?.id == null) continue;
      if (seenIds.has(book.id)) continue;
      seenIds.add(book.id);
      uniqueBooks.push(book);
    }

    return uniqueBooks.sort((a, b) => {
      const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [booksData]);

  const currentBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * booksPerPage;
    const endIndex = startIndex + booksPerPage;
    return allBooks.slice(startIndex, endIndex);
  }, [allBooks, booksPerPage, currentPage]);

  const totalBooksCount = allBooks.length;
  const totalPages = Math.max(1, Math.ceil(totalBooksCount / booksPerPage));

  const isInitialLoading =
    authLoading || booksLoading || popularBooksLoading;
  const booksErrorMessage =
    isBooksError &&
    (booksError?.response?.data?.message ||
      booksError?.message ||
      "Unable to load books.");
  const popularErrorMessage = isPopularBooksError
    ? "Unable to load featured books."
    : null;

  const invalidateBookQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["books", "list"] });
    queryClient.invalidateQueries({ queryKey: ["books", "popular"] });
  }, [queryClient]);

  const rateBookMutation = useMutation({
    mutationFn: ({ bookId, rating }) =>
      bookService.rateBook(bookId, { rating }),
    onSuccess: () => {
      invalidateBookQueries();
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: (bookId) => bookService.deleteBook(bookId),
    onSuccess: () => {
      invalidateBookQueries();
      setDeleteConfirm(null);
    },
  });

  const handlePageChange = useCallback(
    (pageNumber) => {
      if (
        pageNumber < 1 ||
        pageNumber > totalPages ||
        pageNumber === currentPage
      ) {
        return;
      }

      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentPage, totalPages]
  );

  const handleHomeClick = () => {
    navigate("/");
  };

  const handleCardClick = (bookId) => {
   navigate(`/books/${bookId}`);
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };


  const handleRatingClick = useCallback(
    async (bookId, rating) => {
      try {
        await rateBookMutation.mutateAsync({ bookId, rating });
      } catch (error) {
        console.error("Error rating book:", error);
      }
    },
    [rateBookMutation]
  );

  const handleDeleteClick = (bookId, bookTitle) => {
    setDeleteConfirm({ bookId, bookTitle });
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) {
      return;
    }

    try {
      await deleteBookMutation.mutateAsync(deleteConfirm.bookId);
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("An error occurred while deleting the book!");
    }
  }, [deleteBookMutation, deleteConfirm]);

  const cancelDelete = () => {
    if (deleteBookMutation.isPending) {
      return;
    }
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

  if (isInitialLoading) {
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
      


      <div className="chatbot-floating-button" onClick={handleToggleChat}>
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
              <button
                className="nature-btn cancel-btn"
                onClick={cancelDelete}
                disabled={deleteBookMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="nature-btn delete-btn"
                onClick={confirmDelete}
                disabled={deleteBookMutation.isPending}
              >
                {deleteBookMutation.isPending ? "Deleting..." : "Delete"}
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
          {popularErrorMessage ? (
            <div className="nature-empty-state">
              <div className="empty-icon">⚠️</div>
              <p>{popularErrorMessage}</p>
            </div>
          ) : featuredBooks.length > 0 ? (
            <div className="books-grid featured">
              {featuredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onCardClick={handleCardClick}
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

        <section className="all-books-section">
          <div className="section-header">
            <div className="section-title-container">
              <FaTree className="title-icon" />
              <h2 className="nature-section-title">{t("bookLibrary")}</h2>
            </div>
            <span className="nature-book-count">{totalBooksCount} {t("booksLabel")}</span>
          </div>

          {booksErrorMessage ? (
            <div className="nature-empty-state">
              <div className="empty-icon">⚠️</div>
              <p>{booksErrorMessage}</p>
            </div>
          ) : currentBooks.length > 0 ? (
            <>
              <div className="books-grid all-books">
                {currentBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onCardClick={handleCardClick}
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
              {isFetchingBooks && (
                <div className="nature-pagination-loading">
                  <FaSeedling className="pagination-icon spinning" />
                  <span>{t("loadingBooks")}</span>
                </div>
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
  max-width: 100%;
  max-width: 100vw;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  overflow-x: hidden;
  box-sizing: border-box;
  width : 100vw;

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
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
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
    position: fixed;
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
    max-width: calc(100vw - 40px);
    box-sizing: border-box;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      background: #81b214;
      color: white;
    }

    .home-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .home-text {
      font-weight: 600;
      font-size: 0.9rem;
      white-space: nowrap;
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
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .featured-section,
  .all-books-section {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width : 100vw;
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
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding: 0 1rem;
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
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;

    &.featured {
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }

    &.all-books {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
  }


  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(129, 178, 20, 0.2);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
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
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;

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
      word-wrap: break-word;
      overflow-wrap: break-word;
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
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding: 0 1rem;

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
      box-sizing: border-box;
      white-space: nowrap;

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

  .nature-pagination-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    color: #2d3436;
    font-weight: 500;

    .spinning {
      animation: spin 1.2s linear infinite;
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

  /* Responsive Design - Tablet */
  @media (max-width: 1024px) {
    .main-content {
      padding: 1.5rem;
    }

    .books-grid {
      &.featured {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
      }

      &.all-books {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1.5rem;
      }
    }

    .nature-section-title {
      font-size: 2rem;
    }

    .section-title-container {
      margin-bottom: 2.5rem;
    }

    .floating-leaf {
      font-size: 1.5rem;
      opacity: 0.08;
    }
  }

  /* Responsive Design - Mobile */
  @media (max-width: 768px) {
    .homeback-button {
      top: 80px;
      left: 10px;
      padding: 8px 12px;
      border-radius: 20px;
      z-index: 999;
      
      .home-icon {
        font-size: 1.1rem;
      }
      
      .home-text {
        display: none;
      }

      &:hover {
        transform: translateY(0);
      }
    }

    .chatbot-floating-button {
      bottom: 20px;
      right: 20px;
      z-index: 998;
    }

    .chatbot-popup {
      bottom: 90px;
      right: 20px;
      left: 20px;
      max-width: calc(100vw - 40px);
    }

    .main-content {
      padding: 1rem 0.8rem;
      padding-top: 0.5rem;
    }

    .floating-leaf {
      display: none; /* Ẩn trên mobile để tăng performance */
    }

    .section-title-container {
      gap: 0.8rem;
      margin-bottom: 2rem;
    }

    .title-icon {
      font-size: 1.2rem;
    }

    .nature-section-title {
      font-size: 1.6rem;
      letter-spacing: 0.5px;

      &::after {
        width: 40px;
        bottom: -8px;
      }
    }

    .section-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 0.8rem;
    }

    .nature-book-count {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }

    .books-grid {
      gap: 1.5rem;

      &.featured {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      &.all-books {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1.2rem;
      }
    }

    .nature-empty-state {
      padding: 3rem 1.5rem;
      margin: 1.5rem 0;

      .empty-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }

      p {
        font-size: 1rem;
      }

      .empty-subtext {
        font-size: 0.9rem;
      }
    }

    .nature-pagination {
      gap: 0.5rem;
      margin-top: 3rem;
      padding: 0 1rem;

      .nature-pagination-btn {
        padding: 0.6rem 1rem;
        font-size: 0.85rem;
        min-width: auto;

        .pagination-icon {
          font-size: 0.8rem;
        }
      }
    }

    .nature-modal {
      padding: 1.5rem;
      margin: 1rem;
      max-width: calc(100vw - 2rem);

      .modal-header {
        margin-bottom: 1.5rem;
        padding-bottom: 0.8rem;

        .modal-icon {
          font-size: 1.2rem;
        }

        h3 {
          font-size: 1.1rem;
        }

        .modal-close {
          font-size: 1.5rem;
        }
      }

      .modal-body {
        margin-bottom: 1.5rem;

        .book-title-delete {
          font-size: 1.1rem;
          padding: 0.8rem;
          margin: 1rem 0;
        }

        .warning-text {
          font-size: 0.85rem;
        }
      }

      .modal-actions {
        flex-direction: column;
        gap: 0.8rem;
        
        .nature-btn {
          width: 100%;
          padding: 0.8rem 1.5rem;
          min-width: auto;
        }
      }
    }

    .loading-container {
      padding: 2rem 1rem;
    }

    .nature-spinner {
      width: 60px;
      height: 60px;

      .spinner-icon {
        font-size: 1.2rem;
      }
    }

    .nature-text {
      font-size: 1rem;
    }
  }

  /* Responsive Design - Small Mobile */
  @media (max-width: 480px) {
    .homeback-button {
      top: 70px;
      left: 8px;
      padding: 6px 10px;
      border-radius: 18px;
    }

    .chatbot-floating-button {
      bottom: 15px;
      right: 15px;
    }

    .chatbot-popup {
      bottom: 80px;
      right: 15px;
      left: 15px;
      max-width: calc(100vw - 30px);
    }

    .main-content {
      padding: 0.8rem 0.6rem;
      padding-top: 0.3rem;
    }

    .section-title-container {
      gap: 0.6rem;
      margin-bottom: 1.5rem;
    }

    .title-icon {
      font-size: 1rem;
    }

    .nature-section-title {
      font-size: 1.4rem;
      letter-spacing: 0.3px;

      &::after {
        width: 35px;
        bottom: -6px;
      }
    }

    .section-header {
      margin-bottom: 1.5rem;
      padding-bottom: 0.6rem;
    }

    .nature-book-count {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }

    .books-grid {
      gap: 1rem;

      &.featured {
        gap: 1.2rem;
      }

      &.all-books {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 1rem;
      }
    }

    .nature-empty-state {
      padding: 2rem 1rem;
      margin: 1rem 0;
      border-radius: 15px;

      .empty-icon {
        font-size: 2rem;
        margin-bottom: 0.8rem;
      }

      p {
        font-size: 0.95rem;
      }

      .empty-subtext {
        font-size: 0.85rem;
      }
    }

    .nature-pagination {
      gap: 0.4rem;
      margin-top: 2rem;
      padding: 0 0.5rem;

      .nature-pagination-btn {
        padding: 0.5rem 0.8rem;
        font-size: 0.8rem;
        border-radius: 20px;

        .pagination-icon {
          font-size: 0.7rem;
        }
      }
    }

    .nature-modal {
      padding: 1.2rem;
      margin: 0.8rem;
      max-width: calc(100vw - 1.6rem);
      border-radius: 15px;

      .modal-header {
        margin-bottom: 1.2rem;
        padding-bottom: 0.6rem;
        gap: 0.8rem;

        .modal-icon {
          font-size: 1.1rem;
        }

        h3 {
          font-size: 1rem;
        }

        .modal-close {
          font-size: 1.3rem;
          padding: 0.3rem;
        }
      }

      .modal-body {
        margin-bottom: 1.2rem;

        p {
          font-size: 0.9rem;
        }

        .book-title-delete {
          font-size: 1rem;
          padding: 0.6rem;
          margin: 0.8rem 0;
        }

        .warning-text {
          font-size: 0.8rem;
        }
      }

      .modal-actions {
        gap: 0.6rem;
        
        .nature-btn {
          padding: 0.7rem 1.2rem;
          font-size: 0.9rem;
        }
      }
    }

    .loading-container {
      padding: 1.5rem 0.8rem;
    }

    .nature-spinner {
      width: 50px;
      height: 50px;

      .spinner-icon {
        font-size: 1rem;
      }
    }

    .nature-text {
      font-size: 0.95rem;
    }
  }

  /* Extra Small Mobile */
  @media (max-width: 360px) {
    .main-content {
      padding: 0.6rem 0.5rem;
    }

    .nature-section-title {
      font-size: 1.3rem;
    }

    .books-grid {
      &.all-books {
        grid-template-columns: 1fr;
      }
    }

    .nature-pagination {
      .nature-pagination-btn {
        padding: 0.4rem 0.6rem;
        font-size: 0.75rem;
      }
    }
  }
`;

export default BooksPage;