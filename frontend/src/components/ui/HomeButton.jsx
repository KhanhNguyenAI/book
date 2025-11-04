// src/components/ui/HomeButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { FaHome } from "react-icons/fa";

const HomeButton = ({ 
    title = "HOME",
  position = "absolute", 
  top = "16vh", 
  left = "20px",
  showText = true,
  className = "" ,
    nav = '/',
}) => {
  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate(`${nav}`);
  };

  return (
    <HomeButtonWrapper 
      className={`home-button ${className}`}
      onClick={handleHomeClick}
      position={position}
      top={top}
      left={left}
    >
      <FaHome className="home-icon" />
      {showText && <span className="home-text">{title}</span>}
    </HomeButtonWrapper>
  );
};

const HomeButtonWrapper = styled.div`
  position: ${props => props.position};
  top: ${props => props.top};
  left: ${props => props.left};
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #81b214;
  border-radius: 25px;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  color: #2d3436;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    background: #81b214;
    color: white;
  }

  .home-icon {
    font-size: 1.3rem;
  }

  .home-text {
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    padding: 10px 15px;
    
    .home-text {
      display: ${props => props.showText ? 'none' : 'block'};
    }
  }
`;

export default HomeButton;