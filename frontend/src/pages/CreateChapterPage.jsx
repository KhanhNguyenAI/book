// src/pages/CreateChapterPage.jsx
import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled from "styled-components";
import { UseAuth } from "../context/AuthContext";
import { bookService } from "../services/book";

const CreateChapterPage = () => {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const location = useLocation();
  const { user } = UseAuth();

  const bookTitle = location.state?.bookTitle || "Unknown Book";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    chapter_number: "",
    summary: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please login to add chapters");
      return;
    }

    if (user.role !== "admin") {
      alert("Only admins can add chapters");
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Title and Content are required");
      return;
    }

    if (!formData.chapter_number) {
      alert("Chapter number is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const chapterData = {
        title: formData.title,
        content: formData.content,
        chapter_number: parseInt(formData.chapter_number),
        summary: formData.summary,
      };

      console.log("📤 Creating chapter:", chapterData);

      const result = await bookService.createChapter(bookId, chapterData);

      if (result.status === "success") {
        alert("Chapter added successfully!");
        navigate(`/books/${bookId}`);
      } else {
        throw new Error(result.error || "Failed to add chapter");
      }
    } catch (error) {
      console.error("Error adding chapter:", error);
      alert(error.message || "Failed to add chapter. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel? All changes will be lost."
      )
    ) {
      navigate(`/books/${bookId}`);
    }
  };

  return (
    <StyledWrapper>
      <div className="background-gradient"></div>
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="create-chapter-container">
        <div className="header-section">
          <button className="back-button" onClick={handleCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 12H5M12 19l-7-7 7-7"
              />
            </svg>
            Back to Book
          </button>
          <h1 className="page-title">
            <span className="title-gradient">Create New Chapter</span>
          </h1>
          <p className="page-subtitle">
            For book: <strong>"{bookTitle}"</strong> 📖
          </p>
        </div>

        <form onSubmit={handleSubmit} className="create-chapter-form">
          <div className="form-grid">
            <div className="form-section details-section">
              <div className="section-group">
                <label className="section-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Chapter Information
                </label>

                <div className="input-row">
                  <div className="input-group">
                    <label htmlFor="chapter_number">
                      Chapter Number <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="chapter_number"
                      name="chapter_number"
                      value={formData.chapter_number}
                      onChange={handleInputChange}
                      placeholder="1"
                      min="1"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="title">
                      Chapter Title <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter chapter title"
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="summary">Chapter Summary</label>
                  <textarea
                    id="summary"
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    placeholder="Brief summary of this chapter..."
                    rows="3"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="content">
                    Chapter Content <span className="required">*</span>
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Write the chapter content here..."
                    rows="12"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner"></div>
                  Creating Chapter...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Chapter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  min-height: 100vh;
  position: relative;
  padding: 2rem;
  overflow: hidden;
  width: 100vw;

  .background-gradient {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    z-index: -2;
  }

  .floating-shapes {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
    overflow: hidden;
  }

  .shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.15;
    animation: float 20s ease-in-out infinite;
  }

  .shape-1 {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    top: -200px;
    left: -200px;
    animation-delay: 0s;
  }

  .shape-2 {
    width: 500px;
    height: 500px;
    background: linear-gradient(135deg, #fec195, #fcc196);
    bottom: -250px;
    right: -250px;
    animation-delay: 7s;
  }

  .shape-3 {
    width: 350px;
    height: 350px;
    background: linear-gradient(135deg, #764ba2, #fec195);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 14s;
  }

  @keyframes float {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(50px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-30px, 30px) scale(0.9);
    }
  }

  .create-chapter-container {
    max-width: 90vw;
    margin: auto 10vw;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 30px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3),
      0 0 1px rgba(255, 255, 255, 0.3) inset, 0 0 100px rgba(254, 193, 149, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    animation: slideUp 0.6s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .header-section {
    background: linear-gradient(
      135deg,
      rgba(254, 193, 149, 0.3),
      rgba(102, 126, 234, 0.3)
    );
    backdrop-filter: blur(10px);
    padding: 2.5rem;
    position: relative;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(
        90deg,
        transparent,
        #fec195,
        #667eea,
        #764ba2,
        transparent
      );
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.6rem 1.2rem;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
      font-weight: 500;

      svg {
        width: 18px;
        height: 18px;
        stroke-width: 2.5;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: #fec195;
        transform: translateX(-5px);
        box-shadow: 0 0 20px rgba(254, 193, 149, 0.3);
      }
    }

    .page-title {
      font-size: 3rem;
      font-weight: 800;
      margin: 0 0 0.5rem 0;
      color: white;

      .title-gradient {
        background: linear-gradient(135deg, #ffffff, #fec195);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .page-subtitle {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
      font-weight: 400;
    }
  }

  .create-chapter-form {
    padding: 2.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2.5rem;
    margin-bottom: 2rem;
  }

  .form-section {
    .section-label {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      font-weight: 700;
      color: white;
      margin-bottom: 1.2rem;
      font-size: 1.15rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      svg {
        width: 20px;
        height: 20px;
        stroke: #fec195;
        stroke-width: 2.5;
      }
    }
  }

  .details-section {
    .section-group {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .input-group {
      margin-bottom: 1.5rem;

      label {
        display: block;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 0.7rem;
        font-size: 0.95rem;

        .required {
          color: #fec195;
          margin-left: 0.2rem;
        }
      }

      input,
      textarea {
        width: 100%;
        padding: 0.9rem 1.2rem;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        font-size: 1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: white;
        font-family: inherit;

        &:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.12);
          border-color: #fec195;
          box-shadow: 0 0 0 3px rgba(254, 193, 149, 0.1),
            0 0 20px rgba(254, 193, 149, 0.2);
          transform: translateY(-2px);
        }

        &::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        &:hover:not(:focus) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
        }
      }

      textarea {
        resize: vertical;
        min-height: 120px;
        line-height: 1.6;
      }
    }

    .input-row {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.2rem;
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1.2rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 0.9rem 2rem;
      border: none;
      border-radius: 15px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 140px;
      position: relative;
      overflow: hidden;

      svg {
        width: 20px;
        height: 20px;
        stroke-width: 2.5;
      }

      &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at center,
          rgba(255, 255, 255, 0.3),
          transparent 70%
        );
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      &:hover:not(:disabled)::before {
        opacity: 1;
      }
    }

    .cancel-button {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.2);

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      }
    }

    .submit-button {
      background: linear-gradient(135deg, #fec195, #f3b182);
      color: #1a1a2e;
      font-weight: 700;
      box-shadow: 0 8px 25px rgba(254, 193, 149, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 12px 35px rgba(254, 193, 149, 0.4),
          0 0 40px rgba(254, 193, 149, 0.3);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
    }

    .loading-spinner {
      width: 18px;
      height: 18px;
      border: 3px solid transparent;
      border-top: 3px solid #1a1a2e;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    padding: 1rem;

    .create-chapter-container {
      margin: auto 5vw;
    }

    .header-section {
      padding: 2rem;

      .page-title {
        font-size: 2.2rem;
      }

      .page-subtitle {
        font-size: 1rem;
      }
    }

    .create-chapter-form {
      padding: 2rem;
    }

    .details-section {
      .input-row {
        grid-template-columns: 1fr;
      }
    }

    .form-actions {
      flex-direction: column-reverse;
      gap: 1rem;

      button {
        width: 100%;
      }
    }
  }
`;

export default CreateChapterPage;
