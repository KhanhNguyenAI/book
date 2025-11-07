import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BookCard from "../components/ui/BookCard";
import { bookService } from "../services/book";
import { UseAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Loading from "../components/ui/Loading";
import HomeButton from "../components/ui/HomeButton";
import { Bookmark, ChevronLeft, ChevronRight, Trash2, FileText } from "lucide-react";

const BookmarksPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = UseAuth();
  const { t } = useLanguage();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 12,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    // Đợi auth load xong trước khi check authentication
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
    loadBookmarks();
  }, [currentPage, isAuthenticated, authLoading]);

  const loadBookmarks = async () => {
    try {
      // Đợi auth load xong trước khi load bookmarks
      if (authLoading) {
        return;
      }
      setLoading(true);
      const response = await bookService.getBookmarks({
        page: currentPage,
        per_page: pagination.per_page,
      });

      if (response.status === "success") {
        const bookmarkData = response.bookmarks.map((bookmark) => ({
          ...bookmark.book,
          is_bookmarked: true,
          bookmark_id: bookmark.id,
          bookmark_page_number: bookmark.page_number,
          bookmark_note: bookmark.mark_note,
          bookmarked_at: bookmark.created_at,
        }));
        setBookmarks(bookmarkData);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      setBookmarks([]);
    } finally {
      // Chỉ kết thúc loading khi auth đã load xong
      if (!authLoading) {
        setLoading(false);
      }
    }
  };

  const handleCardClick = (bookId) => {
    navigate(`/books/${bookId}`);
  };

  const handleFavoriteClick = async (bookId, isFavorite) => {
    try {
      if (isFavorite) {
        await bookService.addFavorite(bookId);
      } else {
        await bookService.removeFavorite(bookId);
      }
      await loadBookmarks();
    } catch (error) {
      console.error("Error updating favorite:", error);
    }
  };

  const handleBookmarkClick = async (bookId, isBookmarked) => {
    try {
      if (isBookmarked) {
        await bookService.addBookmark(bookId, { page_number: 1 });
      }
    } catch (error) {
      console.error("Error updating bookmark:", error);
    }
  };

  const handleDeleteBookmark = async (bookmarkId, bookId) => {
    if (!window.confirm(t("delete") + "?")) {
      return;
    }

    try {
      await bookService.deleteBookmark(bookmarkId);
      // Remove from list
      setBookmarks((prev) => prev.filter((book) => book.bookmark_id !== bookmarkId));
      // Reload to sync with server
      await loadBookmarks();
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      alert("Failed to delete bookmark");
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer>
      <Header />
      <ContentWrapper>
        <HomeButton nav = "/books" />
        
        <PageHeader>
          <HeaderContent>
            <TitleSection>
              <BookmarkIcon>
                <Bookmark size={32} fill="currentColor" />
              </BookmarkIcon>
              <TitleText>
                <h1>{t("myBookmarks")}</h1>
                <p>{t("savedPositions")}</p>
              </TitleText>
            </TitleSection>
            {pagination.total > 0 && (
              <StatsSection>
                <StatItem>
                  <StatNumber>{pagination.total}</StatNumber>
                  <StatLabel>{t("totalBookmarks")}</StatLabel>
                </StatItem>
              </StatsSection>
            )}
          </HeaderContent>
        </PageHeader>

        {loading ? (
          <LoadingContainer>
            <Loading />
          </LoadingContainer>
        ) : bookmarks.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <Bookmark size={64} />
            </EmptyIcon>
            <EmptyTitle>{t("noBookmarksYet")}</EmptyTitle>
            <EmptyText>
              {t("startReading")}
            </EmptyText>
            <BrowseButton onClick={() => navigate("/books")}>
              {t("browseBooks")}
            </BrowseButton>
          </EmptyState>
        ) : (
          <>
            <BookmarksGrid>
              {bookmarks.map((book) => (
                <BookmarkCard key={book.bookmark_id || book.id}>
                  <BookCardWrapper>
                    <BookCard
                      book={book}
                      onCardClick={handleCardClick}
                    />
                  </BookCardWrapper>
                  
                  <BookmarkInfo>
                    <BookmarkDetail>
                      <FileText size={16} />
                      <span>{t("page")} {book.bookmark_page_number || 1}</span>
                    </BookmarkDetail>
                    {book.bookmark_note && (
                      <BookmarkNote>
                        <NoteLabel>{t("note")}:</NoteLabel>
                        <NoteText>{book.bookmark_note}</NoteText>
                      </BookmarkNote>
                    )}
                    <BookmarkActions>
                      <DeleteButton
                        onClick={() => handleDeleteBookmark(book.bookmark_id, book.id)}
                        title={t("remove")}
                      >
                        <Trash2 size={16} />
                        {t("remove")}
                      </DeleteButton>
                    </BookmarkActions>
                  </BookmarkInfo>
                </BookmarkCard>
              ))}
            </BookmarksGrid>

            {pagination.pages > 1 && (
              <PaginationContainer>
                <PaginationButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={20} />
                  {t("previous")}
                </PaginationButton>

                <PageNumbers>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === pagination.pages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && <Ellipsis>...</Ellipsis>}
                          <PageNumber
                            $active={page === currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </PageNumber>
                        </React.Fragment>
                      );
                    })}
                </PageNumbers>

                <PaginationButton
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                >
                  {t("next")}
                  <ChevronRight size={20} />
                </PaginationButton>
              </PaginationContainer>
            )}
          </>
        )}
      </ContentWrapper>
      <Footer />
    </PageContainer>
  );
};

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  width: 100vw;
`;

const ContentWrapper = styled.div`
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 2rem;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const BookmarkIcon = styled.div`
  color: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TitleText = styled.div`
  h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 1rem;
  }
`;

const StatsSection = styled.div`
  display: flex;
  gap: 2rem;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #4a90e2;
  line-height: 1;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #666;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const EmptyIcon = styled.div`
  color: #ddd;
  margin-bottom: 1.5rem;
`;

const EmptyTitle = styled.h2`
  font-size: 1.5rem;
  color: #333;
  margin: 0 0 0.5rem 0;
`;

const EmptyText = styled.p`
  color: #666;
  margin: 0 0 2rem 0;
  font-size: 1rem;
`;

const BrowseButton = styled.button`
  padding: 0.75rem 2rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #357abd;
  }
`;

const BookmarksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
`;

const BookmarkCard = styled.div`
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const BookCardWrapper = styled.div`
  flex: 1;
`;

const BookmarkInfo = styled.div`
  padding: 1rem;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const BookmarkDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.875rem;
  font-weight: 500;
`;

const BookmarkNote = styled.div`
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #4a90e2;
`;

const NoteLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NoteText = styled.div`
  color: #333;
  font-size: 0.875rem;
  line-height: 1.5;
  word-break: break-word;
`;

const BookmarkActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #cc0000;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const PaginationButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #357abd;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const PageNumbers = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PageNumber = styled.button`
  min-width: 40px;
  height: 40px;
  padding: 0.5rem;
  background: ${(props) => (props.$active ? "#4a90e2" : "white")};
  color: ${(props) => (props.$active ? "white" : "#333")};
  border: 1px solid ${(props) => (props.$active ? "#4a90e2" : "#ddd")};
  border-radius: 8px;
  font-size: 1rem;
  font-weight: ${(props) => (props.$active ? "600" : "400")};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$active ? "#357abd" : "#f0f0f0")};
    border-color: ${(props) => (props.$active ? "#357abd" : "#4a90e2")};
  }
`;

const Ellipsis = styled.span`
  padding: 0 0.5rem;
  color: #666;
`;

export default BookmarksPage;
