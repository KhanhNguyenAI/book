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
    <header className={`nature-header ${season}`}>
      <div className="nature-header-content">
        {/* Logo với hiệu ứng thiên nhiên */}
        <div className="nature-logo-section">
          <div className="nature-logo-wrapper">
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
        <div className="nature-search-section">
          <div className="nature-search-wrapper">
            <Search className="nature-header-search" />
          </div>
        </div>

        {/* Right Section với theme thiên nhiên */}
        <div className="nature-actions-section">
          {/* User Section */}
          <div className="nature-profile-wrapper">
            <ProfileIco />
          </div>

          {/* Add Book button với theme thiên nhiên */}
          <div className="nature-addbook-wrapper">
            <AddBookIco />
          </div>
        </div>
      </div>

      {/* Nature-inspired border */}
      <div className="nature-header-border"></div>
    </header>
  );
}

export default Header;