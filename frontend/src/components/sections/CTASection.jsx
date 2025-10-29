// src/components/sections/CTASection.jsx
import React from "react";
import { Link } from "react-router-dom";
import { UseAuth } from "../../context/AuthContext";

const CTASection = () => {
  const { isAuthenticated } = UseAuth();

  return (
    <section className="section-cta">
      <div className="container">
        <div className="cta-glass">
          <h2 className="cta-title">
            {isAuthenticated ? "Ready to Continue Your Journey?" : "Ready to Start Reading?"}
          </h2>
          <p className="cta-subtitle">
            {isAuthenticated
              ? "Discover new stories and continue your adventure"
              : "Join thousands of readers in our growing literary community"
            }
          </p>
          <div className="cta-actions">
            <Link to="/books" className="btn-cta-primary">
              {isAuthenticated ? "Explore More Books" : "Start Reading Free"}
            </Link>
            {!isAuthenticated && (
              <Link to="/register" className="btn-cta-secondary">
                Create Account
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;