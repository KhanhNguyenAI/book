import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UseAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import styled, { keyframes } from "styled-components";

const ProfileIco = ({ className }) => {
  const { user, logout } = UseAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    navigate("/profile");
    setIsOpen(false);
  };

  const handleHistoryClick = () => {
    navigate("/users/history");
    setIsOpen(false);
  };

  const handleBookmarksClick = () => {
    navigate("/bookmarks");
    setIsOpen(false);
  };

  const handleChatClick = () => {
    navigate("/chat");
    setIsOpen(false);
  };

  const handleAdminClick = () => {
    navigate("/admin");
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      console.log("Starting logout process...");
      await logout();
      console.log("Logout successful");
      setIsOpen(false);
      navigate("/", { replace: true });
      console.log("Navigated to homepage");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsOpen(false);
      navigate("/", { replace: true });
    }
  };

  const togglePopup = () => {
    setIsOpen(!isOpen);
  };

  return (
    <StyledWrapper>
      <div className={`nature-profile ${className}`} ref={popupRef}>
        <div
          className={`profile-trigger ${isOpen ? "active" : ""}`}
          onClick={togglePopup}
        >
          <div className="profile-avatar">
            <div className="avatar-icon">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="online-indicator"></div>
          </div>
          
          <div className="profile-info">
            <span className="username">{user?.username || "User"}</span>
            <span className={`role ${user?.role}`}>
              {user?.role === 'admin' ? '👑 Admin' : '👤 Reader'}
            </span>
          </div>

          <div className={`dropdown-arrow ${isOpen ? "open" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        {/* Nature-inspired Dropdown Menu */}
        {isOpen && (
          <div className="nature-dropdown">
            <div className="dropdown-header">
              <div className="user-welcome">
                <span className="welcome-text">Welcome back,</span>
                <span className="welcome-name">{user?.username}</span>
              </div>
              <div className="nature-decoration">
                <div className="leaf">🍃</div>
                <div className="leaf">🌿</div>
              </div>
            </div>

            <div className="dropdown-content">
              <div className="nav-section">
                <h4 className="section-title" >{t("readingJourney")}</h4>
                <div className="nav-grid">
                  <div className="nav-item" onClick={handleProfileClick}>
                    <div className="nav-icon">👤</div>
                    <div className="nav-text">{t("profile")}</div>
                  </div>
                  <div className="nav-item" onClick={handleHistoryClick}>
                    <div className="nav-icon">📖</div>
                    <div className="nav-text">{t("history")}</div>
                  </div>
                  <div className="nav-item" onClick={handleBookmarksClick}>
                    <div className="nav-icon">🔖</div>
                    <div className="nav-text">{t("bookmarks")}</div>
                  </div>
                  <div className="nav-item" onClick={handleChatClick}>
                    <div className="nav-icon">💬</div>
                    <div className="nav-text">{t("chat")}</div>
                  </div>
                </div>
              </div>

              <div className="nav-section">
                <h4 className="section-title">{t("library")}</h4>
                <div className="nav-grid">
                  <div className="nav-item" onClick={() => { navigate("/favorites"); setIsOpen(false); }}>
                    <div className="nav-icon">📚</div>
                    <div className="nav-text">{t("favorites")}</div>
                  </div>
                  <div className="nav-item" onClick={() => { navigate("/settings"); setIsOpen(false); }}>
                    <div className="nav-icon">⚙️</div>
                    <div className="nav-text">{t("settings")}</div>
                  </div>
                </div>
              </div>

              {/* Admin Section */}
              {user?.role === "admin" && (
                <div className="nav-section admin-section">
                  <h4 className="section-title">{t("administration")}</h4>
                  <div className="nav-grid">
                    <div className="nav-item admin-item" onClick={handleAdminClick}>
                      <div className="nav-icon">🛡️</div>
                      <div className="nav-text">{t("adminPanel")}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="dropdown-footer">
                <div className="nav-item quit" onClick={handleLogout}>
                  <div className="nav-icon">🚪</div>
                  <div className="nav-text">{t("logout")}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

// Animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const leafFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(5deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const StyledWrapper = styled.div`
  z-index: 101;

  .nature-profile {
    position: relative;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  /* Profile Trigger */
  .profile-trigger {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.9);
    border: 1.5px solid rgba(129, 178, 20, 0.3);
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
    min-width: 180px;

    &:hover {
      background: rgba(255, 255, 255, 0.95);
      border-color: rgba(129, 178, 20, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    }

    &.active {
      background: rgba(255, 255, 255, 0.98);
      border-color: rgba(129, 178, 20, 0.6);
    }
  }

  .profile-avatar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #81b214, #4caf50);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(129, 178, 20, 0.3);
  }

  .online-indicator {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    background: #4caf50;
    border: 2px solid white;
    border-radius: 50%;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
  }

  .username {
    font-weight: 600;
    color: #2d3436;
    font-size: 14px;
  }

  .role {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(129, 178, 20, 0.1);
    color: #2d3436;
    border: 1px solid rgba(129, 178, 20, 0.2);

    &.admin {
      background: rgba(255, 193, 7, 0.15);
      color: #b38b00;
      border-color: rgba(255, 193, 7, 0.3);
    }
  }

  .dropdown-arrow {
    transition: transform 0.3s ease;
    color: #81b214;

    &.open {
      transform: rotate(180deg);
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }

  /* Nature Dropdown */
  .nature-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    border: 1.5px solid rgba(129, 178, 20, 0.3);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    animation: ${fadeInUp} 0.3s ease;
    min-width: 280px;
    z-index: 1000;
    overflow: hidden;
  }

  .dropdown-header {
    padding: 20px;
    background: linear-gradient(135deg, rgba(129, 178, 20, 0.1), rgba(76, 175, 80, 0.05));
    border-bottom: 1px solid rgba(129, 178, 20, 0.2);
    position: relative;
  }

  .user-welcome {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .welcome-text {
    font-size: 12px;
    color: #636e72;
    font-weight: 500;
  }

  .welcome-name {
    font-size: 16px;
    font-weight: 600;
    color: #2d3436;
  }

  .nature-decoration {
    position: absolute;
    top: 15px;
    right: 20px;

    .leaf {
      font-size: 16px;
      opacity: 0.6;
      animation: ${leafFloat} 3s ease-in-out infinite;

      &:nth-child(2) {
        animation-delay: 1.5s;
        margin-left: 5px;
      }
    }
  }

.dropdown-content {
    padding: 16px;
    background-image: url('./pfbg.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: local;
    /* Đảm bảo nội dung vẫn dễ đọc trên background */
    position: relative;
}

/* Nếu background làm chữ khó đọc, thêm overlay */
.dropdown-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3); /* overlay tối */
    z-index: -1;
}

  .nav-section {
    margin-bottom: 20px;

    &:last-of-type {
      margin-bottom: 0;
    }
  }

.section-title {
    font-size: 12px;
    font-weight: 900; /* hoặc 800, 900 cho đậm nhất */
    color: #81b214;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    padding-left: 8px;
}

  .nav-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(129, 178, 20, 0.1);

    &:hover {
      background: rgba(129, 178, 20, 0.1);
      border-color: rgba(129, 178, 20, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

      .nav-icon {
        transform: scale(1.1);
        animation: ${pulse} 0.6s ease;
      }
    }

    &.quit:hover {
      background: rgba(244, 67, 54, 0.1);
      border-color: rgba(244, 67, 54, 0.3);
    }

    &.admin-item:hover {
      background: rgba(255, 193, 7, 0.1);
      border-color: rgba(255, 193, 7, 0.3);
    }
  }

  .nav-icon {
    font-size: 20px;
    transition: all 0.3s ease;
  }

  .nav-text {
    font-size: 12px;
    font-weight: 500;
    color: #2d3436;
    text-align: center;
  }

  .admin-section {
    .section-title {
      color: #ff9800;
    }
  }

.dropdown-footer {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.dropdown-footer .nav-item.quit {
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(229, 57, 53, 0.1));
    border: 1.5px solid rgba(244, 67, 54, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    transition: all 0.3s ease;
    flex-direction: row;
    justify-content: center;
    gap: 12px;
    backdrop-filter: blur(10px);
}

.dropdown-footer .nav-item.quit:hover {
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.25), rgba(229, 57, 53, 0.2));
    border-color: rgba(244, 67, 54, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(244, 67, 54, 0.25);
}

.dropdown-footer .nav-item.quit:active {
    transform: translateY(0);
}

.dropdown-footer .nav-item.quit .nav-icon {
    font-size: 18px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.dropdown-footer .nav-item.quit .nav-text {
    font-size: 14px;
    font-weight: 600;
    color: #f44336;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.dropdown-footer .nav-item.quit:hover .nav-text {
    color: #d32f2f;
}

/* Thêm hiệu ứng pulse cho logout */
@keyframes gentlePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.dropdown-footer .nav-item.quit:hover .nav-icon {
    animation: gentlePulse 1s ease-in-out;
}

  /* Responsive Design */
  @media (max-width: 768px) {
    .profile-trigger {
      min-width: auto;
      padding: 6px 12px;
    }

    .username {
      display: none;
    }

    .role {
      display: none;
    }

    .nature-dropdown {
      position: fixed;
      top: 70px;
      right: 10px;
      left: 10px;
      margin-top: 0;
    }

    .nav-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 480px) {
    .profile-trigger {
      padding: 4px 8px;
    }

    .avatar-icon {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }

    .nature-dropdown {
      min-width: auto;
    }

    .nav-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .nav-item {
      padding: 10px 8px;
    }

    .nav-icon {
      font-size: 18px;
    }

    .nav-text {
      font-size: 11px;
    }
  }
`;

export default ProfileIco;