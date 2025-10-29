// src/components/ui/Footer.jsx
import React from "react";
import Contact from "./ui/Contact.jsx";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="homepage-footer ">
      <div className="footer-container">
        <Contact />

        <p>
          &copy; 2024 BookLibrary by 9.7nguyenvantuankhanh@gmail.com . All
          rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
