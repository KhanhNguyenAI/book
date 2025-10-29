// src/components/sections/QuotesSection.jsx
import React from "react";

const QuotesSection = () => {
  const quotes = [
    {
      id: 1,
      text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
      author: "Dr. Seuss",
      avatar: "👨‍⚕️"
    },
    {
      id: 2,
      text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
      author: "George R.R. Martin",
      avatar: "⚔️"
    },
    {
      id: 3,
      text: "Books are a uniquely portable magic.",
      author: "Stephen King",
      avatar: "👑"
    }
  ];

  return (
    <section className="section-quotes">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Words That Inspire</h2>
          <p className="section-subtitle">Timeless wisdom from literary greats</p>
        </div>
        
        <div className="quotes-grid">
          {quotes.map((quote) => (
            <div key={quote.id} className="quote-card">
              <div className="quote-content">
                <div className="quote-text">"{quote.text}"</div>
                <div className="quote-author">
                  <div className="author-avatar">{quote.avatar}</div>
                  <div className="author-info">
                    <div className="author-name">{quote.author}</div>
                    <div className="author-title">Author</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuotesSection;