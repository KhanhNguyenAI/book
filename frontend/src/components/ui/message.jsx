import React from "react";
import styled, { keyframes } from "styled-components";

const Message = ({ 
  title, 
  message, 
  imageUrl, 
  imageAlt = "Nature image",
  theme = "forest" // forest, ocean, mountain, sunset, garden
}) => {
  return (
    <StyledWrapper theme={theme}>
      <div className={`nature-card ${theme}`}>
        {/* Background Nature Scene */}
        <div className="nature-background">
          <img src={imageUrl} alt={imageAlt} />
          <div className="nature-overlay" />
          
          {/* Animated Elements */}
          <div className="floating-leaves">
            <div className="leaf">🍃</div>
            <div className="leaf">🌿</div>
            <div className="leaf">🍂</div>
          </div>
          
          <div className="sparkles">
            <div className="sparkle">✨</div>
            <div className="sparkle">⭐</div>
            <div className="sparkle">💫</div>
          </div>
        </div>

        {/* Content Card - Appears from nature */}
        <div className="content-nest">
          <div className="nest-decoration">
            <div className="twig"></div>
            <div className="twig"></div>
            <div className="twig"></div>
          </div>
          
          <div className="content-egg">
            <div className="egg-inner">
              <h3 className="nature-title">{title}</h3>
              <p className="nature-wisdom">{message}</p>
              
              <div className="nature-footer">
                <div className="season-marker">
                  {getSeasonEmoji(theme)}
                </div>
                <div className="earth-element">
                  {getElementEmoji(theme)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nature Effects */}
        <div className="nature-glow" />
        <div className="breeze-effect" />
      </div>
    </StyledWrapper>
  );
};

// Helper functions for nature themes
const getSeasonEmoji = (theme) => {
  const emojis = {
    forest: "🌳",
    ocean: "🌊", 
    mountain: "⛰️",
    sunset: "🌅",
    garden: "🌸"
  };
  return emojis[theme] || "🌍";
};

const getElementEmoji = (theme) => {
  const elements = {
    forest: "🌱",
    ocean: "💧",
    mountain: "🪨", 
    sunset: "🔥",
    garden: "🐝"
  };
  return elements[theme] || "🌬️";
};

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
`;

const leafFall = keyframes`
  0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
`;

const sparkleTwinkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const nestAppear = keyframes`
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  80% { transform: scale(1.1) rotate(2deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const eggHatch = keyframes`
  0% { transform: scale(0.8) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
`;

const breeze = keyframes`
  0% { transform: translateX(-10px) skewX(0deg); }
  50% { transform: translateX(10px) skewX(2deg); }
  100% { transform: translateX(-10px) skewX(0deg); }
`;

const StyledWrapper = styled.div`
  .nature-card {
    position: relative;
    width: 300px;
    height: 400px;
    border-radius: 24px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    border: 2px solid;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);

    /* Theme Colors */
    &.forest {
      border-color: #2d5016;
      .nature-background { background: linear-gradient(135deg, #1a2f0d, #3a5f2a); }
    }
    
    &.ocean {
      border-color: #1e40af;
      .nature-background { background: linear-gradient(135deg, #1e3a8a, #3b82f6); }
    }
    
    &.mountain {
      border-color: #475569;
      .nature-background { background: linear-gradient(135deg, #334155, #64748b); }
    }
    
    &.sunset {
      border-color: #dc2626;
      .nature-background { background: linear-gradient(135deg, #7c2d12, #ea580c); }
    }
    
    &.garden {
      border-color: #7c3aed;
      .nature-background { background: linear-gradient(135deg, #5b21b6, #a855f7); }
    }

    &:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
    }
  }

  /* Nature Background */
  .nature-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.8s ease;
    }

    .nature-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        135deg,
        rgba(0, 0, 0, 0.2) 0%,
        rgba(0, 0, 0, 0.4) 50%,
        rgba(0, 0, 0, 0.7) 100%
      );
      transition: all 0.5s ease;
    }
  }

  /* Animated Leaves */
  .floating-leaves {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;

    .leaf {
      position: absolute;
      font-size: 1.2rem;
      animation: ${leafFall} 8s infinite linear;
      
      &:nth-child(1) {
        left: 10%;
        animation-delay: 0s;
        animation-duration: 10s;
      }
      &:nth-child(2) {
        left: 50%;
        animation-delay: 2s;
        animation-duration: 12s;
      }
      &:nth-child(3) {
        left: 80%;
        animation-delay: 4s;
        animation-duration: 9s;
      }
    }
  }

  /* Sparkles */
  .sparkles {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;

    .sparkle {
      position: absolute;
      font-size: 1rem;
      animation: ${sparkleTwinkle} 3s infinite ease-in-out;
      
      &:nth-child(1) {
        top: 20%;
        left: 20%;
        animation-delay: 0s;
      }
      &:nth-child(2) {
        top: 60%;
        left: 70%;
        animation-delay: 1s;
      }
      &:nth-child(3) {
        top: 40%;
        left: 40%;
        animation-delay: 2s;
      }
    }
  }

  /* Content Nest */
  .content-nest {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    z-index: 10;
  }

  .nest-decoration {
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 20px;
    display: flex;
    justify-content: space-around;
    
    .twig {
      width: 4px;
      height: 15px;
      background: #8b4513;
      border-radius: 2px;
      opacity: 0.7;
      
      &:nth-child(1) { transform: rotate(-15deg); }
      &:nth-child(2) { transform: rotate(0deg); height: 18px; }
      &:nth-child(3) { transform: rotate(15deg); }
    }
  }

  .content-egg {
    background: rgba(255, 253, 240, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 18px;
    padding: 25px;
    border: 2px solid rgba(139, 69, 19, 0.3);
    box-shadow: 
      0 10px 30px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    transform: scale(0);
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    
    .egg-inner {
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.4s ease 0.1s;
    }
  }

  /* Nature Glow Effect */
  .nature-glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle at center,
      rgba(34, 197, 94, 0.1) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  /* Breeze Effect */
  .breeze-effect {
    position: absolute;
    top: 0;
    left: -10%;
    width: 120%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    transform: skewX(-10deg);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  /* Hover Effects */
  .nature-card:hover {
    .nature-background {
      img {
        transform: scale(1.1);
      }
      
      .nature-overlay {
        background: linear-gradient(
          135deg,
          rgba(0, 0, 0, 0.3) 0%,
          rgba(0, 0, 0, 0.5) 50%,
          rgba(0, 0, 0, 0.8) 100%
        );
      }
    }

    .content-egg {
      transform: scale(1);
      animation: ${nestAppear} 0.6s ease;
      
      .egg-inner {
        opacity: 1;
        transform: translateY(0);
        animation: ${eggHatch} 0.5s ease 0.2s both;
      }
    }

    .nature-glow {
      opacity: 1;
    }

    .breeze-effect {
      opacity: 1;
      animation: ${breeze} 3s infinite ease-in-out;
    }
  }

  /* Typography */
  .nature-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 12px 0;
    line-height: 1.2;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .nature-wisdom {
    font-size: 0.9rem;
    color: #4b5563;
    line-height: 1.5;
    margin: 0 0 20px 0;
    text-align: center;
    font-style: italic;
  }

  .nature-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 15px;

    .season-marker,
    .earth-element {
      font-size: 1.2rem;
      animation: ${float} 3s infinite ease-in-out;
    }

    .season-marker {
      animation-delay: 0s;
    }

    .earth-element {
      animation-delay: 1.5s;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .nature-card {
      width: 280px;
      height: 380px;
    }

    .content-egg {
      padding: 20px;
    }

    .nature-title {
      font-size: 1.3rem;
    }

    .nature-wisdom {
      font-size: 0.85rem;
    }
  }

  @media (max-width: 480px) {
    .nature-card {
      width: 260px;
      height: 360px;
    }

    .content-egg {
      padding: 18px;
    }

    .nature-title {
      font-size: 1.2rem;
    }
  }
`;

export default Message;