import React from "react";
import { Link } from "react-router-dom";
import Contact from "./ui/Contact.jsx";
import "./Footer.css";

const EXPLORE_LINKS = [
  { to: "/books", label: "Library" },
  { to: "/profile/favorites", label: "Favorites" },
  { to: "/profile/bookmarks", label: "Bookmarks" },
  { to: "/chat", label: "Chat" },
];

const SUPPORT_LINKS = [
  { to: "/settings", label: "Settings" },
  { to: "/profile", label: "Profile" },
  { to: "/profile/history", label: "Reading History" },
  { href: "mailto:9.7nguyenvantuankhanh@gmail.com", label: "Contact" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="homepage-footer">
      <div className="footer-background" aria-hidden="true">
        <span className="footer-glow footer-glow-1" />
        <span className="footer-glow footer-glow-2" />
        <span className="footer-glow footer-glow-3" />
        <div className="footer-horizon" />
        <div className="footer-fireflies">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo" aria-hidden="true">
              <span>📚</span>
            </div>
            <div>
              <h3>BookLibrary</h3>
              <p>
                A tranquil digital library—where knowledge, inspiration, and the
                stories you cherish are lovingly preserved.
              </p>
            </div>
          </div>

          <div className="footer-columns">
            <div className="footer-column">
              <h4>Explore</h4>
              <ul>
                {EXPLORE_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-column">
              <h4>Support</h4>
              <ul>
                {SUPPORT_LINKS.map((item) =>
                  item.href ? (
                    <li key={item.label}>
                      <a href={item.href}>{item.label}</a>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <Link to={item.to}>{item.label}</Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="footer-column footer-social">
              <h4>Connect</h4>
              <p>Find us on social channels and share your reading inspiration.</p>
              <Contact />
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {currentYear} BookLibrary · Crafted by{" "}
            <a href="mailto:9.7nguyenvantuankhanh@gmail.com">KhanhNguyenAI</a>
          </p>
          <div className="footer-legal">
            <Link to="/terms">Terms</Link>
            <span aria-hidden="true">•</span>
            <Link to="/privacy">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
