// src/pages/BookDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { bookService } from "../services/book";
import { UseAuth } from "../context/AuthContext";

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, isLoading: authLoading } = UseAuth();
  
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // THÊM STATE CHO REVIEW
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    // Đợi auth load xong trước khi load book data
    if (id && !authLoading) {
      loadBookData();
    }
  }, [id, authLoading]);

  const loadBookData = async () => {
    try {
      // Đợi auth load xong trước khi load book data
      if (authLoading) {
        return;
      }
      setLoading(true);
      
      const [bookData, chaptersData, commentsData] = await Promise.all([
        bookService.getBook(id),
        bookService.getBookChapters(id),
        bookService.getBookComments(id, { limit: 10 })
      ]);

      console.log("📚 Book Detail Data:", bookData);
      console.log("📚 Book Info:", bookData.book || bookData);
      console.log("📚 Book Info keys:", Object.keys(bookData.book || bookData));
      console.log("📚 is_bookmarked in response:", (bookData.book || bookData).is_bookmarked);
      
      const bookInfo = bookData.book || bookData;
      setBook(bookInfo);
      setChapters(chaptersData.chapters || []);
      setComments(commentsData.comments || []);
      
      // Load favorite and bookmark status từ API response
      // Endpoint getBook đã trả về is_favorite và is_bookmarked nếu user đã đăng nhập
      // Luôn load từ API response, không phụ thuộc vào isAuthenticated state
      // vì khi reload, isAuthenticated có thể chưa được load kịp
      try {
        // Load favorite status
        if (bookInfo.is_favorite !== undefined) {
          setIsFavorite(bookInfo.is_favorite || false);
        } else if (isAuthenticated) {
          // Fallback: gọi API riêng nếu không có trong bookInfo và user đã đăng nhập
          try {
            const favoriteStatus = await bookService.getFavoriteStatus(id);
            setIsFavorite(favoriteStatus.is_favorite || false);
          } catch (error) {
            console.error("Error loading favorite status:", error);
            setIsFavorite(false);
          }
        } else {
          setIsFavorite(false);
        }
        
        // Load bookmark status từ bookInfo (API getBook đã trả về)
        if (bookInfo.is_bookmarked !== undefined) {
          setIsBookmarked(bookInfo.is_bookmarked || false);
          console.log("✅ Loaded bookmark status from API:", bookInfo.is_bookmarked);
        } else if (isAuthenticated) {
          // Fallback: gọi API riêng để check bookmark status nếu user đã đăng nhập
          try {
            const bookmarkStatus = await bookService.getBookmarkStatus(id);
            setIsBookmarked(bookmarkStatus.is_bookmarked || false);
            console.log("✅ Loaded bookmark status from status endpoint:", bookmarkStatus.is_bookmarked);
          } catch (error) {
            console.error("Error loading bookmark status:", error);
            setIsBookmarked(false);
          }
        } else {
          setIsBookmarked(false);
        }
      } catch (error) {
        console.error("Error loading favorite/bookmark status:", error);
        // Set default values nếu có lỗi
        setIsFavorite(false);
        setIsBookmarked(false);
      }

      // Load related books
      loadRelatedBooks(bookData.book?.category_id);

    } catch (error) {
      console.error("❌ Error loading book details:", error);
      setBook(null);
    } finally {
      // Chỉ kết thúc loading khi auth đã load xong
      if (!authLoading) {
        setLoading(false);
      }
    }
  };

const loadRelatedBooks = async (categoryId) => {
  if (!categoryId) return;
  
  try {
    const response = await bookService.searchByCategory(categoryId, { limit: 4 });
    
    console.log("🔍 Related Books API Response:", response);
    
    // Xử lý dữ liệu để đảm bảo có rating
    const processedBooks = (response.books || response || []).map(book => {
      console.log(`📖 Related Book ${book.id}:`, {
        title: book.title,
        avg_rating: book.avg_rating,
        average_rating: book.average_rating,
        rating: book.rating,
        allKeys: Object.keys(book)
      });
      
      // Xác định rating từ nhiều field có thể
      const rating = book.avg_rating || book.average_rating || book.rating || 0;
      
      return {
        id: book.id,
        title: book.title,
        cover_image: book.cover_image || "/default-cover.jpg",
        avg_rating: rating
      };
    });
    
    console.log("✅ Processed Related Books:", processedBooks);
    setRelatedBooks(processedBooks);
  } catch (error) {
    console.error("Error loading related books:", error);
    setRelatedBooks([]);
  }
};

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    try {
      const newFavoriteStatus = !isFavorite;
      
      if (newFavoriteStatus) {
        await bookService.addFavorite(id);
        console.log("✅ Added to favorites");
      } else {
        await bookService.removeFavorite(id);
        console.log("❌ Removed from favorites");
      }
      
      setIsFavorite(newFavoriteStatus);
    } catch (error) {
      console.error("Error updating favorite:", error);
    }
  };

  const handleBookmarkClick = async () => {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    try {
      const newBookmarkStatus = !isBookmarked;
      const oldBookmarkStatus = isBookmarked;
      
      // Optimistic update
      setIsBookmarked(newBookmarkStatus);
      
      if (newBookmarkStatus) {
        await bookService.addBookmark(id, { page_number: 1 });
        console.log("✅ Bookmark added");
      } else {
        // Xóa bookmark khi unbookmark
        await bookService.deleteBookmarkByBookId(id);
        console.log("❌ Bookmark removed");
      }
    } catch (error) {
      console.error("Error updating bookmark:", error);
      // Rollback state nếu có lỗi - dùng oldBookmarkStatus vì isBookmarked đã bị thay đổi
      setIsBookmarked(oldBookmarkStatus);
    }
  };

  // SỬA HÀM RATING CLICK
  const handleRatingClick = async (rating) => {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    // Hiển thị modal để nhập review
    setSelectedRating(rating);
    setShowReviewModal(true);
  };

  // THÊM HÀM SUBMIT REVIEW
  const submitReview = async () => {
    try {
      await bookService.rateBook(id, { 
        rating: selectedRating, 
        review: reviewText 
      });
      
      setUserRating(selectedRating);
      setShowReviewModal(false);
      setReviewText("");
      
      // Reload comments để hiển thị review mới
      const commentsData = await bookService.getBookComments(id, { limit: 10 });
      setComments(commentsData.comments || []);
      
      // Reload book data để cập nhật rating trung bình
      await loadBookData();
      
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    if (!newComment.trim()) return;

    try {
      await bookService.addComment(id, { content: newComment });
      setNewComment("");
      // Reload comments
      const commentsData = await bookService.getBookComments(id, { limit: 10 });
      setComments(commentsData.comments || []);
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  const handleChapterClick = (chapterId) => {
    navigate(`/books/${id}/chapters/${chapterId}`);
  };

  const handleReadBook = () => {
    if (book?.pdf_path) {
      window.open(book.pdf_path, '_blank');
    } else if (chapters.length > 0) {
      handleChapterClick(chapters[0].id);
    } else {
      alert("This book has no content available to read!");
    }
  };

  const handleEditBook = () => {
    navigate(`/admin/books`);
  };

  const handleAddChapter = () => {
    navigate(`/books/${id}/chapters/create`);
  };

  // THÊM HÀM RENDER COMMENT ITEM VỚI REVIEW
  const renderCommentItem = (comment) => (
    <div key={comment.id} className="comment-item">
      <div className="comment-header">
        <div className="comment-author">
          <span className="author-avatar">👤</span>
          <span className="author-name">
            {comment.user?.username || "Anonymous user"}
          </span>
          {/* Hiển thị rating nếu comment có rating */}
          {comment.rating && (
            <div className="comment-rating">
              {"⭐".repeat(comment.rating?.rating || comment.rating)}
              <span className="rating-value">({comment.rating?.rating || comment.rating}.0)</span>
            </div>
          )}
        </div>
        <span className="comment-date">
          {new Date(comment.created_at).toLocaleDateString('en-US')}
        </span>
      </div>
      
      {/* Hiển thị review text nếu có */}
      {comment.rating?.review && (
        <div className="comment-review">
          <strong>Review:</strong> {comment.rating.review}
        </div>
      )}
      
      <div className="comment-content">
        {comment.content}
      </div>
      
      {/* Hiển thị replies nếu có */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map(reply => renderCommentItem(reply))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <StyledWrapper>
        <Header />
        <div className="loading-container">
          <div className="comic-spinner"></div>
          <p className="comic-text">LOADING BOOK INFORMATION...</p>
        </div>
        <Footer />
      </StyledWrapper>
    );
  }

  if (!book) {
    return (
      <StyledWrapper>
        <Header />
        <div className="error-container">
          <div className="comic-error">
            <h2>📚 BOOK NOT FOUND</h2>
            <p>The book you are looking for does not exist or has been deleted.</p>
            <button 
              className="comic-btn primary"
              onClick={() => navigate("/books")}
            >
              ← BACK TO LIBRARY
            </button>
          </div>
        </div>
        <Footer />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <Header />
      
      <main className="book-detail-main">
        {/* Book Header Section */}
        <section className="book-header">
          <div className="book-cover-section">
            <div className="book-cover-comic">
              <img
                src={book.cover_image || "/default-cover.jpg"}
                alt={book.title}
                className="comic-cover-image"
                onError={(e) => {
                  e.target.src = "/default-cover.jpg";
                }}
              />
              
              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className={`comic-action-btn favorite-btn ${isFavorite ? "active" : ""}`}
                  onClick={handleFavoriteClick}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  {isFavorite ? "💖" : "🤍"}
                </button>
                
                <button
                  className={`comic-action-btn bookmark-btn ${isBookmarked ? "active" : ""}`}
                  onClick={handleBookmarkClick}
                  title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                >
                  {isBookmarked ? "🔖" : "📑"}
                </button>

                {isAdmin && (
                  <>
                    <button
                      className="comic-action-btn edit-btn"
                      onClick={handleEditBook}
                      title="Edit book"
                    >
                      ✏️
                    </button>
                    
                    <button
                      className="comic-action-btn add-chapter-btn"
                      onClick={handleAddChapter}
                      title="Add new chapter"
                    >
                      📝
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="book-info-section">
            <h1 className="book-title-comic">{book.title}</h1>
            
            <div className="book-meta">
              <div className="meta-item">
                <span className="meta-icon">✍️</span>
                <span className="meta-text">
                  {Array.isArray(book.authors) 
                    ? book.authors.map(author => author.name || author).join(", ")
                    : book.authors || "No author information"
                  }
                </span>
              </div>
              
              <div className="meta-item">
                <span className="meta-icon">🏷️</span>
                <span className="meta-text">
                  {book.category?.name || book.category_name || "Uncategorized"}
                </span>
              </div>
              
              {book.publication_year && (
                <div className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span className="meta-text">{book.publication_year}</span>
                </div>
              )}
              
              {book.isbn && (
                <div className="meta-item">
                  <span className="meta-icon">📚</span>
                  <span className="meta-text">ISBN: {book.isbn}</span>
                </div>
              )}
            </div>

            <div className="book-stats">
              <div className="stat-item">
                <span className="stat-icon">👁️</span>
                <span className="stat-number">{book.view_count || 0}</span>
                <span className="stat-label">Views</span>
              </div>
              
              {/* SỬA LỖI SYNTAX Ở ĐÂY */}
              <div className="stat-item">
                <span className="stat-icon">⭐</span>
                <span className="stat-number">{book.avg_rating?.toFixed(1) || "0.0"}</span>
                <span className="stat-label">Rating</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-icon">📖</span>
                <span className="stat-number">{chapters.length}</span>
                <span className="stat-label">Chapters</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-icon">💬</span>
                <span className="stat-number">{comments.length}</span>
                <span className="stat-label">Comments</span>
              </div>
            </div>

            {/* Rating Section */}
            <div className="rating-section">
              <h3>RATE THIS BOOK:</h3>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${star <= userRating ? "active" : ""}`}
                    onClick={() => handleRatingClick(star)}
                    disabled={!isAuthenticated}
                    title={`Rate ${star} stars`}
                  >
                    ⭐
                  </button>
                ))}
                <span className="rating-text">
                  {userRating ? `You rated: ${userRating} stars` : "Select stars to rate"}
                </span>
              </div>
            </div>

            {/* Read Button */}
            <div className="action-section">
              <button 
                className="comic-read-btn large"
                onClick={handleReadBook}
              >
                <span className="btn-icon">📖</span>
                START READING
              </button>
              
              {chapters.length > 0 && (
                <button 
                  className="comic-read-btn outline"
                  onClick={() => setActiveTab("chapters")}
                >
                  <span className="btn-icon">📑</span>
                  CHAPTER LIST ({chapters.length})
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="tab-section">
          <div className="comic-tabs">
            <button 
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              📋 OVERVIEW
            </button>
            <button 
              className={`tab-btn ${activeTab === "chapters" ? "active" : ""}`}
              onClick={() => setActiveTab("chapters")}
            >
              📑 CHAPTER LIST
            </button>
            <button 
              className={`tab-btn ${activeTab === "comments" ? "active" : ""}`}
              onClick={() => setActiveTab("comments")}
            >
              💬 COMMENTS & REVIEWS
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "overview" && (
              <div className="overview-content">
                <h3>📖 BOOK DESCRIPTION</h3>
                <div className="description-text">
                  {book.description || "No description available."}
                </div>
                
                {/* Related Books */}
                {relatedBooks.length > 0 && (
                  <div className="related-books">
                    <h4>📚 RELATED BOOKS</h4>
                    <div className="related-books-grid">
                      {relatedBooks.map(relatedBook => (
                        <div 
                          key={relatedBook.id}
                          className="related-book-card"
                          onClick={() => navigate(`/books/${relatedBook.id}`)}
                        >
                          <img 
                            src={relatedBook.cover_image || "/default-cover.jpg"} 
                            alt={relatedBook.title}
                          />
                          <div className="related-book-info">
                            <h5>{relatedBook.title}</h5>
                            <p>⭐ {relatedBook.avg_rating?.toFixed(1) || "0.0"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "chapters" && (
              <div className="chapters-content">
                <h3>📑 CHAPTER LIST ({chapters.length})</h3>
                {chapters.length > 0 ? (
                  <div className="chapters-list">
                    {chapters.map((chapter, index) => (
                      <div 
                        key={chapter.id}
                        className="chapter-item"
                        onClick={() => handleChapterClick(chapter.id)}
                      >
                        <div className="chapter-number">
                          Chapter {index + 1}
                        </div>
                        <div className="chapter-info">
                          <h4>{chapter.title || `Chapter ${index + 1}`}</h4>
                          {chapter.created_at && (
                            <span className="chapter-date">
                              {new Date(chapter.created_at).toLocaleDateString('en-US')}
                            </span>
                          )}
                        </div>
                        <div className="chapter-arrow">➡️</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="comic-empty-state">
                    <div className="empty-icon">📝</div>
                    <p>No chapters available</p>
                    {isAdmin && (
                      <button 
                        className="comic-btn primary"
                        onClick={handleAddChapter}
                      >
                        ADD FIRST CHAPTER
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="comments-content">
                <h3>💬 COMMENTS & REVIEWS ({comments.length})</h3>
                
                {/* Review Modal */}
                {showReviewModal && (
                  <div className="comic-modal-overlay">
                    <div className="comic-modal">
                      <div className="modal-header">
                        <h3>⭐ WRITE A REVIEW</h3>
                        <div className="modal-close" onClick={() => setShowReviewModal(false)}>
                          ×
                        </div>
                      </div>
                      <div className="modal-body">
                        <div className="rating-section">
                          <p>Your Rating: {selectedRating} stars</p>
                          <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                className={`star-btn ${star <= selectedRating ? "active" : ""}`}
                                onClick={() => setSelectedRating(star)}
                              >
                                ⭐
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="review-textarea">
                          <label>Your Review (optional):</label>
                          <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your thoughts about this book..."
                            rows="4"
                            className="comic-textarea"
                          />
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button className="comic-btn cancel-btn" onClick={() => setShowReviewModal(false)}>
                          CANCEL
                        </button>
                        <button className="comic-btn primary" onClick={submitReview}>
                          SUBMIT REVIEW
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comment Form */}
                {isAuthenticated ? (
                  <div className="comment-forms">
                    {/* Comment Form */}
                    <form className="comment-form" onSubmit={handleCommentSubmit}>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your comment about this book..."
                        rows="4"
                        className="comic-textarea"
                      />
                      <button 
                        type="submit"
                        className="comic-btn primary"
                        disabled={!newComment.trim()}
                      >
                        📤 SUBMIT COMMENT
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="login-prompt">
                    <p>Please login to comment and review books</p>
                    <button 
                      className="comic-btn primary"
                      onClick={() => navigate("/auth/login")}
                    >
                      🔐 LOGIN
                    </button>
                  </div>
                )}

                {/* Comments & Reviews List */}
                <div className="comments-list">
                  {comments.length > 0 ? (
                    comments.map(comment => renderCommentItem(comment))
                  ) : (
                    <div className="comic-empty-state">
                      <div className="empty-icon">💬</div>
                      <p>No comments yet</p>
                      <p>Be the first to comment or review this book!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </StyledWrapper>
  );
};
// Styled Components
const StyledWrapper = styled.div`
  min-height: 100vh;
  width : 100vw;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
  color: #2c3e50;
  font-family: "Comic Neue", cursive;

  .loading-container,
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 1rem;
    padding: 2rem;
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

  .comic-error {
    text-align: center;
    background: white;
    padding: 3rem;
    border-radius: 20px;
    border: 4px solid #2c3e50;
    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);

    h2 {
      color: #e74c3c;
      margin-bottom: 1rem;
    }

    p {
      margin-bottom: 2rem;
      color: #636e72;
    }
  }

  .book-detail-main {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  /* Book Header Styles */
  .book-header {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 3rem;
    margin-bottom: 3rem;
    background: white;
    padding: 2rem;
    border-radius: 25px;
    border: 4px solid #2c3e50;
    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  .book-cover-section {
    .book-cover-comic {
      position: relative;
      width: 100%;
      height: 400px;
      border-radius: 20px;
      overflow: hidden;
      border: 4px solid #2c3e50;
      background: linear-gradient(45deg, #ffeaa7, #a29bfe);

      .comic-cover-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .action-buttons {
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .comic-action-btn {
          background: rgba(255, 255, 255, 0.95);
          border: 2px solid #2c3e50;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1.3rem;
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.2);

          &:hover {
            transform: scale(1.1);
          }

          &.favorite-btn.active {
            background: #e74c3c;
            border-color: #c0392b;
          }

          &.bookmark-btn.active {
            background: #f39c12;
            border-color: #e67e22;
          }

          &.edit-btn:hover {
            background: #3498db;
            border-color: #2980b9;
          }

          &.add-chapter-btn:hover {
            background: #27ae60;
            border-color: #229954;
          }
        }
      }
    }
  }

  .book-info-section {
    .book-title-comic {
      font-size: 2.5rem;
      margin-bottom: 1.5rem;
      color: #2c3e50;
      text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.1);
      line-height: 1.2;
    }

    .book-meta {
      margin-bottom: 2rem;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        margin-bottom: 0.8rem;
        font-size: 1.1rem;

        .meta-icon {
          font-size: 1.2rem;
        }

        .meta-text {
          color: #2c3e50;
          font-weight: 500;
        }
      }
    }

    .book-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;

      .stat-item {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 15px;
        text-align: center;
        border: 2px solid #dee2e6;

        .stat-icon {
          font-size: 1.5rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .stat-number {
          font-size: 1.3rem;
          font-weight: bold;
          color: #2c3e50;
          display: block;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #6c757d;
        }
      }
    }

    .rating-section {
      margin-bottom: 2rem;

      h3 {
        margin-bottom: 1rem;
        color: #2c3e50;
      }

      .rating-stars {
        display: flex;
        align-items: center;
        gap: 1rem;

        .star-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0.2rem;

          &:hover:not(:disabled) {
            transform: scale(1.3);
          }

          &.active {
            filter: brightness(1.2);
          }

          &:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }
        }

        .rating-text {
          color: #636e72;
          font-style: italic;
        }
      }
    }

    .action-section {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;

      .comic-read-btn {
        padding: 1rem 2rem;
        border: 3px solid #2c3e50;
        border-radius: 15px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        font-size: 1.1rem;

        &.large {
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          color: white;
          box-shadow: 4px 4px 0px #2c3e50;

          &:hover {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px #2c3e50;
          }
        }

        &.outline {
          background: white;
          color: #2c3e50;

          &:hover {
            background: #f8f9fa;
            transform: translateY(-2px);
          }
        }

        .btn-icon {
          font-size: 1.3rem;
        }
      }
    }
  }

  /* Tab Styles */
  .tab-section {
    background: white;
    border-radius: 25px;
    border: 4px solid #2c3e50;
    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
    overflow: hidden;

    .comic-tabs {
      display: flex;
      background: #f8f9fa;
      border-bottom: 3px solid #2c3e50;

      .tab-btn {
        flex: 1;
        padding: 1.2rem;
        background: none;
        border: none;
        cursor: pointer;
        font-weight: bold;
        font-size: 1.1rem;
        transition: all 0.3s ease;
        border-right: 2px solid #dee2e6;

        &:last-child {
          border-right: none;
        }

        &:hover {
          background: #e9ecef;
        }

        &.active {
          background: #4ecdc4;
          color: white;
        }
      }
    }

    .tab-content {
      padding: 2rem;

      .overview-content {
        .description-text {
          line-height: 1.6;
          margin-bottom: 2rem;
          font-size: 1.1rem;
          color: #2c3e50;
          white-space: pre-line;
        }

        .related-books {
          h4 {
            margin-bottom: 1.5rem;
            color: #2c3e50;
          }

          .related-books-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;

            .related-book-card {
              background: #f8f9fa;
              border-radius: 15px;
              padding: 1rem;
              cursor: pointer;
              transition: all 0.3s ease;
              border: 2px solid #dee2e6;
              text-align: center;

              &:hover {
                transform: translateY(-5px);
                box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.1);
              }

              img {
                width: 80px;
                height: 120px;
                object-fit: cover;
                border-radius: 10px;
                margin-bottom: 0.5rem;
              }

              .related-book-info {
                h5 {
                  font-size: 0.9rem;
                  margin-bottom: 0.5rem;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                }

                p {
                  font-size: 0.8rem;
                  color: #f39c12;
                  font-weight: bold;
                }
              }
            }
          }
        }
      }

      .chapters-content {
        .chapters-list {
          .chapter-item {
            display: flex;
            align-items: center;
            padding: 1rem;
            border: 2px solid #dee2e6;
            border-radius: 15px;
            margin-bottom: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9fa;

            &:hover {
              background: #e9ecef;
              transform: translateX(5px);
              border-color: #4ecdc4;
            }

            .chapter-number {
              background: #4ecdc4;
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 10px;
              font-weight: bold;
              margin-right: 1rem;
              min-width: 100px;
              text-align: center;
            }

            .chapter-info {
              flex: 1;

              h4 {
                margin: 0 0 0.3rem 0;
                color: #2c3e50;
              }

              .chapter-date {
                font-size: 0.9rem;
                color: #6c757d;
              }
            }

            .chapter-arrow {
              font-size: 1.2rem;
              opacity: 0.7;
            }
          }
        }
      }

      .comments-content {
        .comment-form {
          margin-bottom: 2rem;

          .comic-textarea {
            width: 100%;
            padding: 1rem;
            border: 3px solid #2c3e50;
            border-radius: 15px;
            font-family: inherit;
            font-size: 1rem;
            resize: vertical;
            margin-bottom: 1rem;
            box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.1);

            &:focus {
              outline: none;
              box-shadow: 3px 3px 0px #4ecdc4;
            }
          }
        }

        .login-prompt {
          text-align: center;
          padding: 2rem;
          background: #f8f9fa;
          border-radius: 15px;
          margin-bottom: 2rem;

          p {
            margin-bottom: 1rem;
            color: #636e72;
          }
        }

        .comments-list {
          .comment-item {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 15px;
            margin-bottom: 1rem;
            border: 2px solid #dee2e6;

            .comment-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1rem;

              .comment-author {
                display: flex;
                align-items: center;
                gap: 0.8rem;

                .author-avatar {
                  font-size: 1.2rem;
                }

                .author-name {
                  font-weight: bold;
                  color: #2c3e50;
                }
              }

              .comment-date {
                color: #6c757d;
                font-size: 0.9rem;
              }
            }

            .comment-content {
              line-height: 1.5;
              color: #2c3e50;
            }
          }
        }
      }
    }
  }
/* THÊM CSS CHO REVIEW */
  .comment-rating {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1rem;
  }

  .rating-value {
    color: #f39c12;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .comment-review {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 10px;
    padding: 1rem;
    margin: 0.5rem 0;
    font-style: italic;
  }

  .comment-review strong {
    color: #e67e22;
  }

  .comment-replies {
    margin-left: 2rem;
    margin-top: 1rem;
    padding-left: 1rem;
    border-left: 3px solid #4ecdc4;
  }

  .review-textarea {
    margin-top: 1rem;
  }

  .review-textarea label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: #2c3e50;
  }

  .comment-forms {
    margin-bottom: 2rem;
  }

  /* Modal Styles */
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

        &.primary {
          background: #4ecdc4;
          color: white;

          &:hover {
            background: #44a08d;
          }
        }

        &:hover {
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0px rgba(0, 0, 0, 0.2);
        }
      }
    }
  }
  .comic-empty-state {
    text-align: center;
    padding: 3rem;
    background: #f8f9fa;
    border-radius: 15px;
    border: 2px dashed #dee2e6;

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    p {
      color: #636e72;
      margin-bottom: 1rem;
    }
  }

  .comic-btn {
    padding: 0.8rem 1.5rem;
    border: 3px solid #2c3e50;
    border-radius: 15px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.2);

    &.primary {
      background: #4ecdc4;
      color: white;

      &:hover:not(:disabled) {
        background: #44a08d;
        transform: translate(-2px, -2px);
        box-shadow: 5px 5px 0px rgba(0, 0, 0, 0.2);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export default BookDetailPage;