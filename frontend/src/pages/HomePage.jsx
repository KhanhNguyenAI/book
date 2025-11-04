// src/pages/HomePage.jsx
import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { UseAuth } from "../context/AuthContext";
import "./HomePage.css";

// Lazy load các sections
const CategoriesSection = lazy(() => import('../components/sections/CategoriesSection'));
const QuotesSection = lazy(() => import('../components/sections/QuotesSection'));
const FeaturesSection = lazy(() => import('../components/sections/FeaturesSection'));
const CTASection = lazy(() => import('../components/sections/CTASection'));

// Loading component
const SectionLoader = () => (
  <div className="section-loader">
    <div className="loader-spinner">📚</div>
    <p>Loading wonderful content...</p>
  </div>
);

function HomePage() {
  const { isAuthenticated, user } = UseAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [visibleSections, setVisibleSections] = useState({
    categories: false,
    quotes: false,
    features: false,
    cta: false
  });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth) * 100;
    const y = (clientY / window.innerHeight) * 100;
    setMousePosition({ x, y });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    
    // Intersection Observer để lazy load sections
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            setVisibleSections(prev => ({
              ...prev,
              [sectionId]: true
            }));
            observer.unobserve(entry.target);
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Load trước khi vào viewport 50px
      }
    );

    // Observe các sections
    const sections = ['categories', 'quotes', 'features', 'cta'];
    sections.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) observer.observe(element);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  // Tạo style object cho hiệu ứng nước
  const waterStyle = {
    '--mouse-x': `${mousePosition.x}%`,
    '--mouse-y': `${mousePosition.y}%`
  };

  return (
    <div className="homepage-sanctuary">
      {/* Navigation */}
      <nav className="nav-glass">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">Briona</span>
          </div>
          <div className="nav-actions">
            {isAuthenticated ? (
              <Link to="/profile" className="user-pill">
                <div className="user-avatar-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span>Hi, {user?.username}</span>
              </Link>
            ) : (
              <div className="auth-buttons">
                <Link to="/auth/login" className="btn-nav-login">Sign In</Link>
                <Link to="/auth/register" className="btn-nav-primary">Join Free</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Luôn load đầu tiên */}
      <section 
        className="hero-lake" 
        style={waterStyle}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="welcome-glass">
            {isAuthenticated ? (
              <>
                <h1 className="hero-title">
                  Welcome back to your <span className="text-gradient">sanctuary</span>
                </h1>
                <p className="hero-subtitle">
                  Continue your journey through stories, {user?.username}
                </p>
                {user?.role === 'admin' && (
                  <div className="admin-badge-glass">Library Curator</div>
                )}
              </>
            ) : (
              <>
                <h1 className="hero-title">
                  Your Literary <span className="text-gradient">Sanctuary</span> Awaits
                </h1>
                <p className="hero-subtitle">
                  Discover thousands of free books and join a community of passionate readers
                </p>
              </>
            )}
            
            <div className="hero-actions">
              <Link to="/books" className="btn-hero-primary">
                <span className="btn-icon">📚</span>
                Explore Library
              </Link>
              {!isAuthenticated && (
                <Link to="/auth/register" className="btn-hero-secondary">
                  <span className="btn-icon">🌟</span>
                  Join Community
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Hiệu ứng gợn sóng */}
        <div className="water-ripple"></div>
      </section>

      {/* Lazy Loaded Sections với Intersection Observer */}
      
      {/* Categories Section */}
      <section id="categories" className="section-placeholder">
        {visibleSections.categories && (
          <Suspense fallback={<SectionLoader />}>
            <CategoriesSection />
          </Suspense>
        )}
      </section>

      {/* Quotes Section */}
      <section id="quotes" className="section-placeholder">
        {visibleSections.quotes && (
          <Suspense fallback={<SectionLoader />}>
            <QuotesSection />
          </Suspense>
        )}
      </section>

      {/* Features Section */}
      <section id="features" className="section-placeholder">
        {visibleSections.features && (
          <Suspense fallback={<SectionLoader />}>
            <FeaturesSection />
          </Suspense>
        )}
      </section>

      {/* CTA Section */}
      <section id="cta" className="section-placeholder">
        {visibleSections.cta && (
          <Suspense fallback={<SectionLoader />}>
            <CTASection />
          </Suspense>
        )}
      </section>
    </div>
  );
}

export default HomePage;