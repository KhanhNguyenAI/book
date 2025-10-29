import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UseAuth } from "../../context/AuthContext";
import styled from "styled-components";

const ProfileIco = ({ className }) => {
  const { user, logout } = UseAuth();
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
    navigate("/history");
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
    await logout();
    setIsOpen(false);
  };

  const togglePopup = () => {
    setIsOpen(!isOpen);
  };

  return (
    <StyledWrapper>
      <div className={`template ${className}`} ref={popupRef}>
        <div
          tabIndex={0}
          className={`popup button ${isOpen ? "active" : ""}`}
          style={{
            padding: "0 0.225rem 0",
            borderTopRightRadius: "1.2rem",
            borderBottomRightRadius: "1.2rem",
          }}
          onClick={togglePopup}
        >
          <div className="popup-header">
            <p
              style={{
                letterSpacing: 1,
                fontWeight: 600,
                padding: "0.625rem 0rem 0.625rem 0.825rem",
              }}
            >
              {user?.username || "User"}
            </p>
            <svg
              height={32}
              width={32}
              viewBox="0 0 1024 1024"
              className="icon"
            >
              <path
                fill="#FFCE8B"
                d="M1021.103385 510.551692A510.551692 510.551692 0 1 1 510.551692 0a510.551692 510.551692 0 0 1 510.551693 510.551692"
              />
              <path
                fill="#644646"
                d="M809.99026 493.192935v315.26567H494.979866a317.052601 317.052601 0 0 1-66.626996-7.147724V493.192935z"
              />
              <path d="M494.979866 808.458605h-66.626996v-7.147724a317.052601 317.052601 0 0 0 66.626996 7.147724" />
              <path
                fill="#644646"
                d="M809.99026 493.192935H428.35287v308.117946A315.010394 315.010394 0 0 1 178.693092 493.192935a310.670705 310.670705 0 0 1 21.953723-115.639958A314.755118 314.755118 0 0 1 494.979866 178.693092a308.373222 308.373222 0 0 1 82.96465 11.232138 313.989291 313.989291 0 0 1 232.045744 304.033532"
              />
              <path
                fill="#C7F4F1"
                d="M758.935091 959.581906a510.551692 510.551692 0 0 1-512.338624-9.18993 268.55019 268.55019 0 0 1 512.338624 9.18993"
              />
              <path
                fill="#F7BEA9"
                d="M581.263102 727.02561v86.793788a68.924478 68.924478 0 0 1-137.593681 0v-91.133477a184.309161 184.309161 0 0 0 74.285271 15.571826 178.693092 178.693092 0 0 0 63.30841-11.232137"
              />
              <path
                fill="#FBD1BB"
                d="M700.987474 390.572045v163.121266a195.796574 195.796574 0 0 1-119.724372 183.798609 172.566472 172.566472 0 0 1-137.593681-4.850241 197.072953 197.072953 0 0 1-108.747511-178.693093v-163.376541a189.92523 189.92523 0 0 1 183.032782-195.796574 176.39561 176.39561 0 0 1 129.424854 57.437065 201.667919 201.667919 0 0 1 53.607928 138.359509"
              />
              <path
                fill="#FBD1BB"
                d="M370.405253 553.182759a43.396894 43.396894 0 1 1-43.396894-41.099411 42.37579 42.37579 0 0 1 43.396894 41.099411"
              />
              <path
                fill="#F49F83"
                d="M605.769583 590.963584v2.042207a70.966685 70.966685 0 1 1-141.93337 0v-2.042207"
              />
              <path
                fill="#030303"
                d="M499.064279 517.699416a18.890413 18.890413 0 1 1-18.890412-18.890412 18.890413 18.890413 0 0 1 18.890412 18.890412M619.043927 517.699416a18.890413 18.890413 0 1 1-18.890412-18.890412 18.890413 18.890413 0 0 1 18.890412 18.890412"
              />
              <path
                fill="#644646"
                d="M796.46064 401.038354a224.387469 224.387469 0 0 1-282.590362-28.590894 224.132193 224.132193 0 0 1-312.202359 5.105517A314.755118 314.755118 0 0 1 494.979866 178.693092a308.373222 308.373222 0 0 1 82.96465 11.232138 316.031498 316.031498 0 0 1 218.516124 211.878952"
              />
            </svg>
          </div>

          {/* Popup Menu - Horizontal Navigation */}
          {isOpen && (
            <div className="popup-main">
              <div className="list-box">
                <div className="nav-item" onClick={handleProfileClick}>
                  <span className="item-icon">👤</span>
                  <span className="item-text">Profile</span>
                </div>
                <div className="nav-item" onClick={handleHistoryClick}>
                  <span className="item-icon">📖</span>
                  <span className="item-text">History</span>
                </div>
                <div className="nav-item" onClick={handleBookmarksClick}>
                  <span className="item-icon">🔖</span>
                  <span className="item-text">Bookmarks</span>
                </div>
                <div className="nav-item" onClick={handleChatClick}>
                  <span className="item-icon">💬</span>
                  <span className="item-text">Chat</span>
                </div>
                <div className="divider" />
                <div className="nav-item">
                  <span className="item-icon">⭐</span>
                  <span className="item-text">Ratings</span>
                </div>
                <div className="nav-item">
                  <span className="item-icon">📚</span>
                  <span className="item-text">Favorites</span>
                </div>
                <div className="nav-item">
                  <span className="item-icon">⚙️</span>
                  <span className="item-text">Settings</span>
                </div>
                {/* Admin Menu - only show for admin */}
                {user?.role === "admin" && (
                  <>
                    <div className="divider" />
                    <div className="nav-item admin-item" onClick={handleAdminClick}>
                      <span className="item-icon">🛡️</span>
                      <span className="item-text">Admin</span>
                    </div>
                  </>
                )}
                <div className="divider" />
                <div className="nav-item quit" onClick={handleLogout}>
                  <span className="item-icon">🚪</span>
                  <span className="item-text">Logout</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .template {
    /* ------------------------------------------------------------ */
    /* fill */
    --fill: #0000;
    --fill-hover: hsla(0, 0%, 45%, 0.2);
    --fill-active: hsl(0, 0%, 10%);
    /* txt */
    --txt: #ccc;
    /*-------------------------*/
    --br: 0.625rem;
    --gap: 0.25rem;
    /* ---------------------------------------------------------- */
    display: flex;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    font-size: 0.975rem;
    color: var(--txt);
    position: relative;
  }

  /* button */
  .button {
    position: relative;
    display: inline-block;
    list-style-type: none;
    list-style: none;
    appearance: none;
    outline: 0;
    border: 0;
    cursor: pointer;
    text-decoration: none;
    font-size: inherit;
    color: inherit;
    white-space: nowrap;
    padding: calc(var(--gap) * 2) calc(var(--gap) * 8) calc(var(--gap) * 2)
      calc(var(--gap) * 4);
    text-align: left;
    background-color: var(--fill);
    border-radius: var(--br) calc(var(--br) / 2) calc(var(--br) / 2) var(--br);
    transition: background-color 500ms;
    user-select: none;
  }

  .button:hover {
    background-color: var(--fill-hover);
  }

  .button.quit:hover {
    background-color: #962434;
  }

  .button.admin-item:hover {
    background-color: #2d4d7a;
  }

  .button:focus,
  .button:active,
  .button.active {
    background-color: var(--fill-active);
  }

  /* popup */
  .popup {
    position: relative;
  }

  .popup-header {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: calc(var(--gap) * 3);
  }

  /* Horizontal Navigation Bar */
  .popup-main {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 1rem;
    border-radius: var(--br);
    padding: 0.5rem;
    background-color: hsl(0, 0%, 10%);
    box-shadow: hsl(0, 0%, 12%) 0px 0px 0px 1px, 0 10px 30px rgba(0, 0, 0, 0.5);
    animation: slideDown 0.3s ease-out;
    min-width: max-content;
    z-index: 1000;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .list-box {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    margin: 0;
    flex-wrap: wrap;
  }

  /* QUAN TRỌNG: Sửa hover behavior */
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    border-radius: calc(var(--br) / 2);
    transition: all 0.2s ease;
    min-width: 70px;
    background-color: transparent;
    cursor: pointer;
    position: relative;
    
    /* Đảm bảo tất cả phần tử con không có pointer-events riêng */
    & * {
      pointer-events: none;
    }
  }

  /* Hover effect cho toàn bộ nav-item */
  .nav-item:hover {
    background-color: hsl(0, 0%, 15%);
    transform: translateY(-2px);
    
    /* Hiệu ứng cho icon và text khi hover */
    .item-icon {
      transform: scale(1.1);
    }
    
    .item-text {
      color: #fff;
      font-weight: 500;
    }
  }

  /* Special hover effects */
  .nav-item.quit:hover {
    background-color: #962434;
    
    .item-icon {
      transform: scale(1.2);
    }
  }

  .nav-item.admin-item:hover {
    background-color: #2d4d7a;
    
    .item-icon {
      transform: scale(1.2);
    }
  }

  .item-icon {
    font-size: 1.5rem;
    display: block;
    transition: transform 0.2s ease;
  }

  .item-text {
    font-size: 0.75rem;
    display: block;
    text-align: center;
    transition: all 0.2s ease;
  }

  .divider {
    width: 1px;
    height: 50px;
    background-color: #313131;
    margin: 0 0.5rem;
  }

  /* Active state */
  .nav-item:active {
    transform: translateY(0);
    transition: transform 0.1s ease;
  }

  /* Focus state for accessibility */
  .nav-item:focus {
    outline: 2px solid #4d90fe;
    outline-offset: 2px;
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .popup-main {
      max-width: 90vw;
    }

    .list-box {
      flex-wrap: wrap;
      justify-content: center;
    }

    .divider {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .popup-main {
      position: fixed;
      top: 60px;
      right: 10px;
      left: 10px;
      margin-top: 0;
      max-width: none;
    }

    .list-box {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 0.5rem;
    }

    .nav-item {
      min-width: 60px;
      padding: 0.5rem;
    }

    .item-icon {
      font-size: 1.25rem;
    }

    .item-text {
      font-size: 0.7rem;
    }

    .button {
      padding: calc(var(--gap) * 2) calc(var(--gap) * 4);
    }
  }

  @media (max-width: 480px) {
    .list-box {
      grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      gap: 0.25rem;
    }

    .nav-item {
      padding: 0.4rem 0.25rem;
      min-width: 50px;
    }

    .item-icon {
      font-size: 1.1rem;
    }

    .item-text {
      font-size: 0.65rem;
    }
  }
`;

export default ProfileIco;