import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { adminService } from "../../services/admin";
import Loading from "../../components/ui/Loading";

import { BarChart3, Users, BookOpen, MessageSquare, Bot, TrendingUp, Eye, RefreshCw } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getDashboardStats();
      if (response.status === "success") {
        setStats(response.stats);
        setLastUpdated(new Date());
      } else {
        setError("Failed to load dashboard statistics");
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError(err.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <Container>
        <Loading />
      </Container>
    );
  }

  if (error && !stats) {
    return (
      <Container>
        <ErrorBanner>
          <p>❌ {error}</p>
          <button onClick={fetchStats}>Retry</button>
        </ErrorBanner>
      </Container>
    );
  }

  const statCards = [
    {
      icon: <Users size={32} />,
      label: "Total Users",
      value: stats?.total_users || 0,
      color: "#4a90e2",
      link: "/admin/users",
      linkText: "Manage users →"
    },
    {
      icon: <BookOpen size={32} />,
      label: "Total Books",
      value: stats?.total_books || 0,
      color: "#50c878",
      link: "/admin/books",
      linkText: "Manage books →"
    },
    {
      icon: <MessageSquare size={32} />,
      label: "Total Messages",
      value: stats?.total_messages || 0,
      color: "#ff6b6b",
      link: "/admin/messages",
      linkText: "View messages →"
    },
    {
      icon: <Bot size={32} />,
      label: "Chatbot Messages Today",
      value: stats?.chatbot_messages_today || 0,
      color: "#9b59b6",
      link: "/admin/chatbot",
      linkText: "View chatbot →"
    },
    {
      icon: <TrendingUp size={32} />,
      label: "Online Users",
      value: stats?.online_users || 0,
      color: "#f39c12",
      link: "/admin/users?filter=online",
      linkText: "View online →"
    }
  ];

  return (
    <Container>

      <Header>
        <HeaderContent>
          <TitleSection>
            <h1>🎯 Admin Dashboard</h1>
            <p>Comprehensive overview of your library system</p>
          </TitleSection>
          <HeaderActions>
            <RefreshButton onClick={fetchStats} disabled={loading}>
              <RefreshCw size={18} className={loading ? "spinning" : ""} />
              Refresh
            </RefreshButton>
            {lastUpdated && (
              <LastUpdated>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </LastUpdated>
            )}
          </HeaderActions>
        </HeaderContent>
      </Header>

      {error && (
        <ErrorBanner>
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={fetchStats}>Retry</button>
        </ErrorBanner>
      )}

      {/* Stats Cards */}
      <StatsGrid>
        {statCards.map((card, index) => (
          <StatCard key={index} $color={card.color}>
            <StatCardHeader>
              <StatIcon $color={card.color}>{card.icon}</StatIcon>
              <StatNumber>{card.value.toLocaleString()}</StatNumber>
            </StatCardHeader>
            <StatLabel>{card.label}</StatLabel>
            <StatLink to={card.link} $color={card.color}>{card.linkText}</StatLink>
          </StatCard>
        ))}
      </StatsGrid>

      {/* Charts Section */}
      {stats?.chart_data && (
        <ChartsSection>
          <SectionTitle>📊 Analytics (Last 7 Days)</SectionTitle>
          <ChartsGrid>
            {/* Users Chart */}
            <ChartCard>
              <ChartHeader>
                <ChartTitle>New Users</ChartTitle>
              </ChartHeader>
              <SimpleBarChart data={stats.chart_data.users} color="#4a90e2" />
            </ChartCard>

            {/* Messages Chart */}
            <ChartCard>
              <ChartHeader>
                <ChartTitle>Messages</ChartTitle>
              </ChartHeader>
              <SimpleBarChart data={stats.chart_data.messages} color="#ff6b6b" />
            </ChartCard>

            {/* Chatbot Messages Chart */}
            <ChartCard>
              <ChartHeader>
                <ChartTitle>Chatbot Messages</ChartTitle>
              </ChartHeader>
              <SimpleBarChart data={stats.chart_data.chatbot_messages} color="#9b59b6" />
            </ChartCard>
          </ChartsGrid>
        </ChartsSection>
      )}

      {/* Top Books Section */}
      {stats?.top_books && stats.top_books.length > 0 && (
        <TopBooksSection>
          <SectionTitle>📚 Top Most Viewed Books</SectionTitle>
          <TopBooksGrid>
            {stats.top_books.map((book, index) => (
              <TopBookCard key={book.id}>
                <RankBadge>#{index + 1}</RankBadge>
                <BookCover>
                  {book.cover_image ? (
                    <img src={book.cover_image} alt={book.title} />
                  ) : (
                    <PlaceholderCover>📖</PlaceholderCover>
                  )}
                </BookCover>
                <BookInfo>
                  <BookTitle>{book.title}</BookTitle>
                  <BookStats>
                    <StatItem>
                      <Eye size={14} />
                      <span>{book.view_count?.toLocaleString() || 0} views</span>
                    </StatItem>
                    {book.unique_viewers > 0 && (
                      <StatItem>
                        <Users size={14} />
                        <span>{book.unique_viewers} unique viewers</span>
                      </StatItem>
                    )}
                  </BookStats>
                  <ViewBookLink to={`/books/${book.id}`}>
                    View Book →
                  </ViewBookLink>
                </BookInfo>
              </TopBookCard>
            ))}
          </TopBooksGrid>
        </TopBooksSection>
      )}

      {/* Quick Actions */}
      <QuickActionsSection>
        <SectionTitle>🚀 Quick Actions</SectionTitle>
        <ActionGrid>
          <ActionCard to="/admin/books?action=add">
            <ActionIcon>➕</ActionIcon>
            <ActionText>Add New Book</ActionText>
          </ActionCard>

          <ActionCard to="/admin/users">
            <ActionIcon>👥</ActionIcon>
            <ActionText>Manage Users</ActionText>
          </ActionCard>

          <ActionCard to="/admin/messages">
            <ActionIcon>💬</ActionIcon>
            <ActionText>Manage Messages</ActionText>
          </ActionCard>

          <ActionCard to="/admin/reports">
            <ActionIcon>📋</ActionIcon>
            <ActionText>View Reports</ActionText>
          </ActionCard>
        </ActionGrid>
      </QuickActionsSection>
    </Container>
  );
};

// Simple Bar Chart Component (no external library needed)
const SimpleBarChart = ({ data, color }) => {
  if (!data || data.length === 0) {
    return <EmptyChart>No data available</EmptyChart>;
  }

  const maxValue = Math.max(...data.map(d => d.count || 0), 1);

  return (
    <ChartContainer>
      <ChartBars>
        {data.map((item, index) => {
          const height = ((item.count || 0) / maxValue) * 100;
          return (
            <BarGroup key={index}>
              <Bar $height={height} $color={color}>
                <BarValue>{item.count || 0}</BarValue>
              </Bar>
              <BarLabel>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</BarLabel>
            </BarGroup>
          );
        })}
      </ChartBars>
    </ChartContainer>
  );
};

// Styled Components
const Container = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
`;

const TitleSection = styled.div`
  h1 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 2.5rem;
    font-weight: bold;
  }

  p {
    color: #7f8c8d;
    font-size: 1.1rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 2px solid #3498db;
  border-radius: 8px;
  color: #3498db;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    background: #3498db;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LastUpdated = styled.div`
  color: #7f8c8d;
  font-size: 0.9rem;
`;

const ErrorBanner = styled.div`
  background: #ffe5e5;
  border: 2px solid #ff6b6b;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #c0392b;

  button {
    margin-left: auto;
    padding: 0.5rem 1rem;
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;

    &:hover {
      background: #e74c3c;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 5px solid ${props => props.$color};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
`;

const StatCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const StatIcon = styled.div`
  color: ${props => props.$color};
  display: flex;
  align-items: center;
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: #2c3e50;
`;

const StatLabel = styled.div`
  color: #7f8c8d;
  font-size: 1rem;
  margin-bottom: 1rem;
  font-weight: 500;
`;

const StatLink = styled(Link)`
  color: ${props => props.$color || '#4a90e2'};
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  transition: all 0.3s ease;

  &:hover {
    text-decoration: underline;
    transform: translateX(5px);
  }
`;

const SectionTitle = styled.h2`
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: bold;
`;

const ChartsSection = styled.div`
  margin-bottom: 3rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
`;

const ChartCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const ChartHeader = styled.div`
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h3`
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 200px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 1rem 0;
`;

const ChartBars = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  gap: 0.5rem;
`;

const BarGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 0.5rem;
`;

const Bar = styled.div`
  width: 100%;
  height: ${props => props.$height}%;
  background: linear-gradient(180deg, ${props => props.$color} 0%, ${props => props.$color}dd 100%);
  border-radius: 8px 8px 0 0;
  position: relative;
  min-height: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    opacity: 0.9;
    transform: scaleY(1.05);
  }
`;

const BarValue = styled.span`
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const BarLabel = styled.div`
  font-size: 0.7rem;
  color: #7f8c8d;
  text-align: center;
  font-weight: 500;
`;

const EmptyChart = styled.div`
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7f8c8d;
  font-style: italic;
`;

const TopBooksSection = styled.div`
  margin-bottom: 3rem;
`;

const TopBooksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
`;

const TopBookCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
`;

const RankBadge = styled.div`
  position: absolute;
  top: -10px;
  left: -10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  border: 3px solid white;
`;

const BookCover = styled.div`
  width: 100%;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PlaceholderCover = styled.div`
  font-size: 4rem;
  opacity: 0.7;
`;

const BookInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const BookTitle = styled.h3`
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BookStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #7f8c8d;
  font-size: 0.9rem;

  svg {
    color: #95a5a6;
  }
`;

const ViewBookLink = styled(Link)`
  color: #3498db;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  transition: all 0.3s ease;

  &:hover {
    text-decoration: underline;
    transform: translateX(5px);
  }
`;

const QuickActionsSection = styled.div`
  margin-bottom: 2rem;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const ActionCard = styled(Link)`
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
`;

const ActionIcon = styled.div`
  font-size: 3rem;
`;

const ActionText = styled.div`
  font-weight: 600;
  color: #2c3e50;
  font-size: 1rem;
`;

export default AdminDashboard;
