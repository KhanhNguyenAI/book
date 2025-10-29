import React, { useState, useEffect } from "react";
import { UseAuth } from "../context/AuthContext";
import Logo from "./ui/logo";
import Search from "./ui/Search";
import "./Header.css";
import ProfileIco from "./ui/profileIco.jsx";
import AddBookIco from "./ui/AddBookIco.jsx";

function Header() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [season, setSeason] = useState("spring");
  const { isAuthenticated, user } = UseAuth();

  // Xác định mùa dựa trên tháng hiện tại
  useEffect(() => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) setSeason("spring");
    else if (month >= 6 && month <= 8) setSeason("summer");
    else if (month >= 9 && month <= 11) setSeason("autumn");
    else setSeason("winter");
  }, []);

  console.log("🌿 Header rendering:", {
    isAuthenticated,
    userRole: user?.role,
    user: user,
    season: season
  });

  return (
    <header className={`comic-header ${season}`}>
      <div className="comic-header-content">
        {/* Logo với hiệu ứng thiên nhiên */}
        <div className="comic-logo-section">
          <div className="comic-logo-wrapper">
            <Logo />
            <div className="season-indicator">
              {season === "spring" && "🌸"}
              {season === "summer" && "☀️"}
              {season === "autumn" && "🍁"}
              {season === "winter" && "❄️"}
            </div>
          </div>
        </div>

        {/* Search Bar với style thiên nhiên */}
        <div className="comic-search-section">
          <div className="comic-search-wrapper">
            <Search className="comic-header-search" />
          </div>
        </div>

        {/* Right Section với theme thiên nhiên */}
        <div className="comic-actions-section">
          {/* User Section - CHỈ CẦN ProfileIco */}
          <div className="comic-bubble-wrapper">
            <div className="comic-profile-wrapper">
              <ProfileIco />
              {isAuthenticated && user && (
                <div className="comic-user-badge">
                  <span className="comic-username">{user.username}</span>
                  <span className={`comic-role ${user.role}`}>
                    {user.role === 'admin' ? '👑 ADMIN' : '👤 USER'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Add Book button với theme thiên nhiên */}
          <div className="comic-addbook-wrapper">
            <div className="comic-addbook-bubble">
              <AddBookIco />
            </div>
          </div>
        </div>
      </div>

      {/* Animated nature border */}
      <div className="comic-header-border"></div>
    </header>
  );
}

export default Header;