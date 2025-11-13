// src/components/BookCard.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import LazyImage from "./LazyImage";

const BookCard = ({
  book,
  onCardClick,
  onRatingClick,
  onDeleteClick,
  variant = "default",
  isAdmin = false,
}) => {
  const [userRating, setUserRating] = useState(book.user_rating || 0);
  const [showRating, setShowRating] = useState(false);

  // Format dữ liệu từ API - FIXED cho đúng cấu trúc thực tế
  const bookData = {
    id: book.id,
    title: book.title || "No title",
    // FIX: Xử lý authors đúng cách (có thể là array hoặc string)
    author: Array.isArray(book.authors)
      ? book.authors.map((author) => author.name || author).join(", ")
      : book.authors || "Unknown author",
    cover_image: book.cover_image || "/default-cover.webp",
    view_count: book.view_count || 0,
    avg_rating: book.avg_rating || 0,
    category: book.category?.name || book.category_name || "Uncategorized",
    description: book.description || "No description available",
    created_at: book.created_at,
    isbn: book.isbn,
    publication_year: book.publication_year,
  };
  useEffect(() => {
    setUserRating(book.user_rating || 0);
  }, [book.user_rating]);

  const handleRatingClick = (rating, e) => {
    e.stopPropagation();
    setUserRating(rating);
    setShowRating(false);
    if (onRatingClick) {
      onRatingClick(book.id, rating);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDeleteClick) {
      onDeleteClick(book.id, book.title);
    }
  };

  const toggleRating = (e) => {
    e.stopPropagation();
    setShowRating(!showRating);
  };


  return (
    <CardWrapper
      className={`comic-book-card ${variant}`}
      onClick={() => onCardClick && onCardClick(book.id)}
    >
      {/* Hiệu ứng comic border */}
      <div className="comic-border"></div>

      <div className="book-cover-comic">
        <LazyImage
          src={bookData.cover_image}
          alt={bookData.title}
          fallback="/default-cover.webp"
          className="comic-cover-image"
          loading="lazy"
        />

        {/* Delete button (only shown for admin) */}
        {isAdmin && onDeleteClick && (
          <button
            className="comic-action-btn delete-btn"
            onClick={handleDeleteClick}
            aria-label="Delete book"
          >
            <span className="btn-icon">🗑️</span>
          </button>
        )}

        {/* Tag featured book based on rating */}
        {bookData.avg_rating >= 4.5 && (
          <div className="comic-tag hot">⭐ FEATURED</div>
        )}

        {/* Tag new book (within 7 days) */}
        {bookData.created_at &&
          new Date() - new Date(bookData.created_at) <
            7 * 24 * 60 * 60 * 1000 && (
            <div className="comic-tag new">🆕 NEW</div>
          )}

        {/* Hiệu ứng hover comic */}
        <div className="comic-hover-effect">
          <div className="hover-text">📖 READ MORE!</div>
        </div>
      </div>

      <div className="comic-book-info">
        <h3 className="comic-book-title">{bookData.title}</h3>
        <p className="comic-book-author">✍️ {bookData.author}</p>

        {/* Short description */}
        {bookData.description && variant === "featured" && (
          <p className="comic-book-description">
            {bookData.description.length > 100
              ? `${bookData.description.substring(0, 100)}...`
              : bookData.description}
          </p>
        )}

        <div className="comic-book-stats">
          <div className="comic-views">
            <span className="eye-icon">👁️</span>
            <span>{bookData.view_count.toLocaleString()}</span>
          </div>

          {bookData.avg_rating > 0 && (
            <div className="comic-rating" onClick={toggleRating}>
              ⭐ {bookData.avg_rating.toFixed(1)}
              {userRating > 0 && (
                <span className="user-rating"> • You: {userRating}⭐</span>
              )}
            </div>
          )}
        </div>

        {/* Rating stars */}
        {showRating && (
          <div className="rating-stars" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star-btn ${star <= userRating ? "active" : ""}`}
                onClick={(e) => handleRatingClick(star, e)}
                aria-label={`Rate ${star} stars`}
              >
                ⭐
              </button>
            ))}
          </div>
        )}

        <div className="comic-category">🏷️ {bookData.category}</div>

        {/* Thêm thông tin bổ sung */}
        {bookData.publication_year && (
          <div className="comic-year">📅 {bookData.publication_year}</div>
        )}

        {/* Nút READ MORE */}
        <button
          className="comic-read-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onCardClick) {
              onCardClick(book.id);
            }
          }}
        >
          <span className="btn-icon">🔍</span>
          READ MORE
        </button>
      </div>

      {/* Hiệu ứng bong bóng comic */}
      <div className="comic-bubbles">
        <div className="bubble bubble-1">📖</div>
        <div className="bubble bubble-2">✨</div>
        <div className="bubble bubble-3">🌟</div>
      </div>
    </CardWrapper>
  );
};

// Styled Components - Thêm style cho năm xuất bản
const CardWrapper = styled.div`
  background: white;
  border-radius: 25px;
  padding: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 4px solid #2c3e50;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: translate(-4px, -4px);
    box-shadow: 12px 12px 0px rgba(0, 0, 0, 0.3);

    .comic-hover-effect {
      opacity: 1;
      transform: translateY(0);
    }

    .comic-cover-image {
      transform: scale(1.05) rotate(1deg);
    }
  }

  &.horizontal {
    min-width: 260px;
    flex-shrink: 0;
  }

  &.featured {
    .book-cover-comic {
      height: 280px;
    }
  }

  .comic-border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 3px solid #ff6b6b;
    border-radius: 22px;
    pointer-events: none;
    opacity: 0.3;
  }

  .book-cover-comic {
    position: relative;
    width: 100%;
    height: 220px;
    border-radius: 15px;
    overflow: hidden;
    margin-bottom: 1.2rem;
    border: 3px solid #2c3e50;
    background: linear-gradient(45deg, #ffeaa7, #a29bfe);

    .comic-cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.3s ease;
    }
  }

  .comic-action-btn {
    position: absolute;
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid #2c3e50;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 2;
    box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.2);

    &:hover {
      transform: scale(1.1);
    }

    &.delete-btn {
      top: 12px;
      left: 12px;

      &:hover {
        background: #e74c3c;
      }
    }

    .btn-icon {
      font-size: 1.2rem;
      transition: all 0.3s ease;
    }
  }

  .comic-tag {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff6b6b;
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    border: 2px solid white;
    box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.2);
    z-index: 2;

    &.hot {
      background: #e74c3c;
    }

    &.new {
      background: #4ecdc4;
    }
  }

  .comic-hover-effect {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(78, 205, 196, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    z-index: 1;

    .hover-text {
      color: white;
      font-weight: bold;
      font-size: 1.3rem;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
    }
  }

  .comic-book-info {
    .comic-book-title {
      font-size: 1.2rem;
      margin-bottom: 0.6rem;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.8em;
      color: #2c3e50;
      font-weight: bold;
      text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.1);
    }

    .comic-book-author {
      color: #7f8c8d;
      font-size: 1rem;
      margin-bottom: 0.8rem;
      font-weight: 500;
    }

    .comic-book-description {
      color: #636e72;
      font-size: 0.9rem;
      line-height: 1.4;
      margin-bottom: 1rem;
      font-style: italic;
    }

    .comic-book-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      font-size: 0.9rem;

      .comic-views {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #636e72;
        font-weight: bold;

        .eye-icon {
          font-size: 1.1rem;
        }
      }

      .comic-rating {
        color: #f39c12;
        font-weight: bold;
        background: #fef9e7;
        padding: 4px 8px;
        border-radius: 12px;
        border: 2px solid #fdcb6e;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          background: #fdcb6e;
          transform: scale(1.05);
        }

        .user-rating {
          color: #e74c3c;
          font-size: 0.8rem;
        }
      }
    }

    .rating-stars {
      display: flex;
      gap: 4px;
      margin-bottom: 1rem;
      justify-content: center;

      .star-btn {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 2px;

        &:hover {
          transform: scale(1.3);
        }

        &.active {
          filter: brightness(1.2);
        }
      }
    }

    .comic-category {
      background: #dfe6e9;
      color: #2d3436;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
      display: inline-block;
      border: 2px solid #b2bec3;
    }

    .comic-year {
      background: #a29bfe;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: bold;
      margin-bottom: 1rem;
      display: inline-block;
      border: 2px solid #6c5ce7;
    }

    .comic-read-btn {
      width: 100%;
      background: linear-gradient(45deg, #4ecdc4, #44a08d);
      border: 3px solid #2c3e50;
      color: white;
      padding: 0.8rem;
      border-radius: 15px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.3s ease;
      box-shadow: 4px 4px 0px #2c3e50;
      text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.3);

      &:hover {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0px #2c3e50;
        background: linear-gradient(45deg, #44a08d, #4ecdc4);
      }

      .btn-icon {
        font-size: 1.2rem;
      }
    }
  }

  .comic-bubbles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;

    .bubble {
      position: absolute;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      animation: float 3s ease-in-out infinite;
      font-size: 1rem;

      &.bubble-1 {
        top: 10%;
        right: 10%;
        animation-delay: 0s;
      }

      &.bubble-2 {
        bottom: 20%;
        left: 10%;
        animation-delay: 1.5s;
      }

      &.bubble-3 {
        top: 50%;
        right: 20%;
        animation-delay: 2.5s;
      }
    }

    @keyframes float {
      0%,
      100% {
        transform: translateY(0) rotate(0deg);
      }
      50% {
        transform: translateY(-10px) rotate(180deg);
      }
    }
  }
`;

export default BookCard;
