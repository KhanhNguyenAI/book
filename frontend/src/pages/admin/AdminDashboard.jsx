import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const AdminDashboard = () => {
  return (
    <Container>
      <Header>
        <h1>🎯 Admin Dashboard</h1>
        <p>Quản lý hệ thống thư viện sách</p>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatIcon>📚</StatIcon>
          <StatNumber>150</StatNumber>
          <StatLabel>Tổng Sách</StatLabel>
          <StatLink to="/admin/books">Quản lý sách →</StatLink>
        </StatCard>

        <StatCard>
          <StatIcon>👥</StatIcon>
          <StatNumber>89</StatNumber>
          <StatLabel>Thành Viên</StatLabel>
          <StatLink to="/admin/users">Quản lý users →</StatLink>
        </StatCard>

        <StatCard>
          <StatIcon>📁</StatIcon>
          <StatNumber>12</StatNumber>
          <StatLabel>Danh Mục</StatLabel>
          <StatLink to="/admin/categories">Quản lý danh mục →</StatLink>
        </StatCard>

        <StatCard>
          <StatIcon>💬</StatIcon>
          <StatNumber>256</StatNumber>
          <StatLabel>Bình Luận</StatLabel>
          <StatLink to="/admin/comments">Xem bình luận →</StatLink>
        </StatCard>
      </StatsGrid>

      <QuickActions>
        <h2>🚀 Hành Động Nhanh</h2>
        <ActionGrid>
          <ActionCard to="/admin/books?action=add">
            <ActionIcon>➕</ActionIcon>
            <ActionText>Thêm Sách Mới</ActionText>
          </ActionCard>

          <ActionCard to="/admin/categories">
            <ActionIcon>📁</ActionIcon>
            <ActionText>Quản Lý Danh Mục</ActionText>
          </ActionCard>

          <ActionCard to="/admin/users">
            <ActionIcon>👥</ActionIcon>
            <ActionText>Quản Lý Users</ActionText>
          </ActionCard>

          <ActionCard to="/books">
            <ActionIcon>👀</ActionIcon>
            <ActionText>Xem Thư Viện</ActionText>
          </ActionCard>
        </ActionGrid>
      </QuickActions>
    </Container>
  );
};

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    color: #333;
    margin-bottom: 0.5rem;
  }

  p {
    color: #666;
    font-size: 1.1rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  border-left: 4px solid #4a90e2;
`;

const StatIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: #666;
  margin-bottom: 1rem;
`;

const StatLink = styled(Link)`
  color: #4a90e2;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const QuickActions = styled.div`
  h2 {
    color: #333;
    margin-bottom: 1.5rem;
    text-align: center;
  }
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const ActionCard = styled(Link)`
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
`;

const ActionIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const ActionText = styled.div`
  font-weight: 500;
  color: #333;
`;

export default AdminDashboard;
