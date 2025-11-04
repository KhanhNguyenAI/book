import React from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";

const Button = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    console.log("🔄 Navigating to /books from logo");
    navigate("/books");
  };

  return (
    <StyledWrapper>
      <div 
        className="nature-logo" 
        onClick={handleLogoClick}
      >
        {/* Main Logo Container */}
        <div className="logo-container">
          {/* Nature Background Elements */}
          <div className="nature-bg">
            <div className="leaf leaf-1">🍃</div>
            <div className="leaf leaf-2">🌿</div>
            <div className="leaf leaf-3">🍂</div>
          </div>
          
          {/* Logo Text with Nature Theme */}
          <div className="logo-text">
            <span className="main-text">Briona</span>
            <span className="sub-text">Library</span>
          </div>
          
          {/* Decorative Book Elements */}
          <div className="book-decoration">
            <div className="book book-1">📖</div>
            <div className="book book-2">📚</div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-3px) rotate(2deg); }
  66% { transform: translateY(2px) rotate(-1deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
`;

const leafFloat1 = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
  25% { transform: translate(2px, -2px) rotate(90deg); opacity: 0.5; }
  50% { transform: translate(0, -4px) rotate(180deg); opacity: 0.3; }
  75% { transform: translate(-2px, -2px) rotate(270deg); opacity: 0.5; }
`;

const leafFloat2 = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.4; }
  33% { transform: translate(-3px, -3px) rotate(120deg); opacity: 0.6; }
  66% { transform: translate(3px, -6px) rotate(240deg); opacity: 0.4; }
`;

const leafFloat3 = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.5; }
  50% { transform: translate(4px, -4px) rotate(180deg); opacity: 0.7; }
`;

const StyledWrapper = styled.div`
  .nature-logo {
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-block;
    position: relative;
    
    &:hover {
      transform: translateY(-2px);
      
      .main-text {
        color: #2d7d32;
        text-shadow: 0 0 10px rgba(45, 125, 50, 0.3);
      }
      
      .book-1 {
        transform: translateX(-5px) rotate(-5deg);
      }
      
      .book-2 {
        transform: translateX(5px) rotate(5deg);
      }
    }
    
    &:active {
      transform: translateY(0px);
    }
  }

  .logo-container {
    position: relative;
    padding: 12px 20px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 248, 255, 0.8));
    border-radius: 16px;
    border: 1.5px solid rgba(129, 178, 20, 0.3);
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    min-width: 180px;
    text-align: center;
    transition: all 0.3s ease;
  }

  .nature-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
    border-radius: 16px;
    
    .leaf {
      position: absolute;
      font-size: 14px;
      opacity: 0.4;
      
      &.leaf-1 {
        top: 5px;
        left: 10px;
        animation: ${leafFloat1} 8s ease-in-out infinite;
      }
      
      &.leaf-2 {
        top: 8px;
        right: 15px;
        animation: ${leafFloat2} 12s ease-in-out infinite;
      }
      
      &.leaf-3 {
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        animation: ${leafFloat3} 10s ease-in-out infinite;
      }
    }
  }

  .logo-text {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .main-text {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.8rem;
    font-weight: 700;
    color: #2d3436;
    background: linear-gradient(135deg, #2d3436 0%, #81b214 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
    transition: all 0.3s ease;
    line-height: 1;
  }

  .sub-text {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    color: #81b214;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    opacity: 0.9;
    line-height: 1;
  }

  .book-decoration {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 15px;
    pointer-events: none;
    z-index: 1;
    
    .book {
      font-size: 16px;
      transition: all 0.4s ease;
      animation: ${float} 4s ease-in-out infinite;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      
      &.book-1 {
        animation-delay: 0s;
      }
      
      &.book-2 {
        animation-delay: 2s;
      }
    }
  }

  /* Hover Effects */
  .nature-logo:hover .logo-container {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.9));
    border-color: rgba(129, 178, 20, 0.5);
    box-shadow: 
      0 8px 30px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .nature-logo:hover .main-text {
    background: linear-gradient(135deg, #81b214 0%, #2d7d32 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nature-logo:hover .sub-text {
    color: #2d7d32;
    animation: ${pulse} 2s ease-in-out infinite;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .logo-container {
      padding: 10px 16px;
      min-width: 160px;
    }

    .main-text {
      font-size: 1.6rem;
    }

    .sub-text {
      font-size: 0.7rem;
      letter-spacing: 1px;
    }

    .book-decoration .book {
      font-size: 14px;
    }

    .nature-bg .leaf {
      font-size: 12px;
    }
  }

  @media (max-width: 480px) {
    .logo-container {
      padding: 8px 12px;
      min-width: 140px;
    }

    .main-text {
      font-size: 1.4rem;
    }

    .sub-text {
      font-size: 0.65rem;
    }

    .book-decoration {
      padding: 0 10px;
      
      .book {
        font-size: 12px;
      }
    }

    .nature-bg .leaf {
      font-size: 10px;
    }
  }

  /* Special animation for first visit */
  @keyframes logoEntrance {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .nature-logo {
    animation: logoEntrance 0.6s ease-out;
  }
`;

export default Button;