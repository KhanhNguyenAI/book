import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { UseAuth } from "../context/AuthContext";
import { bookService } from "../services/book";

const AddBookPage = () => {
  const navigate = useNavigate();
  const { user } = UseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Danh sách categories cố định - GIỮ NGUYÊN
  const categories = [
    { id: 1, name: "Fiction" },
    { id: 2, name: "Psychology" },
    { id: 3, name: "Science" },
    { id: 4, name: "Children's Books" },
    { id: 5, name: "Self-Help" },
    { id: 6, name: "Manga" },
    { id: 7, name: "Journalism" },
  ];

  // ĐỔI FORM DATA: category_id → category_name, author → authors
  const [formData, setFormData] = useState({
    title: "",
    authors: [""], // 👈 ĐỔI: từ "author" thành "authors" (mảng)
    description: "",
    category_name: "", // 👈 ĐỔI: từ "category_id" thành "category_name"
    isbn: "",
    publication_year: "",
    series_name: "",
    cover_image: "",
    pdf_path: "",
  });

  const [previewImage, setPreviewImage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Hiển thị preview nếu là cover image URL
    if (name === "cover_image" && value) {
      setPreviewImage(value);
    }
  };

  // THÊM: Xử lý thay đổi authors
  const handleAuthorChange = (index, value) => {
    const newAuthors = [...formData.authors];
    newAuthors[index] = value;
    setFormData(prev => ({
      ...prev,
      authors: newAuthors
    }));
  };

  // THÊM: Thêm author field mới
  const addAuthorField = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, ""]
    }));
  };

  // THÊM: Xóa author field
  const removeAuthorField = (index) => {
    if (formData.authors.length > 1) {
      const newAuthors = formData.authors.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        authors: newAuthors
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please login to add books");
      return;
    }

    if (user.role !== "admin") {
      alert("Only admins can add books");
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    if (!formData.category_name) {
      alert("Please select a category");
      return;
    }

    // Validation authors - lọc bỏ các author rỗng
    const validAuthors = formData.authors.filter(author => author.trim() !== "");
    if (validAuthors.length === 0) {
      alert("At least one author is required");
      return;
    }

    if (!formData.cover_image) {
      alert("Cover image URL is required");
      return;
    }

    if (!formData.pdf_path) {
      alert("PDF URL is required");
      return;
    }

    // URL validation
    try {
      new URL(formData.cover_image);
    } catch {
      alert("Please enter a valid cover image URL");
      return;
    }

    try {
      new URL(formData.pdf_path);
    } catch {
      alert("Please enter a valid PDF URL");
      return;
    }

    // Validate publication year if provided
    if (formData.publication_year) {
      const year = parseInt(formData.publication_year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1000 || year > currentYear + 1) {
        alert(`Publication year must be between 1000 and ${currentYear + 1}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      console.log("📤 Sending book data:", formData);

      // CHUẨN BỊ DỮ LIỆU THEO ĐÚNG FORMAT BACKEND MONG ĐỢI
      const bookData = {
        title: formData.title.trim(),
        authors: formData.authors.filter(author => author.trim() !== ""), // 👈 Mảng authors
        description: formData.description.trim() || undefined,
        category_name: formData.category_name, // 👈 category_name thay vì category_id
        isbn: formData.isbn.trim() || undefined,
        publication_year: formData.publication_year
          ? parseInt(formData.publication_year)
          : undefined,
        series_name: formData.series_name.trim() || undefined,
        cover_image: formData.cover_image.trim(),
        pdf_path: formData.pdf_path.trim(),
      };

      // Remove undefined fields
      Object.keys(bookData).forEach(
        (key) => bookData[key] === undefined && delete bookData[key]
      );

      console.log("📋 Final book data for API:", bookData);

      // GỬI API - bookService đã đúng
      const result = await bookService.createBook(bookData);

      if (result.status === "success") {
        alert("✅ Book added successfully!");
        navigate("/books");
      } else {
        throw new Error(result.message || "Failed to add book");
      }
    } catch (error) {
      console.error("❌ Error adding book:", error);

      // Enhanced error message
      let errorMessage = "Failed to add book. ";
      if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Please try again.";
      }

      alert(errorMessage);
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
      navigate(-1);
    }
  };

  // Hàm lấy Google Drive file ID từ URL
  const getDriveFileId = (url) => {
    try {
      if (url.includes("/uc?id=")) {
        return url.split("/uc?id=")[1].split("&")[0];
      } else if (url.includes("/file/d/")) {
        return url.split("/file/d/")[1].split("/")[0];
      } else if (url.includes("/open?id=")) {
        return url.split("/open?id=")[1].split("&")[0];
      }
      return null;
    } catch {
      return null;
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

      <div className="add-book-container">
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
            Back
          </button>
          <h1 className="page-title">
            <span className="title-gradient">Add New Book</span>
          </h1>
          <p className="page-subtitle">Share knowledge with the community ✨</p>
          <div className="google-drive-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Upload files to Google Drive first, then paste the shareable links here
          </div>
        </div>

        <form onSubmit={handleSubmit} className="add-book-form">
          <div className="form-grid">
            {/* Left Column - Cover URL Input */}
            <div className="form-section cover-section">
              <label className="section-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Book Cover URL
              </label>
              <div className="cover-url-area">
                <div className="url-input-group">
                  <label htmlFor="cover_image">
                    Image URL <span className="required">*</span>
                  </label>
                  <input
                    type="url"
                    id="cover_image"
                    name="cover_image"
                    value={formData.cover_image}
                    onChange={handleInputChange}
                    placeholder="https://drive.google.com/uc?id=FILE_ID"
                    required
                    className="url-input"
                  />
                  <div className="url-hint">
                    Format: https://drive.google.com/uc?id=FILE_ID
                  </div>
                </div>

                {/* Cover Preview */}
                <div className="cover-preview-container">
                  <label className="preview-label">Preview</label>
                  {previewImage ? (
                    <div className="cover-preview active">
                      <img src={previewImage} alt="Book cover preview" />
                      <div className="preview-overlay">
                        <span>Cover Preview</span>
                      </div>
                    </div>
                  ) : (
                    <div className="cover-preview placeholder">
                      <div className="preview-icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <span>Enter URL to see preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Book Details */}
            <div className="form-section details-section">
              {/* Basic Information */}
              <div className="section-group">
                <label className="section-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Basic Information
                </label>

                <div className="input-group">
                  <label htmlFor="title">
                    Book Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter book title"
                    required
                  />
                </div>

                {/* ĐỔI: Single author input thành multiple authors */}
                <div className="input-group">
                  <label htmlFor="authors">
                    Authors <span className="required">*</span>
                  </label>
                  {formData.authors.map((author, index) => (
                    <div key={index} className="author-input-row">
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => handleAuthorChange(index, e.target.value)}
                        placeholder={`Author ${index + 1} name`}
                        className="author-input"
                      />
                      {formData.authors.length > 1 && (
                        <button
                          type="button"
                          className="remove-author-btn"
                          onClick={() => removeAuthorField(index)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-author-btn"
                    onClick={addAuthorField}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Another Author
                  </button>
                </div>

                <div className="input-group">
                  <label htmlFor="category_name">
                    Category <span className="required">*</span>
                  </label>
                  <select
                    id="category_name"
                    name="category_name" // 👈 ĐỔI: category_id → category_name
                    value={formData.category_name}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}> {/* 👈 ĐỔI: value={cat.id} → value={cat.name} */}
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter book description..."
                    rows="4"
                  />
                </div>
              </div>

              {/* Additional Details */}
              <div className="section-group">
                <label className="section-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Additional Details
                </label>

                <div className="input-row">
                  <div className="input-group">
                    <label htmlFor="isbn">ISBN</label>
                    <input
                      type="text"
                      id="isbn"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleInputChange}
                      placeholder="978-0-123456-78-9"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="publication_year">Publication Year</label>
                    <input
                      type="number"
                      id="publication_year"
                      name="publication_year"
                      value={formData.publication_year}
                      onChange={handleInputChange}
                      placeholder="2024"
                      min="1000"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="series_name">
                    Series Name (if applicable)
                  </label>
                  <input
                    type="text"
                    id="series_name"
                    name="series_name"
                    value={formData.series_name}
                    onChange={handleInputChange}
                    placeholder="Enter series name"
                  />
                </div>
              </div>

              {/* PDF URL Input */}
              <div className="section-group">
                <label className="section-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  PDF File URL <span className="required">*</span>
                </label>
                <div className="pdf-url-area">
                  <div className="url-input-group">
                    <label htmlFor="pdf_path">
                      PDF URL <span className="required">*</span>
                    </label>
                    <input
                      type="url"
                      id="pdf_path"
                      name="pdf_path"
                      value={formData.pdf_path}
                      onChange={handleInputChange}
                      placeholder="https://drive.google.com/file/d/FILE_ID/view"
                      required
                      className="url-input"
                    />
                    <div className="url-hint">
                      Format: https://drive.google.com/file/d/FILE_ID/view
                    </div>
                  </div>

                  {/* PDF Info */}
                  <div className="pdf-info-container">
                    {formData.pdf_path ? (
                      <div className="pdf-info active">
                        <div className="pdf-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                            />
                            <polyline
                              points="14 2 14 8 20 8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 13H8M16 17H8M10 9H8"
                            />
                          </svg>
                        </div>
                        <div className="pdf-details">
                          <span className="pdf-title">PDF File Ready</span>
                          <span className="pdf-subtitle">
                            File ID:{" "}
                            {getDriveFileId(formData.pdf_path) || "Valid URL"}
                          </span>
                        </div>
                        <div className="pdf-check">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="pdf-info placeholder">
                        <div className="pdf-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                            />
                            <polyline
                              points="14 2 14 8 20 8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                        <div className="pdf-details">
                          <span className="pdf-title">Enter PDF URL</span>
                          <span className="pdf-subtitle">
                            Paste Google Drive shareable link
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
                  Adding Book...
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
                  Add Book
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
 .author-input-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .author-input {
    flex: 1;
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
      border-color: #00ff41;
      box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.1),
        0 0 20px rgba(0, 255, 65, 0.2);
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .remove-author-btn {
    background: rgba(255, 0, 0, 0.2);
    border: 1px solid rgba(255, 0, 0, 0.3);
    color: #ff6b6b;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 0, 0, 0.3);
      transform: scale(1.05);
    }

    svg {
      width: 16px;
      height: 16px;
      stroke-width: 2.5;
    }
  }

  .add-author-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 255, 65, 0.1);
    border: 1px solid rgba(0, 255, 65, 0.3);
    color: #00ff41;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(0, 255, 65, 0.2);
      transform: translateY(-2px);
    }

    svg {
      width: 16px;
      height: 16px;
      stroke-width: 2.5;
    }
  }
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
    background: linear-gradient(135deg, #00ff41, #667eea);
    bottom: -250px;
    right: -250px;
    animation-delay: 7s;
  }

  .shape-3 {
    width: 350px;
    height: 350px;
    background: linear-gradient(135deg, #764ba2, #00ff41);
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

  .add-book-container {
    max-width: 90vw;
    margin: auto 10vw;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px) saturate(180%);
    border-radius: 30px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3),
      0 0 1px rgba(255, 255, 255, 0.3) inset, 0 0 100px rgba(102, 126, 234, 0.1);
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
      rgba(102, 126, 234, 0.3),
      rgba(118, 75, 162, 0.3)
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
        #00ff41,
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
        border-color: #00ff41;
        transform: translateX(-5px);
        box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
      }
    }

    .page-title {
      font-size: 3rem;
      font-weight: 800;
      margin: 0 0 0.5rem 0;
      color: white;

      .title-gradient {
        background: linear-gradient(135deg, #ffffff, #00ff41);
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

    .google-drive-notice {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      background: rgba(0, 255, 65, 0.1);
      border: 1px solid rgba(0, 255, 65, 0.3);
      color: #00ff41;
      padding: 0.8rem 1.2rem;
      border-radius: 12px;
      margin-top: 1rem;
      font-size: 0.9rem;
      font-weight: 500;

      svg {
        width: 18px;
        height: 18px;
        stroke-width: 2.5;
        flex-shrink: 0;
      }
    }
  }

  .add-book-form {
    padding: 2.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 350px 1fr;
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
        stroke: #00ff41;
        stroke-width: 2.5;
      }
    }
  }

  .cover-section {
    .cover-url-area {
      .url-input-group {
        margin-bottom: 1.5rem;

        label {
          display: block;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 0.7rem;
          font-size: 0.95rem;

          .required {
            color: #00ff41;
            margin-left: 0.2rem;
          }
        }

        .url-input {
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
            border-color: #00ff41;
            box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.1),
              0 0 20px rgba(0, 255, 65, 0.2);
            transform: translateY(-2px);
          }

          &::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }
        }

        .url-hint {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 0.5rem;
          font-style: italic;
        }
      }
    }

    .cover-preview-container {
      .preview-label {
        display: block;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 0.7rem;
        font-size: 0.95rem;
      }

      .cover-preview {
        border-radius: 15px;
        overflow: hidden;
        height: 300px;
        position: relative;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;

        &.active {
          border-color: #00ff41;
          box-shadow: 0 10px 40px rgba(0, 255, 65, 0.2);

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .preview-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
            color: white;
            padding: 1rem;
            text-align: center;
            font-weight: 600;
          }
        }

        &.placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.5);

          .preview-icon {
            width: 60px;
            height: 60px;
            margin-bottom: 1rem;
            opacity: 0.5;

            svg {
              width: 100%;
              height: 100%;
              stroke-width: 1.5;
            }
          }

          span {
            font-size: 0.9rem;
          }
        }
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

    .input-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .input-group {
      margin-bottom: 1.5rem;

      &:last-child {
        margin-bottom: 0;
      }

      label {
        display: block;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 0.7rem;
        font-size: 0.95rem;

        .required {
          color: #00ff41;
          margin-left: 0.2rem;
        }
      }

      input,
      select,
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
          border-color: #00ff41;
          box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.1),
            0 0 20px rgba(0, 255, 65, 0.2);
          transform: translateY(-2px);
        }

        &::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
      }

      select {
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2300ff41' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 1rem center;
        background-size: 20px;
        padding-right: 3rem;
        appearance: none;

        option {
          background: #1a1a2e;
          color: white;
          padding: 0.5rem;
        }
      }

      textarea {
        resize: vertical;
        min-height: 120px;
        line-height: 1.6;
      }

      input[type="number"] {
        -moz-appearance: textfield;

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }
    }
  }

  .pdf-url-area {
    .url-input-group {
      margin-bottom: 1.5rem;

      label {
        display: block;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 0.7rem;
        font-size: 0.95rem;

        .required {
          color: #00ff41;
          margin-left: 0.2rem;
        }
      }

      .url-input {
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
          border-color: #00ff41;
          box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.1),
            0 0 20px rgba(0, 255, 65, 0.2);
          transform: translateY(-2px);
        }

        &::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
      }

      .url-hint {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 0.5rem;
        font-style: italic;
      }
    }

    .pdf-info-container {
      .pdf-info {
        display: flex;
        align-items: center;
        gap: 1.2rem;
        padding: 1.2rem;
        border-radius: 15px;
        transition: all 0.3s ease;

        &.active {
          background: rgba(0, 255, 65, 0.1);
          border: 1px solid rgba(0, 255, 65, 0.3);

          .pdf-icon {
            background: linear-gradient(135deg, #00ff41, #00cc33);
          }

          .pdf-check {
            opacity: 1;
            transform: scale(1);
          }
        }

        &.placeholder {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          opacity: 0.7;
        }

        .pdf-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          transition: all 0.3s ease;

          svg {
            width: 24px;
            height: 24px;
            stroke-width: 2;
          }
        }

        .pdf-details {
          flex: 1;

          .pdf-title {
            display: block;
            font-weight: 600;
            color: white;
            margin-bottom: 0.3rem;
            font-size: 1rem;
          }

          .pdf-subtitle {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.6);
            word-break: break-all;
          }
        }

        .pdf-check {
          width: 35px;
          height: 35px;
          background: linear-gradient(135deg, #00ff41, #00cc33);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0);
          transition: all 0.3s ease;

          svg {
            width: 18px;
            height: 18px;
            stroke: white;
            stroke-width: 3;
          }
        }
      }
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
      background: linear-gradient(135deg, #00ff41, #00cc33);
      color: #1a1a2e;
      font-weight: 700;
      box-shadow: 0 8px 25px rgba(0, 255, 65, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 12px 35px rgba(0, 255, 65, 0.4),
          0 0 40px rgba(0, 255, 65, 0.3);
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
  @media (max-width: 1024px) {
    padding: 1.5rem;

    .add-book-container {
      border-radius: 25px;
    }

    .form-grid {
      grid-template-columns: 300px 1fr;
      gap: 2rem;
    }

    .cover-section {
      .cover-preview {
        height: 250px;
      }
    }
  }

  @media (max-width: 768px) {
    padding: 1rem;

    .add-book-container {
      border-radius: 20px;
      margin: 0 2rem;
      max-width: 95vw;
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

    .add-book-form {
      padding: 2rem;
    }

    .form-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .cover-section {
      .cover-preview {
        height: 200px;
      }
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

  @media (max-width: 480px) {
    padding: 0.5rem;

    .add-book-container {
      border-radius: 15px;
      margin: 0 1rem;
    }

    .header-section {
      padding: 1.5rem;

      .page-title {
        font-size: 1.8rem;
      }

      .page-subtitle {
        font-size: 0.9rem;
      }

      .google-drive-notice {
        font-size: 0.8rem;
        padding: 0.6rem 1rem;
      }
    }

    .add-book-form {
      padding: 1.5rem;
    }

    .cover-section {
      .cover-preview {
        height: 180px;
      }
    }

    .details-section {
      .section-group {
        padding: 1rem;
      }

      .input-group {
        margin-bottom: 1rem;
      }
    }
  }
`;
export default AddBookPage;
