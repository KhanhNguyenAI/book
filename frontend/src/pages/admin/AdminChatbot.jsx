import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { adminService } from "../../services/admin";
import { Bot, Search, ThumbsUp, ThumbsDown, User, Calendar, MessageSquare } from "lucide-react";
import Loading from "../../components/ui/Loading";

const AdminChatbot = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchConversations();
  }, [pagination.page, feedbackFilter, searchTerm]);

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

