// src/pages/HistoryPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UseAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import styled, { keyframes } from "styled-components";
import { userService } from "../services/user"; // Sửa từ bookService sang userService
import HomeButton from "../components/ui/HomeButton";

const HistoryPage = () => {
  const { user } = UseAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [activeView, setActiveView] = useState("today"); // "today" or "all"
  const [todayHistory, setTodayHistory] = useState([]); // Đổi tên từ todayBooks
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadTodayHistory();
  }, []);

  const loadTodayHistory = async () => {
    try {
      setLoading(true);
      const response = await userService.getTodayReadingHistory(); // Sử dụng userService
      setTodayHistory(response.history || []); // Đổi từ response.books sang response.history
    } catch (error) {
      console.error("Error loading today's history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllHistory = async (page = 1) => {
    try {
      setLoading(true);
      const response = await userService.getAllReadingHistory(page, pagination.per_page); // Sử dụng userService
      setAllHistory(response.history || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error("Error loading all history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllHistory = () => {
    setActiveView("all");
    loadAllHistory(1);
  };

  const handleBackToToday = () => {
    setActiveView("today");
  };

  const handleBookClick = (bookId) => {
    navigate(`/book/${bookId}`);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t("today");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t("yesterday");
    } else {
      // Use locale-based formatting
      const locale = t("today") === "今日" ? 'ja-JP' : 'en-US';
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // Nhóm lịch sử theo ngày (cho allHistory)
  const groupHistoryByDate = (history) => {
    const grouped = {};
    
    history.forEach(item => {
      if (!item.last_read_at) return;
      
      const date = new Date(item.last_read_at).toDateString();
      if (!grouped[date]) {
        grouped[date] = {
          date: date,
          display_date: formatDate(item.last_read_at),
          books: []
        };
      }
      grouped[date].books.push(item);
    });

    // Sắp xếp theo ngày giảm dần
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const groupedAllHistory = groupHistoryByDate(allHistory);

  if (loading && todayHistory.length === 0 && allHistory.length === 0) {
    return (
      <Container>
        <LoadingSpinner>
          <div className="spinner"></div>
          <p>{t("loadingHistory")}</p>
        </LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>{t("readingHistory")}</Title>
        <Subtitle>
          {activeView === "today" 
            ? `${t("booksYouReadToday")} (${todayHistory.length})`
            : t("allReadingHistory")
          }
        </Subtitle>
      </Header>
           <HomeButton title="BOOKS" top = "10vh" nav = "/books" />
      {/* Today's View (Default) */}
      {activeView === "today" && (
        <TodaySection>
          <BooksGrid>
            {todayHistory.map(history => (
              <BookCard key={history.book_id} onClick={() => handleBookClick(history.book_id)}>
                <BookCover>
                  <img 
                    src={history.cover_image || "/default-book-cover.jpg"} 
                    alt={history.title}
                    onError={(e) => {
                      e.target.src = "/default-book-cover.jpg";
                    }}
                  />
                  <ViewTime>{formatTime(history.last_read_at)}</ViewTime>
                  <LastPage>{t("page")} {history.last_page || 1}</LastPage>
                </BookCover>
                <BookInfo>
                  <BookTitle>{history.title}</BookTitle>
                  <BookAuthors>
                    {history.authors?.map(author => author.name).join(', ') || t("unknownAuthor")}
                  </BookAuthors>
                  <BookMeta>
                    <LastRead>
                      {formatTime(history.last_read_at)}
                    </LastRead>
                  </BookMeta>
                </BookInfo>
              </BookCard>
            ))}
          </BooksGrid>

          {todayHistory.length === 0 && !loading && (
            <EmptyState>
              <EmptyIcon>📚</EmptyIcon>
              <EmptyText>{t("noBooksReadToday")}</EmptyText>
              <EmptySubtext>{t("exploreAndRead")}</EmptySubtext>
            </EmptyState>
          )}

          {todayHistory.length > 0 && (
            <ViewAllButton onClick={handleViewAllHistory}>
              📋 {t("viewFullHistory")}
            </ViewAllButton>
          )}
        </TodaySection>
      )}

      {/* All History View */}
      {activeView === "all" && (
        <AllHistorySection>
          <BackButton onClick={handleBackToToday}>
            ← {t("backToToday")}
          </BackButton>

          {groupedAllHistory.map(dayGroup => (
            <DaySection key={dayGroup.date}>
              <DayHeader>
                <DayTitle>{dayGroup.display_date}</DayTitle>
                <DayCount>{dayGroup.books.length} {t("books")}</DayCount>
              </DayHeader>
              
              <BooksGrid>
                {dayGroup.books.map(history => (
                  <BookCard key={history.book_id} onClick={() => handleBookClick(history.book_id)}>
                    <BookCover>
                      <img 
                        src={history.cover_image || "/default-book-cover.jpg"} 
                        alt={history.title}
                        onError={(e) => {
                          e.target.src = "/default-book-cover.jpg";
                        }}
                      />
                      <ViewTime>{formatTime(history.last_read_at)}</ViewTime>
                      <LastPage>{t("page")} {history.last_page || 1}</LastPage>
                    </BookCover>
                    <BookInfo>
                      <BookTitle>{history.title}</BookTitle>
                      <BookAuthors>
                        {history.authors?.map(author => author.name).join(', ') || t("unknownAuthor")}
                      </BookAuthors>
                      <BookMeta>
                        <LastRead>
                          {formatTime(history.last_read_at)}
                        </LastRead>
                      </BookMeta>
                    </BookInfo>
                  </BookCard>
                ))}
              </BooksGrid>
            </DaySection>
          ))}

          {allHistory.length === 0 && !loading && (
            <EmptyState>
              <EmptyIcon>🕒</EmptyIcon>
              <EmptyText>{t("noReadingHistory")}</EmptyText>
              <EmptySubtext>{t("startReading")}</EmptySubtext>
            </EmptyState>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Pagination>
              <PaginationButton 
                disabled={pagination.page === 1}
                onClick={() => loadAllHistory(pagination.page - 1)}
              >
                ← {t("prev")}
              </PaginationButton>
              
              <PageInfo>
                {t("pageOf")} {pagination.page} / {pagination.pages}
              </PageInfo>
              
              <PaginationButton 
                disabled={pagination.page === pagination.pages}
                onClick={() => loadAllHistory(pagination.page + 1)}
              >
                {t("next")} →
              </PaginationButton>
            </Pagination>
          )}
        </AllHistorySection>
      )}
    </Container>
  );
};

// Styled Components
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  max-width: 100vw;
  width : 90vw;
  display :flex;
  justify-content: center;
  flex-direction : column;
  padding: 2rem;
  animation: ${fadeIn} 0.5s ease-out;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: #e3e9ebff;
  margin-bottom: 0.5rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #c8e2ebff;
  margin: 0;
`;

const TodaySection = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const AllHistorySection = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const BackButton = styled.button`
  background: rgba(129, 178, 20, 0.1);
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: #e0e2e2ff;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 2rem;

  &:hover {
    background: rgba(129, 178, 20, 0.2);
    transform: translateY(-2px);
  }
`;

const ViewAllButton = styled.button`
  background: linear-gradient(135deg, #81b214, #4caf50);
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 2rem auto;
  display: block;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(129, 178, 20, 0.3);
  }
`;

const BooksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
`;

const BookCard = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
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

  ${BookCard}:hover & img {
    transform: scale(1.05);
  }
`;

const ViewTime = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const LastPage = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(129, 178, 20, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const BookInfo = styled.div`
  padding: 1rem;
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
`;

const BookAuthors = styled.p`
  font-size: 0.9rem;
  color: #636e72;
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BookMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #636e72;
`;

const LastRead = styled.span`
  font-weight: 500;
  color: #81b214;
`;

const DaySection = styled.div`
  margin-bottom: 3rem;
  animation: ${fadeIn} 0.5s ease-out;
`;

const DayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(129, 178, 20, 0.2);
`;

const DayTitle = styled.h2`
  font-size: 1.4rem;
  color: #e6eceeff;
  margin: 0;
  font-weight: 600;
`;

const DayCount = styled.span`
  font-size: 0.9rem;
  color: #636e72;
  background: rgba(129, 178, 20, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #636e72;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.6;
`;

const EmptyText = styled.h3`
  font-size: 1.5rem;
  color: #2d3436;
  margin: 0 0 1rem 0;
  font-weight: 600;
`;

const EmptySubtext = styled.p`
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;

  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid transparent;
    border-top: 3px solid #81b214;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  p {
    color: #636e72;
    margin: 0;
    font-size: 1.1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
`;

const PaginationButton = styled.button`
  background: ${props => props.disabled ? '#dfe6e9' : 'rgba(129, 178, 20, 0.1)'};
  border: 1.5px solid ${props => props.disabled ? '#dfe6e9' : 'rgba(129, 178, 20, 0.3)'};
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${props => props.disabled ? '#b2bec3' : '#2d3436'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: rgba(129, 178, 20, 0.2);
    transform: translateY(-2px);
  }
`;

const PageInfo = styled.span`
  font-size: 0.9rem;
  color: #636e72;
  font-weight: 500;
`;

export default HistoryPage;