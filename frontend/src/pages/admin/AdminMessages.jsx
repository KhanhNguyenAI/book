import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { adminService } from "../../services/admin";
import { MessageSquare, Search, Trash2, User, Calendar } from "lucide-react";
import Loading from "../../components/ui/Loading";

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletedFilter, setDeletedFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchMessages();
  }, [pagination.page, deletedFilter, searchTerm]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        search: searchTerm,
        is_deleted: deletedFilter
      };
      const response = await adminService.getMessages(params);
      if (response.status === "success") {
        setMessages(response.messages);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    
    try {
      await adminService.deleteMessage(messageId);
      fetchMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message");
    }
  };

  if (loading && messages.length === 0) {
    return (
      <PageContainer>
        <Loading />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1>💬 Message Management</h1>
        <p>Manage all messages in the system</p>
      </PageHeader>

      <FiltersBar>
        <SearchBox>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          />
        </SearchBox>
        <FilterSelect
          value={deletedFilter}
          onChange={(e) => {
            setDeletedFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        >
          <option value="">All Messages</option>
          <option value="false">Active</option>
          <option value="true">Deleted</option>
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

      <MessagesList>
        {messages.map((message) => (
          <MessageCard key={message.id} $deleted={message.is_deleted}>
            <MessageHeader>
              <UserInfo>
                {message.user?.avatar_url && (
                  <Avatar src={message.user.avatar_url} alt={message.user.username} />
                )}
                <div>
                  <UserName>{message.user?.username || "Unknown User"}</UserName>
                  <MessageMeta>
                    <Calendar size={12} />
                    <span>{new Date(message.created_at).toLocaleString()}</span>
                  </MessageMeta>
                </div>
              </UserInfo>
              {!message.is_deleted && (
                <DeleteButton onClick={() => handleDelete(message.id)}>
                  <Trash2 size={16} />
                </DeleteButton>
              )}
            </MessageHeader>
            <MessageContent $deleted={message.is_deleted}>
              {message.content}
            </MessageContent>
            {message.is_deleted && (
              <DeletedBadge>Deleted</DeletedBadge>
            )}
          </MessageCard>
        ))}
      </MessagesList>

      {messages.length === 0 && !loading && (
        <EmptyState>
          <MessageSquare size={48} />
          <p>No messages found</p>
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

const MessagesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MessageCard = styled.div`
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  opacity: ${props => props.$deleted ? 0.6 : 1};
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
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

const MessageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
`;

const DeleteButton = styled.button`
  padding: 0.5rem;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: #cc0000;
  }
`;

const MessageContent = styled.div`
  color: ${props => props.$deleted ? '#999' : '#333'};
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`;

const DeletedBadge = styled.div`
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: #ffcccc;
  color: #cc0000;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
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

export default AdminMessages;

