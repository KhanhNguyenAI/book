// src/components/sections/CategoriesSection.jsx
import React, { useState, useEffect } from "react";
import "./BookCounter.css"
// Định nghĩa BookCounter component TRONG file này
const BookCounter = () => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const targetNumber = 158464880;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounter();
          }
        });
      },
      { threshold: 0.5 }
    );

    const counterElement = document.querySelector('.book-counter');
    if (counterElement) {
      observer.observe(counterElement);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const animateCounter = () => {
    const duration = 3000;
    const steps = 100;
    const increment = targetNumber / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetNumber) {
        setCount(targetNumber);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);
  };

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="book-counter">
      <div className="counter-card">
        <div className="counter-icon">📚</div>
        <div className="counter-content">
          <div className="counter-number">{formatNumber(count)}</div>
          <div className="counter-label">Books in the World</div>
          <div className="counter-subtitle">And counting...</div>
        </div>
        <div className="counter-glow"></div>
      </div>
    </div>
  );
};

const CategoriesSection = () => {
  const categories = [
    { id: 1, name: "Fiction", icon: "📖" },
    { id: 2, name: "Psychology", icon: "🧠" },
    { id: 3, name: "Science", icon: "🔬" },
    { id: 4, name: "Children's Books", icon: "👶" },
    { id: 5, name: "Self-Help", icon: "💫" },
    { id: 6, name: "Manga", icon: "🎌" },
    { id: 7, name: "Journalism", icon: "📰" }
  ];

  return (
    <section className="section-categories">
      {/* Background Text Layer */}
      <div className="categories-background-layer">
        <div className="bg-quote bg-quote-1">"Books are mirrors"</div>
        <div className="bg-quote bg-quote-2">"Read to live"</div>
        <div className="bg-quote bg-quote-3">"Pages whisper"</div>
        <div className="bg-quote bg-quote-4">"Stories breathe"</div>
        <div className="bg-quote bg-quote-5">"Words dance"</div>
        <div className="bg-quote bg-quote-6">"Imagination flies"</div>
        <div className="bg-quote bg-quote-7">"Knowledge grows"</div>
        <div className="bg-quote bg-quote-8">"Dreams awaken"</div>
      </div>
      
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Explore 7 Literary Worlds</h2>
          <p className="section-subtitle">Dive into our curated collection across diverse genres</p>
        </div>

        {/* Book Counter - BÂY GIỜ ĐÃ ĐƯỢC ĐỊNH NGHĨA */}
        <BookCounter />
        
        <div className="categories-grid-organic">
          {categories.map((category, index) => (
            <div 
              key={category.id} 
              className={`category-card-organic card-${index + 1}`}
              style={{
                '--rotation': `${-5 + (index * 3)}deg`,
                '--delay': `${index * 0.1}s`
              }}
            >
              <div className="category-icon-organic">{category.icon}</div>
              <h3 className="category-name-organic">{category.name}</h3>
              <div className="category-glow"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;