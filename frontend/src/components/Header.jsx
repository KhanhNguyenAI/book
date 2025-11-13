import React, { useState, useEffect, useRef } from "react";
import { UseAuth } from "../context/AuthContext";
import Logo from "./ui/logo";
import Search from "./ui/Search";
import "./Header.css";
import ProfileIco from "./ui/profileIco.jsx";


function Header() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [season, setSeason] = useState("spring");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = UseAuth();
  const mobileMenuRef = useRef(null);

  // Xác định mùa dựa trên tháng hiện tại
  useEffect(() => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) setSeason("spring");
    else if (month >= 6 && month <= 8) setSeason("summer");
    else if (month >= 9 && month <= 11) setSeason("autumn");
    else setSeason("winter");
  }, []);

  // Đóng mobile menu khi click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        // Kiểm tra nếu không phải là hamburger button
        if (!event.target.closest('.mobile-menu-toggle')) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden"; // Ngăn scroll khi menu mở
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);

  // Đóng menu khi resize về desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

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

        {/* Search Bar với style thiên nhiên - Desktop */}
        <div className="nature-search-section desktop-search">
          <div className="nature-search-wrapper">
            <Search className="nature-header-search" />
          </div>
        </div>

        {/* Right Section với theme thiên nhiên - Desktop */}
        <div className="nature-actions-section desktop-actions">
          {/* User Section */}
          <div className="nature-profile-wrapper">
            <ProfileIco />
          </div>

          {/* Add Book button với theme thiên nhiên */}
   
        </div>

        {/* Mobile Menu Toggle Button */}
        <button 
          className={`mobile-menu-toggle ${isMobileMenuOpen ? "active" : ""}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Mobile Menu */}
      <div 
        ref={mobileMenuRef}
        className={`mobile-menu ${isMobileMenuOpen ? "open" : ""}`}
      >
        <div className="mobile-menu-header">
          <div className="mobile-menu-logo">
            <Logo />
            <div className="season-indicator">
              {season === "spring" && "🌸"}
              {season === "summer" && "☀️"}
              {season === "autumn" && "🍁"}
              {season === "winter" && "❄️"}
            </div>
          </div>
          <button 
            className="mobile-menu-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close mobile menu"
          >
            <span>×</span>
          </button>
        </div>

        {/* Search Bar trong Mobile Menu */}
        <div className="mobile-search-section">
          <div className="nature-search-wrapper">
            <Search className="nature-header-search" />
          </div>
        </div>

        {/* Profile Section trong Mobile Menu */}
        <div className="mobile-profile-section">
          <div className="nature-profile-wrapper mobile-profile mobile-profile-wrapper">
            <ProfileIco />
          </div>
        </div>
      </div>

      {/* Nature-inspired border */}
      <div className="nature-header-border"></div>
    </header>
  );
}

export default Header;