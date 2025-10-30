import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { bookService } from "../../services/book";

const Search = ({ className, placeholder = "Dive into knowledge..." }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Debounce search
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsLoading(true);
      try {
        // Search cả book và authors
        navigate(`/books?search=${encodeURIComponent(searchTerm)}`);
        setShowSuggestions(false);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim().length > 1) {
      setSuggestions([
        { id: "loading", title: "Rippling through pages...", is_loading: true },
      ]);
      setShowSuggestions(true);
      debounceSearch(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Trong Search component
const debounceSearch = debounce(async (query) => {
  try {
    console.log(`🔍 Searching for: "${query}"`);
    
    // Call API suggestions endpoint
    const response = await bookService.getSearchSuggestions(query, 8);
    
    console.log('📦 API Response:', response);
    
    const suggestions = response.suggestions || [];
    
    // ============================================
    // FIX: Format rating correctly for React
    // ============================================
    const formattedSuggestions = suggestions.map(book => ({
      id: book.id,
      title: book.title,
      authors: book.authors || [],
      cover_image: book.cover_image,
      // FIX: Ensure rating is a simple number, not an object
      rating: typeof book.rating === 'number' 
        ? book.rating 
        : (book.rating?.average || 0),
      categories: book.categories || []
    }));
    
    setSuggestions(formattedSuggestions);
    
    console.log(`✅ Found ${formattedSuggestions.length} suggestions`);
    
  } catch (error) {
    console.error("❌ Search suggestions error:", error);
    setSuggestions([]);
  }
}, 400);
  const handleSuggestionClick = (book) => {
    if (book.id && !book.is_loading) {
      setSearchTerm(book.title);
      if (book.id) {
        navigate(`/books/${book.id}`);
      } else {
        navigate(`/books?search=${encodeURIComponent(book.title)}`);
      }
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch(e);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchTerm.length > 1 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Helper function để format author names
  const formatAuthors = (authors) => {
    if (!authors || !Array.isArray(authors)) return "Unknown Author";
    return authors.map(author => author.name || author).join(", ");
  };

  // Helper function để format categories
  const formatCategories = (categories) => {
    if (!categories || !Array.isArray(categories)) return "";
    return categories.slice(0, 2).map(cat => cat.name || cat).join(" • ");
  };

  return (
    <LakeWrapper ref={searchRef} className={className}>
      <div className={`lake-container ${isFocused ? "focused" : ""}`}>
        {/* Water Surface Effect */}
        <div className="water-surface"></div>
        <div className="water-reflection"></div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="input-wrapper">
            {/* Search Icon - Water Lily */}
            <div className="search-icon">
              <div className="water-lily">
                <div className="lily-pad"></div>
                <svg className="lily-icon" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="m20 20-4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>

            {/* Search Input */}
            <input
              className="lake-input"
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={isLoading}
            />

            {/* Clear Button - Water Ripple */}
            {searchTerm && (
              <button
                type="button"
                className="clear-btn"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <div className="ripple-effect">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="rgba(255,255,255,0.1)"
                    />
                    <path
                      d="m15 9-6 6m0-6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </button>
            )}

            {/* Loading Spinner - Water Vortex */}
            {isLoading && (
              <div className="loading-vortex">
                <div className="vortex"></div>
                <div className="water-drops">
                  <div className="drop"></div>
                  <div className="drop"></div>
                  <div className="drop"></div>
                </div>
              </div>
            )}

            {/* Search Button - Water Ripple */}
            <button
              type="submit"
              className="search-btn"
              disabled={isLoading || !searchTerm.trim()}
              aria-label="Search"
            >
              <div className="ripple-circle">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14m-7-7 7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          </div>
        </form>

        {/* Underwater Light Effect */}
        <div className="underwater-light"></div>

        {/* Search Suggestions - Water Bubbles */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-bubbles">
            <div className="bubble-header">
              <span className="bubble-title">
                🌊 Currents of Knowledge
                {suggestions[0].is_loading ? "" : ` - "${searchTerm}"`}
              </span>
              <span className="bubble-count">
                {suggestions[0].is_loading 
                  ? "Searching..." 
                  : `${suggestions.length} treasures found`
                }
              </span>
            </div>

            <div className="bubbles-container">
              {suggestions.map((book, index) => (
                <div
                  key={book.id || `suggestion-${index}`}
                  className={`bubble-item ${
                    book.is_loading ? "loading" : ""
                  } bubble-${index % 3}`}
                  onClick={() => handleSuggestionClick(book)}
                >
                  {book.is_loading ? (
                    <div className="bubble-loading">
                      <div className="bubble-pulse"></div>
                      <span>Diving deeper...</span>
                    </div>
                  ) : (
                    <>
                      <div className="bubble-cover">
                        {book.cover_image || book.image ? (
                          <img 
                            src={book.cover_image || book.image} 
                            alt={book.title} 
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="bubble-placeholder">
                          {book.categories && book.categories.length > 0 
                            ? "📚" 
                            : "📖"
                          }
                        </div>
                        <div className="bubble-shine"></div>
                      </div>
                      <div className="bubble-content">
                        <div className="bubble-title">{book.title}</div>
                        <div className="bubble-author">
                          by {formatAuthors(book.authors)}
                        </div>
                        {book.categories && book.categories.length > 0 && (
                          <div className="bubble-category">
                            {formatCategories(book.categories)}
                          </div>
                        )}
                        {book.rating && (
                          <div className="bubble-rating">
                            ⭐ {book.rating.average || book.rating} 
                            {book.rating.count && ` (${book.rating.count})`}
                          </div>
                        )}
                      </div>
                      <div className="bubble-arrow">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="m9 18 6-6-6-6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {suggestions.length > 0 && !suggestions[0].is_loading && (
              <div className="bubble-footer">
                <button className="dive-deeper-btn" onClick={handleSearch}>
                  🌊 Dive deeper into "{searchTerm}"
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bubbles Background */}
      <div className="floating-bubbles">
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
      </div>
    </LakeWrapper>
  );
};

// Animations
const waterRipple = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  33% {
    transform: translateY(-10px) rotate(120deg);
  }
  66% {
    transform: translateY(-5px) rotate(240deg);
  }
`;

const bubbleFloat = keyframes`
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100px) translateX(20px);
    opacity: 0;
  }
`;

const vortexSpin = keyframes`
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.1);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
`;

const waterShimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const LakeWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 650px;
  margin: 0 auto;
  z-index : 100;
  .bubble-rating {
    color: rgba(255, 255, 255, 0.8);
    font-size: 11px;
    font-weight: 500;
    margin-top: 2px;
  }

  .bubble-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.1)
    );
  }
  .lake-container {
    position: relative;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);

    &.focused {
      transform: translateY(-2px);
    }
  }

  /* Water Surface Effects */
  .water-surface {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(173, 216, 230, 0.3) 0%,
      rgba(176, 224, 230, 0.2) 25%,
      rgba(135, 206, 235, 0.25) 50%,
      rgba(173, 216, 230, 0.3) 75%,
      rgba(176, 224, 230, 0.2) 100%
    );
    border-radius: 20px;
    animation: ${waterShimmer} 8s infinite linear;
    z-index: -1;
  }

  .water-reflection {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 70%
    );
    border-radius: 20px;
    opacity: 0.6;
    z-index: -1;
  }

  .search-form {
    width: 100%;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(50px);
    -webkit-backdrop-filter: blur(50px);
    border: 1.5px solid rgba(255, 255, 255, 0.4);
    border-radius: 20px;
    padding: 12px 16px;
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 20px rgba(135, 206, 235, 0.3);
    transition: all 0.4s ease;
    overflow: hidden;
    z-index: 2;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: left 0.6s ease;
    }

    &:hover::before {
      left: 100%;
    }

    &:hover,
    &.focused {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.6);
      box-shadow: 0 12px 40px rgba(31, 38, 135, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        0 0 30px rgba(135, 206, 235, 0.5);
    }
  }

  /* Water Lily Search Icon */
  .search-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px 0 8px;
  }

  .water-lily {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lily-pad {
    width: 32px;
    height: 32px;
    background: rgba(144, 238, 144, 0.3);
    border-radius: 50%;
    animation: ${float} 6s ease-in-out infinite;
  }

  .lily-icon {
    position: absolute;
    width: 20px;
    height: 20px;
    color: rgba(255, 255, 255, 0.9);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .lake-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: rgba(255, 255, 255, 0.95);
    font-size: 17px;
    font-weight: 500;
    padding: 8px 12px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

    &::placeholder {
      color: rgba(255, 255, 255, 0.7);
      font-weight: 400;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  /* Button Styles with Water Effects */
  .clear-btn,
  .search-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    padding: 10px;
    border-radius: 12px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.05);

      .ripple-effect::before {
        animation: ${waterRipple} 1s ease-out;
      }
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    svg {
      width: 18px;
      height: 18px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }
  }

  .ripple-effect,
  .ripple-circle {
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      transition: transform 0.3s ease;
    }
  }

  /* Loading Vortex */
  .loading-vortex {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    position: relative;
  }

  .vortex {
    width: 24px;
    height: 24px;
    border: 2px solid transparent;
    border-top: 2px solid rgba(135, 206, 235, 0.8);
    border-bottom: 2px solid rgba(135, 206, 235, 0.8);
    border-radius: 50%;
    animation: ${vortexSpin} 1.5s linear infinite;
  }

  .water-drops {
    position: absolute;
    .drop {
      position: absolute;
      width: 4px;
      height: 4px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      animation: ${bubbleFloat} 2s infinite;

      &:nth-child(1) {
        top: -5px;
        left: 5px;
        animation-delay: 0s;
      }
      &:nth-child(2) {
        top: -8px;
        left: 12px;
        animation-delay: 0.3s;
      }
      &:nth-child(3) {
        top: -5px;
        left: 19px;
        animation-delay: 0.6s;
      }
    }
  }

  /* Underwater Light */
  .underwater-light {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 20px;
    background: radial-gradient(
      ellipse at center,
      rgba(135, 206, 235, 0.4) 0%,
      transparent 70%
    );
    filter: blur(10px);
    z-index: 1;
  }

  /* Suggestions Bubbles */
  .suggestions-bubbles {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    margin-top: 12px;
    padding: 0;
    z-index: 3;
    box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    animation: ${fadeInUp} 0.4s ease;
    overflow: hidden;
  }

  .bubble-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

    .bubble-count {
      background: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: 500;
    }
  }

  .bubbles-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 8px;
    z-index : 1001;
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }
  }

  .bubble-item {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    margin: 8px 0;
    cursor: pointer;
    border-radius: 16px;
    transition: all 0.3s ease;
    gap: 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: ${fadeInUp} 0.5s ease;

    &.bubble-0 {
      background: rgba(135, 206, 235, 0.15);
    }
    &.bubble-1 {
      background: rgba(173, 216, 230, 0.15);
    }
    &.bubble-2 {
      background: rgba(176, 224, 230, 0.15);
    }

    &:hover:not(.loading) {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px) scale(1.02);
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 8px 25px rgba(31, 38, 135, 0.2);
    }

    &.loading {
      cursor: default;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .bubble-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;

    .bubble-pulse {
      width: 20px;
      height: 20px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      animation: ${waterRipple} 1.5s ease-in-out infinite;
    }
  }

  .bubble-cover {
    flex-shrink: 0;
    width: 45px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.1)
    );
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .bubble-shine {
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    transition: left 0.5s ease;
  }

  .bubble-item:hover .bubble-shine {
    left: 100%;
  }

  .bubble-content {
    flex: 1;
    min-width: 0;
  }

  .bubble-title {
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .bubble-author {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    margin-bottom: 4px;
  }

  .bubble-category {
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    font-weight: 500;
  }

  .bubble-arrow {
    color: rgba(255, 255, 255, 0.7);
    opacity: 0;
    transition: all 0.3s ease;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  .bubble-item:hover .bubble-arrow {
    opacity: 1;
    transform: translateX(3px);
  }

  .bubble-footer {
    padding: 20px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
  }

  .dive-deeper-btn {
    background: linear-gradient(
      135deg,
      rgba(135, 206, 235, 0.3),
      rgba(173, 216, 230, 0.3)
    );
    color: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 14px 28px;
    border-radius: 16px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    backdrop-filter: blur(10px);

    &:hover {
      background: linear-gradient(
        135deg,
        rgba(135, 206, 235, 0.5),
        rgba(173, 216, 230, 0.5)
      );
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(31, 38, 135, 0.3);
    }
  }

  /* Floating Bubbles */
  .floating-bubbles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: -1;

    .bubble {
      position: absolute;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      animation: ${bubbleFloat} 6s infinite ease-in-out;

      &:nth-child(1) {
        width: 8px;
        height: 8px;
        left: 10%;
        animation-delay: 0s;
      }
      &:nth-child(2) {
        width: 12px;
        height: 12px;
        left: 30%;
        animation-delay: 1s;
      }
      &:nth-child(3) {
        width: 6px;
        height: 6px;
        left: 50%;
        animation-delay: 2s;
      }
      &:nth-child(4) {
        width: 10px;
        height: 10px;
        left: 70%;
        animation-delay: 3s;
      }
      &:nth-child(5) {
        width: 14px;
        height: 14px;
        left: 90%;
        animation-delay: 4s;
      }
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    max-width: 100%;
    padding: 0 16px;

    .input-wrapper {
      border-radius: 18px;
      padding: 10px 14px;
    }

    .lake-input {
      font-size: 16px;
      padding: 6px 10px;
    }

    .suggestions-bubbles {
      border-radius: 18px;
      margin: 8px 0;
    }

    .bubble-item {
      padding: 14px 16px;
      margin: 6px 0;
    }

    .bubble-cover {
      width: 40px;
      height: 55px;
    }
  }

  @media (max-width: 480px) {
    .input-wrapper {
      border-radius: 16px;
      padding: 8px 12px;
    }

    .lake-input {
      font-size: 16px;
    }

    .bubble-header {
      padding: 16px 20px 12px;
      font-size: 13px;
    }

    .bubble-item {
      padding: 12px 16px;
    }

    .bubble-title {
      font-size: 14px;
    }
  }
`;

export default Search;
