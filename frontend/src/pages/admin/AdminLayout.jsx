import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import styled from "styled-components";
import HomeButton from "../../components/ui/HomeButton";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Bot, 
  FileText,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { UseAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = UseAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    { path: "/admin", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { path: "/admin/users", icon: <Users size={20} />, label: "Users" },
    { path: "/admin/books", icon: <BookOpen size={20} />, label: "Books" },
    { path: "/admin/messages", icon: <MessageSquare size={20} />, label: "Messages" },
    { path: "/admin/chatbot", icon: <Bot size={20} />, label: "Chatbot" },
    { path: "/admin/reports", icon: <FileText size={20} />, label: "Reports" },
  ];

  return (
    <LayoutContainer>
      
      <SidebarOverlay $isOpen={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <Sidebar $isOpen={sidebarOpen}>
        <SidebarHeader>
          <Logo>📚 Admin Panel</Logo>
          <ToggleButton onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </ToggleButton>
        </SidebarHeader>

        <NavMenu>
          {menuItems.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              $isActive={location.pathname === item.path}
            >
              <IconWrapper>{item.icon}</IconWrapper>
              {sidebarOpen && <NavLabel>{item.label}</NavLabel>}
            </NavItem>
          ))}
        </NavMenu>

        <SidebarFooter>
          <UserInfo>
            {sidebarOpen && (
              <>
                <UserAvatar>
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </UserAvatar>
                <UserDetails>
                  <UserName>{user?.username || "Admin"}</UserName>
                  <UserRole>{user?.role || "admin"}</UserRole>
                </UserDetails>
              </>
            )}
          </UserInfo>
          <LogoutButton onClick={handleLogout}>
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </LogoutButton>
        </SidebarFooter>
      </Sidebar>

      <MainContent $sidebarOpen={sidebarOpen}>
        <Outlet />
        <HomeButton top = "76vh" nav = "/books" left="5vw" />
      </MainContent>
    </LayoutContainer>
  );
};

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
  width: 100vw;
`;

const SidebarOverlay = styled.div`
  display: ${props => props.$isOpen ? 'block' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  transition: opacity 0.3s ease;

  @media (min-width: 768px) {
    display: none;
  }
`;

const Sidebar = styled.aside`
  width: ${props => props.$isOpen ? '280px' : '80px'};
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 1000;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    width: ${props => props.$isOpen ? '280px' : '0'};
    overflow: hidden;
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Logo = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
`;

const ToggleButton = styled.button`
  background: rgb(60, 55, 55);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;


  &:hover {
    background: rgba(177, 39, 39, 0.2);
  }
`;

const NavMenu = styled.nav`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  color: ${props => props.$isActive ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  background: ${props => props.$isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  border-left: 3px solid ${props => props.$isActive ? '#3498db' : 'transparent'};
  text-decoration: none;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
`;

const NavLabel = styled.span`
  font-weight: 500;
`;

const SidebarFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserRole = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: capitalize;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(231, 76, 60, 0.3);
    border-color: rgba(231, 76, 60, 0.5);
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: ${props => props.$sidebarOpen ? '280px' : '80px'};
  transition: margin-left 0.3s ease;
  min-height: 100vh;
  width: calc(100% - ${props => props.$sidebarOpen ? '280px' : '80px'});

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

export default AdminLayout;

