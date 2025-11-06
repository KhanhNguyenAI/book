import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { adminService } from "../../services/admin";
import { AlertTriangle, Search, CheckCircle, XCircle, User, Calendar, MessageSquare } from "lucide-react";
import Loading from "../../components/ui/Loading";

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchReports();
  }, [pagination.page, statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        status: statusFilter
      };
      const response = await adminService.getReports(params);
      if (response.status === "success") {
        setReports(response.reports);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId, action) => {
    const actionText = {
      delete_message: "delete the message",
      keep_message: "keep the message",
      dismiss: "dismiss the report"
    }[action] || action;

    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;

    try {
      await adminService.resolveReport(reportId, action);
      fetchReports();
    } catch (error) {
      console.error("Error resolving report:", error);
      alert("Failed to resolve report");
    }
  };

  if (loading && reports.length === 0) {
    return (
      <PageContainer>
        <Loading />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1>🚨 Message Reports</h1>
        <p>Review and resolve reported messages</p>
      </PageHeader>

      <FiltersBar>
        <FilterSelect
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </FilterSelect>
      </FiltersBar>

      <StatsBar>
        <StatItem>
          <span>Total: {pagination.total}</span>
        </StatItem>
        <StatItem>
          <span>Pending: {reports.filter(r => r.status === 'pending').length}</span>
        </StatItem>
        <StatItem>
          <span>Page {pagination.page} of {pagination.pages}</span>
        </StatItem>
      </StatsBar>

      <ReportsList>
        {reports.map((report) => (
          <ReportCard key={report.id} $status={report.status}>
            <ReportHeader>
              <ReportInfo>
                <StatusBadge $status={report.status}>
                  {report.status === 'pending' ? (
                    <>
                      <AlertTriangle size={14} />
                      Pending
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Resolved
                    </>
                  )}
                </StatusBadge>
                <ReportMeta>
                  <Calendar size={12} />
                  <span>Reported: {new Date(report.created_at).toLocaleString()}</span>
                  {report.resolved_at && (
                    <>
                      <span>•</span>
                      <span>Resolved: {new Date(report.resolved_at).toLocaleString()}</span>
                    </>
                  )}
                </ReportMeta>
              </ReportInfo>
            </ReportHeader>

            <ReportContent>
              <Section>
                <SectionTitle>
                  <User size={14} />
                  Reporter
                </SectionTitle>
                <SectionText>{report.reporter?.username || "Unknown"}</SectionText>
              </Section>

              <Section>
                <SectionTitle>
                  <AlertTriangle size={14} />
                  Reason
                </SectionTitle>
                <ReasonText>{report.reason || "No reason provided"}</ReasonText>
              </Section>

              {report.message && (
                <Section>
                  <SectionTitle>
                    <MessageSquare size={14} />
                    Reported Message
                  </SectionTitle>
                  <MessageCard>
                    <MessageHeader>
                      <span>From: {report.message.user?.username || "Unknown"}</span>
                      <span>ID: {report.message.id}</span>
                    </MessageHeader>
                    <MessageContent>{report.message.content}</MessageContent>
                  </MessageCard>
                </Section>
              )}

              {report.resolved_by && (
                <Section>
                  <SectionTitle>Resolved By</SectionTitle>
                  <SectionText>{report.resolved_by.username}</SectionText>
                </Section>
              )}
            </ReportContent>

            {report.status === 'pending' && (
              <ReportActions>
                <ActionButton
                  $danger
                  onClick={() => handleResolve(report.id, 'delete_message')}
                >
                  <XCircle size={16} />
                  Delete Message
                </ActionButton>
                <ActionButton
                  onClick={() => handleResolve(report.id, 'keep_message')}
                >
                  <CheckCircle size={16} />
                  Keep Message
                </ActionButton>
                <ActionButton
                  $secondary
                  onClick={() => handleResolve(report.id, 'dismiss')}
                >
                  Dismiss
                </ActionButton>
              </ReportActions>
            )}
          </ReportCard>
        ))}
      </ReportsList>

      {reports.length === 0 && !loading && (
        <EmptyState>
          <AlertTriangle size={48} />
          <p>No reports found</p>
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
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  color : black;
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

const ReportsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ReportCard = styled.div`
  background: white;
  border: 2px solid ${props => props.$status === 'pending' ? '#ffc107' : '#28a745'};
  border-radius: 8px;
  padding: 1.5rem;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ReportHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
`;

const ReportInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  width: fit-content;
  background: ${props => props.$status === 'pending' ? '#fff3cd' : '#d4edda'};
  color: ${props => props.$status === 'pending' ? '#856404' : '#155724'};
`;

const ReportMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
`;

const ReportContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #333;
  font-size: 0.875rem;
`;

const SectionText = styled.div`
  color: #666;
`;

const ReasonText = styled.div`
  padding: 1rem;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
  color: #856404;
  font-weight: 500;
`;

const MessageCard = styled.div`
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
`;

const MessageContent = styled.div`
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ReportActions = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  background: ${props => 
    props.$danger ? '#dc3545' : 
    props.$secondary ? '#6c757d' : 
    '#28a745'};
  color: white;
  
  &:hover {
    background: ${props => 
      props.$danger ? '#c82333' : 
      props.$secondary ? '#5a6268' : 
      '#218838'};
  }
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

export default AdminReports;

