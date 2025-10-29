// src/components/sections/FeaturesSection.jsx
import React from "react";
import { Link } from "react-router-dom";

const FeaturesSection = () => {
  const features = [
    {
      id: 1,
      title: "AI Book Assistant",
      description: "Get personalized book recommendations from our smart chatbot",
      icon: "🤖",
      link: "/books"
    },
    {
      id: 2,
      title: "Reading Community",
      description: "Connect with fellow book lovers in our vibrant community",
      icon: "👥",
      link: "/chat"
    },
    {
      id: 3,
      title: "Personal Profile",
      description: "Showcase your reading journey and discover book friends",
      icon: "🌟",
      link: "/profile"
    }
  ];

  return (
    <section className="section-features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">More Than Just Reading</h2>
          <p className="section-subtitle">Experience the future of digital literature</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature) => (
            <Link key={feature.id} to={feature.link} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-arrow">→</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;