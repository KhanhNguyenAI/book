import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { adminService } from "../../services/admin";
import { Bot, Search, ThumbsUp, ThumbsDown, User, Calendar, MessageSquare } from "lucide-react";
import Loading from "../../components/ui/Loading";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO, eachDayOfInterval } from "date-fns";

const sentimentColors = ["#48bb78", "#f56565", "#a0aec0"];
const trendColors = {
  positive: "#48bb78",
  negative: "#f56565",
  neutral: "#a0aec0",
};

const AdminChatbot = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [daysRange, setDaysRange] = useState(30);

  useEffect(() => {
    fetchConversations();
  }, [pagination.page, feedbackFilter, searchTerm]);

useEffect(() => {
  fetchStats();
}, [daysRange]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        search: searchTerm,
        is_positive: feedbackFilter
      };
      const response = await adminService.getChatbotConversations(params);
      if (response.status === "success") {
        setConversations(response.conversations);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

const fetchStats = async () => {
  try {
    setStatsLoading(true);
    setStatsError(null);
    const response = await adminService.getChatbotStats({ days: daysRange });
    if (response.status === "success") {
      setStats(response);
    } else {
      setStats(null);
      setStatsError("Failed to load chatbot analytics.");
    }
  } catch (error) {
    console.error("Error fetching chatbot stats:", error);
    setStats(null);
    setStatsError("Failed to load chatbot analytics.");
  } finally {
    setStatsLoading(false);
  }
};

const summary = stats?.summary;
const dateRange = useMemo(() => {
  if (!summary?.start_date || !summary?.end_date) return [];
  const start = parseISO(summary.start_date);
  const end = parseISO(summary.end_date);
  if (start > end) return [];
  return eachDayOfInterval({ start, end });
}, [summary]);

const sentimentBreakdown = useMemo(() => {
  if (!summary) return [];
  const data = [
    { name: "Positive", value: summary.positive_count || 0 },
    { name: "Negative", value: summary.negative_count || 0 },
  ];
  if (summary.neutral_count) {
    data.push({ name: "Neutral", value: summary.neutral_count });
  }
  return data.filter(item => item.value > 0);
}, [summary]);

const dailySeries = useMemo(() => {
  if (!stats || dateRange.length === 0) return [];
  const map = new Map();
  (stats.daily || []).forEach(entry => map.set(entry.date, entry));
  return dateRange.map(date => {
    const key = format(date, "yyyy-MM-dd");
    const entry = map.get(key);
    return {
      date: format(date, "dd/MM"),
      positive: entry?.positive || 0,
      negative: entry?.negative || 0,
      neutral: entry?.neutral || 0,
      total: entry?.total || 0,
    };
  });
}, [stats, dateRange]);

const feedbackTotal = summary?.feedback_total || 0;
const positiveRate = summary ? Number(((summary.positive_ratio || 0) * 100).toFixed(1)) : 0;
const negativeRate = summary ? Number(((summary.negative_ratio || 0) * 100).toFixed(1)) : 0;
const neutralRate = feedbackTotal
  ? Number((((summary?.neutral_count || 0) / feedbackTotal) * 100).toFixed(1))
  : 0;

const hasSentimentData = sentimentBreakdown.length > 0;
const hasDailyTrend = dailySeries.some(entry => entry.positive > 0 || entry.negative > 0 || entry.neutral > 0);
const showNeutralInDaily = dailySeries.some(entry => entry.neutral > 0);

const handleDaysChange = (event) => {
  setDaysRange(Number(event.target.value));
};

  if (loading && conversations.length === 0) {
    return (
      <PageContainer>
        <Loading />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1>🤖 Chatbot Conversations</h1>
        <p>View and analyze chatbot interactions</p>
      </PageHeader>

      <AnalyticsSection>
        <AnalyticsHeader>
          <div>
            <SectionTitle>Chatbot analytics</SectionTitle>
            <SectionSubtitle>
              Track how users rate their chatbot conversations and monitor sentiment trends over time.
            </SectionSubtitle>
          </div>
          <ControlsRow>
            <ControlsLabel>Time range:</ControlsLabel>
            <ControlsSelect value={daysRange} onChange={handleDaysChange}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </ControlsSelect>
          </ControlsRow>
        </AnalyticsHeader>

        {statsError && <ErrorBanner>{statsError}</ErrorBanner>}

        {summary ? (
          <>
            <SummaryGrid>
              <SummaryCard>
                <IconCircle $variant="total">
                  <MessageSquare size={24} />
                </IconCircle>
                <SummaryContent>
                  <SummaryLabel>Total conversations</SummaryLabel>
                  <SummaryValue>{summary.total_conversations ?? 0}</SummaryValue>
                  <SummarySubtext>Across last {summary.days ?? daysRange} days</SummarySubtext>
                </SummaryContent>
              </SummaryCard>

              <SummaryCard>
                <IconCircle $variant="rated">
                  <Bot size={24} />
                </IconCircle>
                <SummaryContent>
                  <SummaryLabel>Rated feedback</SummaryLabel>
                  <SummaryValue>{feedbackTotal}</SummaryValue>
                  <SummarySubtext>{summary.positive_count || 0} positive • {summary.negative_count || 0} negative</SummarySubtext>
                </SummaryContent>
              </SummaryCard>

              <SummaryCard>
                <IconCircle $variant="positive">
                  <ThumbsUp size={24} />
                </IconCircle>
                <SummaryContent>
                  <SummaryLabel>Positive feedback</SummaryLabel>
                  <SummaryValue>{positiveRate}%</SummaryValue>
                  <SummarySubtext>{summary.positive_count || 0} responses</SummarySubtext>
                </SummaryContent>
              </SummaryCard>

              <SummaryCard>
                <IconCircle $variant="negative">
                  <ThumbsDown size={24} />
                </IconCircle>
                <SummaryContent>
                  <SummaryLabel>Negative feedback</SummaryLabel>
                  <SummaryValue>{negativeRate}%</SummaryValue>
                  <SummarySubtext>{summary.negative_count || 0} responses</SummarySubtext>
                </SummaryContent>
              </SummaryCard>
            </SummaryGrid>

            <AnalyticsChartsGrid>
              <ChartCard>
                <ChartHeader>
                  <div>
                    <ChartTitle>Feedback sentiment</ChartTitle>
                    <ChartSubtitle>Distribution of positive, negative, and neutral ratings</ChartSubtitle>
                  </div>
                  {feedbackTotal > 0 && <Badge>{feedbackTotal} rated</Badge>}
                </ChartHeader>
                <ChartBody>
                  {hasSentimentData ? (
                    <PieWrapper>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentBreakdown}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={3}
                          >
                            {sentimentBreakdown.map((entry, index) => (
                              <Cell key={entry.name} fill={sentimentColors[index % sentimentColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value}`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </PieWrapper>
                  ) : (
                    <EmptyAnalytics>No chatbot feedback recorded in this range.</EmptyAnalytics>
                  )}
                </ChartBody>
                {hasSentimentData && (
                  <SentimentStats>
                    <StatPill $variant="positive">
                      Positive {summary.positive_count || 0} ({positiveRate}%)
                    </StatPill>
                    <StatPill $variant="negative">
                      Negative {summary.negative_count || 0} ({negativeRate}%)
                    </StatPill>
                    {summary.neutral_count ? (
                      <StatPill $variant="neutral">
                        Neutral {summary.neutral_count} ({neutralRate}%)
                      </StatPill>
                    ) : null}
                  </SentimentStats>
                )}
              </ChartCard>

              <ChartCard>
                <ChartHeader>
                  <div>
                    <ChartTitle>Daily feedback trend</ChartTitle>
                    <ChartSubtitle>Positive vs negative ratings per day</ChartSubtitle>
                  </div>
                </ChartHeader>
                <ChartBody>
                  {hasDailyTrend ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={dailySeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="positive" name="Positive" stackId="feedback" fill={trendColors.positive} />
                        <Bar dataKey="negative" name="Negative" stackId="feedback" fill={trendColors.negative} />
                        {showNeutralInDaily && (
                          <Bar dataKey="neutral" name="Neutral" stackId="feedback" fill={trendColors.neutral} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyAnalytics>No feedback trend available.</EmptyAnalytics>
                  )}
                </ChartBody>
              </ChartCard>
            </AnalyticsChartsGrid>
          </>
        ) : statsLoading ? (
          <InlineLoader>
            <Loading />
          </InlineLoader>
        ) : (
          <EmptyAnalytics>No chatbot analytics available for this range.</EmptyAnalytics>
        )}
      </AnalyticsSection>

      <SectionDivider />

      <FiltersBar>
        <SearchBox>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          />
        </SearchBox>
        <FilterSelect
          value={feedbackFilter}
          onChange={(e) => {
            setFeedbackFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        >
          <option value="">All Feedback</option>
          <option value="true">Positive</option>
          <option value="false">Negative</option>
        </FilterSelect>
      </FiltersBar>

      <StatsBar>
        <StatItem>
          <span>Total: {pagination.total}</span>
        </StatItem>
        <StatItem>
          <span>Page {pagination.page} of {pagination.pages}</span>
        </StatItem>
      </StatsBar>

      <ConversationsList>
        {conversations.map((conv) => (
          <ConversationCard key={conv.id}>
            <ConversationHeader>
              <UserInfo>
                {conv.user?.avatar_url && (
                  <Avatar src={conv.user.avatar_url} alt={conv.user.username} />
                )}
                <div>
                  <UserName>{conv.user?.username || "Unknown User"}</UserName>
                  <ConversationMeta>
                    <Calendar size={12} />
                    <span>{new Date(conv.created_at).toLocaleString()}</span>
                    {conv.is_positive !== null && (
                      <>
                        <span>•</span>
                        {conv.is_positive ? (
                          <FeedbackBadge $positive>
                            <ThumbsUp size={12} />
                            Positive
                          </FeedbackBadge>
                        ) : (
                          <FeedbackBadge $positive={false}>
                            <ThumbsDown size={12} />
                            Negative
                          </FeedbackBadge>
                        )}
                      </>
                    )}
                  </ConversationMeta>
                </div>
              </UserInfo>
            </ConversationHeader>
            
            <ConversationContent>
              <MessageSection>
                <MessageLabel>
                  <User size={14} />
                  User Question:
                </MessageLabel>
                <MessageText>{conv.user_message}</MessageText>
              </MessageSection>
              
              <MessageSection>
                <MessageLabel>
                  <Bot size={14} />
                  Bot Response:
                </MessageLabel>
                <MessageText>{conv.bot_response || "No response"}</MessageText>
              </MessageSection>
            </ConversationContent>
          </ConversationCard>
        ))}
      </ConversationsList>

      {conversations.length === 0 && !loading && (
        <EmptyState>
          <Bot size={48} />
          <p>No conversations found</p>
        </EmptyState>
      )}

      {pagination.pages > 1 && (
        <Pagination>
          <PaginationButton
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </PaginationButton>
          <PageInfo>
            Page {pagination.page} of {pagination.pages}
          </PageInfo>
          <PaginationButton
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </PaginationButton>
        </Pagination>
      )}
    </PageContainer>
  );
};

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
  
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  p {
    color: #666;
  }
`;

const AnalyticsSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const AnalyticsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a1f36;
`;

const SectionSubtitle = styled.p`
  margin-top: 0.35rem;
  color: #4a5568;
  font-size: 0.95rem;
  max-width: 720px;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ControlsLabel = styled.span`
  font-weight: 600;
  color: #2d3748;
`;

const ControlsSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgb(141, 187, 236);
  background: white;
  cursor: pointer;
  font-weight: 500;
  color: #1a202c;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const SummaryCard = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
`;

const IconCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: ${({ $variant }) => {
    switch ($variant) {
      case "total":
        return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
      case "rated":
        return "linear-gradient(135deg, #805ad5 0%, #6b46c1 100%)";
      case "positive":
        return "linear-gradient(135deg, #48bb78 0%, #38a169 100%)";
      case "negative":
      default:
        return "linear-gradient(135deg, #f56565 0%, #e53e3e 100%)";
    }
  }};
`;

const SummaryContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const SummaryLabel = styled.span`
  font-size: 0.95rem;
  color: #4a5568;
  font-weight: 600;
`;

const SummaryValue = styled.span`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a1f36;
`;

const SummarySubtext = styled.span`
  font-size: 0.85rem;
  color: #718096;
`;

const AnalyticsChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const ChartCard = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 12px 40px rgba(79, 209, 197, 0.08);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const ChartTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1f36;
`;

const ChartSubtitle = styled.p`
  font-size: 0.9rem;
  color: #718096;
  margin-top: 0.25rem;
`;

const ChartBody = styled.div`
  width: 100%;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Badge = styled.span`
  padding: 0.35rem 0.75rem;
  background: rgba(102, 126, 234, 0.15);
  color: #4c51bf;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const PieWrapper = styled.div`
  width: 100%;
  max-width: 420px;
  height: 320px;
  margin: 0 auto;
`;

const SentimentStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const StatPill = styled.span`
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${({ $variant }) => {
    switch ($variant) {
      case "positive":
        return "rgba(72, 187, 120, 0.18)";
      case "negative":
        return "rgba(245, 101, 101, 0.2)";
      case "neutral":
      default:
        return "rgba(160, 174, 192, 0.25)";
    }
  }};
  color: ${({ $variant }) => {
    switch ($variant) {
      case "positive":
        return "#276749";
      case "negative":
        return "#C53030";
      case "neutral":
      default:
        return "#4a5568";
    }
  }};
`;

const EmptyAnalytics = styled.div`
  text-align: center;
  color: #a0aec0;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 2.5rem 1rem;
  font-weight: 500;
`;

const InlineLoader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;
`;

const ErrorBanner = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(245, 101, 101, 0.3);
  background: rgba(245, 101, 101, 0.12);
  color: #9b2c2c;
  font-weight: 500;
`;

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  margin: 1.5rem 0 2rem;
`;

const FiltersBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  flex: 1;
  min-width: 250px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  
  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1rem;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
`;

const StatItem = styled.div`
  font-weight: 500;
  color: #666;
`;

const ConversationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ConversationCard = styled.div`
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ConversationHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
`;

const UserInfo = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #333;
`;

const ConversationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
`;

const FeedbackBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => props.$positive ? '#d4edda' : '#f8d7da'};
  color: ${props => props.$positive ? '#155724' : '#721c24'};
`;

const ConversationContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MessageSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const MessageLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #666;
  font-size: 0.875rem;
`;

const MessageText = styled.div`
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
  
  svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const PaginationButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: #357abd;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: #666;
  font-weight: 500;
`;

export default AdminChatbot;

