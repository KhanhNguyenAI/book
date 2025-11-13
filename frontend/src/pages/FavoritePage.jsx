import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { bookService } from "../services/book";
import { UseAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Loading from "../components/ui/Loading";
import LazyImage from "../components/ui/LazyImage";
import { Heart, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

const FavoritePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = UseAuth();
  const { t } = useLanguage();
  const [favorites, setFavorites] = useState([]);
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
    loadFavorites();
  }, [currentPage, isAuthenticated, authLoading]);

  const loadFavorites = async () => {
    try {
      // Đợi auth load xong trước khi load favorites
      if (authLoading) {
        return;
      }
      setLoading(true);
      const response = await bookService.getMyFavorites({
        page: currentPage,
        per_page: pagination.per_page,
      });

      if (response.status === "success") {
        const books = response.favorites.map((fav) => ({
          ...fav.book,
          is_favorite: true, // Mark as favorite since it's in favorites list
          favorite_id: fav.id, // Store favorite ID for deletion
          added_at: fav.added_at,
        }));
        setFavorites(books);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
      setFavorites([]);
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
        // Remove from list if unfavorited
        setFavorites((prev) => prev.filter((book) => book.id !== bookId));
      }
      // Reload favorites to sync with server
      await loadFavorites();
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

  const handleDeleteFavorite = async (favoriteId, bookId) => {
    if (!window.confirm(t("delete") + "?")) {
      return;
    }

    try {
      await bookService.removeFavorite(bookId);
      // Remove from list
      setFavorites((prev) => prev.filter((book) => book.favorite_id !== favoriteId));
      // Reload to sync with server
      await loadFavorites();
    } catch (error) {
      console.error("Error deleting favorite:", error);
      alert("Failed to delete favorite");
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
        
        <PageHeader>
          <HeaderContent>
            <TitleSection>
              <HeartIcon>
                <Heart size={32} fill="currentColor" />
              </HeartIcon>
              <TitleText>
                <h1>My Favorite Books</h1>
                <p>Your collection of favorite books</p>
              </TitleText>
            </TitleSection>
            {pagination.total > 0 && (
              <StatsSection>
                <StatItem>
                  <StatNumber>{pagination.total}</StatNumber>
                  <StatLabel>Total Books</StatLabel>
                </StatItem>
              </StatsSection>
            )}
          </HeaderContent>
        </PageHeader>

        {loading ? (
          <LoadingContainer>
            <Loading />
          </LoadingContainer>
        ) : favorites.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <Heart size={64} />
            </EmptyIcon>
            <EmptyTitle>{t("noFavoriteBooksYet")}</EmptyTitle>
            <EmptyText>
              {t("startExploring")}
            </EmptyText>
            <BrowseButton onClick={() => navigate("/books")}>
              {t("browseBooks")}
            </BrowseButton>
          </EmptyState>
        ) : (
          <>
            <FavoritesGrid>
              {favorites.map((book) => (
                <FavoriteCard 
                  key={book.favorite_id || book.id}
                  onClick={() => handleCardClick(book.id)}
                >
                  <BookCover>
                    <LazyImage 
                      src={book.cover_image || "/default-book-cover.webp"} 
                      alt={book.title}
                      fallback="/default-book-cover.webp"
                      loading="lazy"
                    />
                  </BookCover>
                  <BookInfo>
                    <BookTitle>{book.title}</BookTitle>
                    <BookAuthors>
                      {Array.isArray(book.authors)
                        ? book.authors.map(author => author.name || author).join(', ')
                        : book.authors_list?.map(author => author.name || author).join(', ') || book.authors || t("unknownAuthor")}
                    </BookAuthors>
                    <BookActions>
                      <DeleteButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFavorite(book.favorite_id, book.id);
                        }}
                        title={t("remove")}
                      >
                        <Trash2 size={16} />
                        {t("remove")}
                      </DeleteButton>
                    </BookActions>
                  </BookInfo>
                </FavoriteCard>
              ))}
            </FavoritesGrid>

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
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === pagination.pages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
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

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  width: 100vw;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
`;

const ContentWrapper = styled.div`
  flex: 1;
  max-width: 1400px;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
  animation: ${fadeIn} 0.5s ease-out;

  @media (max-width: 768px) {
    padding: 1rem;
  }

  @media (max-width: 480px) {
    padding: 0.5rem;
  }
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
  }
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

const HeartIcon = styled.div`
  color: #e74c3c;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TitleText = styled.div`
  h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    color: #333;
    word-wrap: break-word;
    overflow-wrap: break-word;

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }

    @media (max-width: 480px) {
      font-size: 1.25rem;
    }
  }

  p {
    margin: 0;
    color: #666;
    font-size: 1rem;
    word-wrap: break-word;
    overflow-wrap: break-word;

    @media (max-width: 480px) {
      font-size: 0.9rem;
    }
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
  color: #e74c3c;
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 3rem 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 2rem 1rem;
    border-radius: 8px;
  }
`;

const EmptyIcon = styled.div`
  color: #ddd;
  margin-bottom: 1.5rem;
`;

const EmptyTitle = styled.h2`
  font-size: 1.5rem;
  color: #333;
  margin: 0 0 0.5rem 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  max-width: 100%;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const EmptyText = styled.p`
  color: #666;
  margin: 0 0 2rem 0;
  font-size: 1rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  max-width: 100%;

  @media (max-width: 480px) {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
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
  box-sizing: border-box;
  white-space: nowrap;

  &:hover {
    background: #357abd;
  }

  @media (max-width: 480px) {
    padding: 0.6rem 1.5rem;
    font-size: 0.9rem;
    width: 100%;
    max-width: 100%;
    white-space: normal;
  }
`;

const FavoritesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  @media (max-width: 360px) {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
  }
`;

const FavoriteCard = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 480px) {
    border-radius: 8px;
  }
`;

const BookCover = styled.div`
  position: relative;
  width: 100%;
  height: 250px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  ${FavoriteCard}:hover & img {
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    height: 200px;
  }

  @media (max-width: 480px) {
    height: 180px;
  }

  @media (max-width: 360px) {
    height: 150px;
  }
`;

const BookInfo = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const BookTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #2d3436;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const BookAuthors = styled.p`
  font-size: 0.9rem;
  color: #636e72;
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 480px) {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }
`;

const BookActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    margin-top: 0.25rem;
  }
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
  box-sizing: border-box;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #cc0000;
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    gap: 0.4rem;

    svg {
      width: 14px;
      height: 14px;
    }
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    padding: 1rem;
    margin-top: 2rem;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-top: 1.5rem;
    gap: 0.5rem;
    border-radius: 8px;
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
  box-sizing: border-box;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: #357abd;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }

  @media (max-width: 480px) {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    gap: 0.4rem;

    svg {
      width: 16px;
      height: 16px;
    }
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
  box-sizing: border-box;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$active ? "#357abd" : "#f0f0f0")};
    border-color: ${(props) => (props.$active ? "#357abd" : "#4a90e2")};
  }

  @media (max-width: 480px) {
    min-width: 35px;
    height: 35px;
    padding: 0.4rem;
    font-size: 0.9rem;
  }
`;

const Ellipsis = styled.span`
  padding: 0 0.5rem;
  color: #666;
`;

export default FavoritePage;

