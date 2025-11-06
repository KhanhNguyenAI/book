// src/services/book.js
import api from "./axios";

export const bookService = {
  // ============================================
  // BOOK LISTING & SEARCH
  // ============================================

  // Lấy tất cả sách - FIXED (đã hỗ trợ search)
  getBooks: async (params = {}) => {
    const response = await api.get("/books", { params });
    return response.data;
  },

  // Search books với query - FUNCTION MỚI
  searchBooks: async (query, params = {}) => {
    const response = await api.get("/books", { 
      params: { search: query, ...params } 
    });
    return response.data;
  },

  // Advanced search - FUNCTION MỚI
  advancedSearch: async (searchParams = {}) => {
    const response = await api.get("/books/search", { params: searchParams });
    return response.data;
  },

  // Lấy sách nổi bật - FIXED
  getPopularBooks: async () => {
    const response = await api.get("/books/popular");
    return response.data;
  },

  // Lấy chi tiết sách
  getBook: async (bookId) => {
    const response = await api.get(`/books/${bookId}`);
    return response.data;
  },

  // ============================================
  // FAVORITES MANAGEMENT
  // ============================================

  addFavorite: async (bookId) => {
    const response = await api.post(`/books/${bookId}/favorite`);
    return response.data;
  },

  removeFavorite: async (bookId) => {
    const response = await api.delete(`/books/${bookId}/favorite`);
    return response.data;
  },

  getFavoriteStatus: async (bookId) => {
    const response = await api.get(`/books/${bookId}/favorite/status`);
    return response.data;
  },

  // Lấy tất cả favorites của user
  getMyFavorites: async (params = {}) => {
    const response = await api.get("/books/favorites", { params });
    return response.data;
  },

  // ============================================
  // BOOKMARKS
  // ============================================

  addBookmark: async (bookId, data) => {
    const response = await api.post(`/books/${bookId}/bookmark`, data);
    return response.data;
  },

  getBookmarks: async (params = {}) => {
    const response = await api.get("/books/bookmarks", { params });
    return response.data;
  },

  deleteBookmark: async (bookmarkId) => {
    const response = await api.delete(`/books/bookmarks/${bookmarkId}`);
    return response.data;
  },

  deleteBookmarkByBookId: async (bookId) => {
    const response = await api.delete(`/books/${bookId}/bookmark`);
    return response.data;
  },

  // ============================================
  // RATINGS & COMMENTS
  // ============================================

  rateBook: async (bookId, data) => {
    const response = await api.post(`/books/${bookId}/ratings`, data);
    return response.data;
  },

  getBookRatings: async (bookId, params = {}) => {
    const response = await api.get(`/books/${bookId}/ratings`, { params });
    return response.data;
  },

  getBookComments: async (bookId, params = {}) => {
    const response = await api.get(`/books/${bookId}/comments`, { params });
    return response.data;
  },

  addComment: async (bookId, data) => {
    const response = await api.post(`/books/${bookId}/comments`, data);
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await api.delete(`/books/comments/${commentId}`);
    return response.data;
  },

  // ============================================
  // CATEGORIES & FILTERS
  // ============================================

  getCategories: async () => {
    const response = await api.get("/books/categories");
    return response.data;
  },

  getAuthors: async () => {
    const response = await api.get("/books/authors");
    return response.data;
  },

  getPopularByCategory: async (categoryId, params = {}) => {
    const response = await api.get(`/books/categories/${categoryId}/popular`, { params });
    return response.data;
  },

  getFavoriteBooks: async (params = {}) => {
    const response = await api.get("/books/favorite-books", { params });
    return response.data;
  },

  // ============================================
  // BOOK READING & HISTORY
  // ============================================

  readBook: async (bookId, params = {}) => {
    const response = await api.get(`/books/${bookId}/read`, { params });
    return response.data;
  },

  updateReadingHistory: async (bookId, pageNumber) => {
    const response = await api.post(`/books/${bookId}/page/${pageNumber}`);
    return response.data;
  },

  // ============================================
  // CHAPTER MANAGEMENT
  // ============================================

  getBookChapters: async (bookId, params = {}) => {
    const response = await api.get(`/books/${bookId}/chapters`, { params });
    return response.data;
  },

  getChapter: async (bookId, chapterId) => {
    const response = await api.get(`/books/${bookId}/chapters/${chapterId}`);
    return response.data;
  },

  // ============================================
  // ADMIN BOOK MANAGEMENT
  // ============================================

  createBook: async (bookData) => {
    const response = await api.post("/books", bookData);
    return response.data;
  },

  updateBook: async (bookId, bookData) => {
    const response = await api.put(`/books/${bookId}`, bookData);
    return response.data;
  },

  deleteBook: async (bookId) => {
    const response = await api.delete(`/books/${bookId}`);
    return response.data;
  },

  createChapter: async (bookId, chapterData) => {
    const response = await api.post(`/books/${bookId}/chapters`, chapterData);
    return response.data;
  },

  // ============================================
  // SEARCH UTILITIES - FUNCTION MỚI
  // ============================================

  /**
   * Get search suggestions for autocomplete (FAST)
   * @param {string} query - Search query (min 2 chars)
   * @param {number} limit - Max results (default: 8)
   * @returns {Promise} - { suggestions: [...], count, query }
   */
  getSearchSuggestions: async (query, limit = 8) => {
    if (!query || query.length < 2) {
      return { suggestions: [], count: 0, query: '' };
    }
    
    try {
      // Sử dụng endpoint suggestions mới (nhanh hơn)
      const response = await api.get("/books/suggestions", { 
        params: { q: query, limit } 
      });
      return response.data;
    } catch (error) {
      console.error("Search suggestions error:", error);
      return { suggestions: [], count: 0, query };
    }
  },

  /**
   * Search books (full results with pagination)
   * @param {string} query - Search term
   * @param {Object} params - { page, per_page, category_id }
   * @returns {Promise} - { books: [...], pagination, search_info }
   */
  searchBooks: async (query, params = {}) => {
    try {
      const response = await api.get("/books", { 
        params: { search: query, ...params } 
      });
      return response.data;
    } catch (error) {
      console.error("Search books error:", error);
      throw error;
    }
  },

  /**
   * Advanced search with multiple filters
   * @param {Object} options - { query, author, categoryId, yearFrom, yearTo, minRating, page, perPage }
   * @returns {Promise}
   */
  advancedSearch: async (options = {}) => {
    const { 
      query, 
      author, 
      categoryId, 
      yearFrom, 
      yearTo, 
      minRating, 
      page, 
      perPage 
    } = options;
    
    const params = {
      ...(query && { q: query }),
      ...(author && { author }),
      ...(categoryId && { category_id: categoryId }),
      ...(yearFrom && { year_from: yearFrom }),
      ...(yearTo && { year_to: yearTo }),
      ...(minRating && { min_rating: minRating }),
      ...(page && { page }),
      ...(perPage && { per_page: perPage })
    };
    
    try {
      const response = await api.get("/books/search", { params });
      return response.data;
    } catch (error) {
      console.error("Advanced search error:", error);
      throw error;
    }
  },

  /**
   * Quick search by author only
   * @param {string} authorName - Author name to search
   * @param {Object} params - Additional params
   * @returns {Promise}
   */
  searchByAuthor: async (authorName, params = {}) => {
    try {
      const response = await api.get("/books/search", { 
        params: { author: authorName, ...params } 
      });
      return response.data;
    } catch (error) {
      console.error("Search by author error:", error);
      throw error;
    }
  },

  /**
   * Search by category
   * @param {number} categoryId - Category ID
   * @param {Object} params - Additional params
   * @returns {Promise}
   */
  searchByCategory: async (categoryId, params = {}) => {
    try {
      const response = await api.get("/books", { 
        params: { category_id: categoryId, ...params } 
      });
      return response.data;
    } catch (error) {
      console.error("Search by category error:", error);
      throw error;
    }
  },
  // ============================================
  // DEBUG & TESTING
  // ============================================

  debugFavorites: async () => {
    const response = await api.get("/books/debug-favorites");
    return response.data;
  },

  testFix: async () => {
    const response = await api.get("/books/test-fix");
    return response.data;
  },

  testNewFunction: async () => {
    const response = await api.get("/books/test-new-function");
    return response.data;
  },

  debugWhichFunction: async () => {
    const response = await api.get("/books/debug-which-function");
    return response.data;
  },

  // Test search functionality - FUNCTION MỚI
  testSearch: async (query) => {
    const response = await api.get("/books", { params: { search: query, limit: 3 } });
    return response.data;
  }
};

export default bookService;