import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { adminService } from "../../services/admin";
import { Users, Search, Ban, CheckCircle, Shield, UserX } from "lucide-react";
import Loading from "../../components/ui/Loading";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [banFilter, setBanFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter, banFilter, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        search: searchTerm,
        role: roleFilter,
        is_banned: banFilter
      };
      const response = await adminService.getUsers(params);
      if (response.status === "success") {
        setUsers(response.users);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (userId, currentStatus) => {
    try {
      await adminService.toggleUserBan(userId, { is_banned: !currentStatus });
      fetchUsers();
    } catch (error) {
      console.error("Error toggling ban:", error);
      alert("Failed to update user ban status");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update user role");
    }
  };

  if (loading && users.length === 0) {
    return (
      <PageContainer>
        <Loading />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1>👥 User Management</h1>
        <p>Manage all users in the system</p>
      </PageHeader>

      <FiltersBar>
        <SearchBox>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          />
        </SearchBox>
        <FilterSelect
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </FilterSelect>
        <FilterSelect
          value={banFilter}
          onChange={(e) => {
            setBanFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        >
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
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

      <UsersTable>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>ID</TableHeaderCell>
            <TableHeaderCell>Username</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Created At</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell>
                <UserInfo>
                  {user.avatar_url && (
                    <Avatar src={user.avatar_url} alt={user.username} />
                  )}
                  <span>{user.username}</span>
                </UserInfo>
              </TableCell>
              <TableCell>{user.email || "N/A"}</TableCell>
              <TableCell>
                <RoleBadge $role={user.role}>
                  {user.role === "admin" ? <Shield size={14} /> : <Users size={14} />}
                  <span>{user.role}</span>
                </RoleBadge>
              </TableCell>
              <TableCell>
                {user.is_banned ? (
                  <StatusBadge $status="banned">
                    <Ban size={14} />
                    <span>Banned</span>
                  </StatusBadge>
                ) : (
                  <StatusBadge $status="active">
                    <CheckCircle size={14} />
                    <span>Active</span>
                  </StatusBadge>
                )}
              </TableCell>
              <TableCell>
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "N/A"}
              </TableCell>
              <TableCell>
                <ActionsCell>
                  {user.role !== "admin" && (
                    <RoleSelect
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </RoleSelect>
                  )}
                  <ActionButton
                    $danger={!user.is_banned}
                    onClick={() => handleBanToggle(user.id, user.is_banned)}
                  >
                    {user.is_banned ? (
                      <>
                        <CheckCircle size={14} />
                        Unban
                      </>
                    ) : (
                      <>
                        <Ban size={14} />
                        Ban
                      </>
                    )}
                  </ActionButton>
                </ActionsCell>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </UsersTable>

      {pagination.pages > 1 && (
        <Pagination>
          <PaginationButton
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </PaginationButton>
          <PageInfo>
            Page {pagination.page} of {pagination.pages}
          </PageInfo>
          <PaginationButton
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </PaginationButton>
        </Pagination>
      )}

      {users.length === 0 && !loading && (
        <EmptyState>
          <UserX size={48} />
          <p>No users found</p>
        </EmptyState>
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
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 2rem;
  }

  p {
    color: #7f8c8d;
    font-size: 1rem;
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
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:focus-within {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1rem;
  }

  svg {
    color: #7f8c8d;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid rgb(106, 55, 55);
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color : black;

  &:hover {
    border-color: #3498db;
  }

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
`;

const StatsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const StatItem = styled.div`
  color: #7f8c8d;
  font-weight: 500;
`;

const UsersTable = styled.table`
  width: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  color : black;
`;

const TableHeader = styled.thead`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background: #f8f9fa;
  }

  &:hover {
    background: #e8f4f8;
  }
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableBody = styled.tbody``;

const TableCell = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const RoleBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => props.$role === "admin" ? "#e8f5e9" : "#e3f2fd"};
  color: ${props => props.$role === "admin" ? "#2e7d32" : "#1976d2"};
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => props.$status === "active" ? "#e8f5e9" : "#ffebee"};
  color: ${props => props.$status === "active" ? "#2e7d32" : "#c62828"};
`;

const ActionsCell = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const RoleSelect = styled.select`
  padding: 0.4rem 0.8rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  background: white;
  transition: all 0.3s ease;

  &:hover {
    border-color: #3498db;
  }

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.$danger ? "#ffebee" : "#e8f5e9"};
  color: ${props => props.$danger ? "#c62828" : "#2e7d32"};

  &:hover {
    background: ${props => props.$danger ? "#ffcdd2" : "#c8e6c9"};
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  background: white;
  border: 2px solid #3498db;
  border-radius: 8px;
  color: #3498db;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: #3498db;
    color: white;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.div`
  color: #7f8c8d;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #7f8c8d;

  svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  p {
    font-size: 1.2rem;
    font-weight: 500;
  }
`;

export default AdminUsers;

