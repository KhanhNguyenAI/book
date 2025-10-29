import React from "react";
import styled, { keyframes } from "styled-components";

const Loading = () => {
  return (
    <StyledWrapper>
      {/* Background Overlay */}
      <div className="background-overlay"></div>

      {/* Main Content */}
      <div className="loading-container">
        {/* Animated Dog */}
        <div className="dog-container">
          <div className="dog">
            <div className="dog__paws">
              <div className="dog__bl-leg leg">
                <div className="dog__bl-paw paw" />
                <div className="dog__bl-top top" />
              </div>
              <div className="dog__fl-leg leg">
                <div className="dog__fl-paw paw" />
                <div className="dog__fl-top top" />
              </div>
              <div className="dog__fr-leg leg">
                <div className="dog__fr-paw paw" />
                <div className="dog__fr-top top" />
              </div>
            </div>
            <div className="dog__body">
              <div className="dog__tail" />
            </div>
            <div className="dog__head">
              <div className="dog__snout">
                <div className="dog__eyes">
                  <div className="dog__eye-l" />
                  <div className="dog__eye-r" />
                </div>
              </div>
            </div>
            <div className="dog__head-c">
              <div className="dog__ear-r" />
              <div className="dog__ear-l" />
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="loading-text">
          <h1 className="library-name">Briona Library</h1>
          <p className="loading-message">Loading your reading adventure...</p>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <div className="progress-text"></div>
          </div>
        </div>

        {/* Floating Books Animation */}
        <div className="floating-books">
          <div className="book book-1">📘</div>
          <div className="book book-2">📗</div>
          <div className="book book-3">📕</div>
          <div className="book book-4">📙</div>
        </div>

        {/* Quote */}
        <div className="quote-container">
          <p className="quote">
            "The more that you read, the more things you will know."
          </p>
          <p className="author">- Dr. Seuss</p>
        </div>
      </div>
    </StyledWrapper>
  );
};

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const progress = keyframes`
  0% { width: 0%; }
  100% { width: 100%; }
`;

const typing = keyframes`
  from { width: 0; }
  to { width: 100%; }
`;

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const StyledWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 9999;
  overflow: hidden;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;

  .background-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
    z-index: 1;
  }

  .loading-container {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    max-width: 90%;
    text-align: center;
  }

  .dog-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
  }

  .main {
    position: relative;
    width: 23.5vmin;
    height: 23.5vmin;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .leg {
    position: absolute;
    bottom: 0;
    width: 2vmin;
    height: 2.125vmin;
  }

  .paw {
    position: absolute;
    bottom: 2px;
    left: 0;
    width: 1.95vmin;
    height: 1.8vmin;
    overflow: hidden;
  }

  .paw::before {
    content: "";
    position: absolute;
    width: 5vmin;
    height: 3vmin;
    border-radius: 50%;
  }

  .top {
    position: absolute;
    bottom: 0;
    left: 0.75vmin;
    height: 4.5vmin;
    width: 2.625vmin;
    border-top-left-radius: 1.425vmin;
    border-top-right-radius: 1.425vmin;
    transform-origin: bottom right;
    transform: rotateZ(90deg) translateX(-0.1vmin) translateY(1.5vmin);
    z-index: -1;
    background-image: linear-gradient(70deg, transparent 20%, #deac80 20%);
  }

  .dog {
    position: relative;
    width: 20vmin;
    height: 8vmin;
  }

  .dog::before {
    content: "";
    position: absolute;
    bottom: -0.75vmin;
    right: -0.15vmin;
    width: 100%;
    height: 1.5vmin;
    background-color: #b5c18e;
    border-radius: 50%;
    z-index: -1000;
    animation: shadow 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__head {
    position: absolute;
    left: 4.5vmin;
    bottom: 0;
    width: 8vmin;
    height: 5vmin;
    border-top-left-radius: 4.05vmin;
    border-top-right-radius: 4.05vmin;
    border-bottom-right-radius: 3.3vmin;
    border-bottom-left-radius: 3.3vmin;
    background-color: #deac80;
    animation: head 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__head-c {
    position: absolute;
    left: 1.5vmin;
    bottom: 0;
    width: 9.75vmin;
    height: 8.25vmin;
    animation: head 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
    z-index: -1;
  }

  .dog__snout {
    position: absolute;
    left: -1.5vmin;
    bottom: 0;
    width: 7.5vmin;
    height: 3.75vmin;
    border-top-right-radius: 3vmin;
    border-bottom-right-radius: 3vmin;
    border-bottom-left-radius: 4.5vmin;
    background-color: #f7dcb9;
    animation: snout 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__snout::before {
    content: "";
    position: absolute;
    left: -0.1125vmin;
    top: -0.15vmin;
    width: 1.875vmin;
    height: 1.125vmin;
    border-top-right-radius: 3vmin;
    border-bottom-right-radius: 3vmin;
    border-bottom-left-radius: 4.5vmin;
    background-color: #6c4e31;
    animation: snout-b 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__eyes {
    position: relative;
    z-index: 2;
  }

  .dog__eye-l,
  .dog__eye-r {
    position: absolute;
    top: -0.9vmin;
    width: 0.675vmin;
    height: 0.375vmin;
    border-radius: 50%;
    background-color: #1c3130;
    animation: eye 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__eye-l {
    left: 27%;
  }

  .dog__eye-r {
    left: 65%;
  }

  .dog__ear-l,
  .dog__ear-r {
    position: absolute;
    width: 5vmin;
    height: 3.3vmin;
    border-top-left-radius: 3.3vmin;
    border-top-right-radius: 3vmin;
    border-bottom-right-radius: 5vmin;
    border-bottom-left-radius: 5vmin;
    background-color: #deac80;
  }

  .dog__ear-l {
    top: 1.5vmin;
    left: 10vmin;
    transform-origin: bottom left;
    transform: rotateZ(-50deg);
    z-index: -1;
    animation: ear-l 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__ear-r {
    top: 1.5vmin;
    right: 3vmin;
    transform-origin: bottom right;
    transform: rotateZ(25deg);
    z-index: -2;
    animation: ear-r 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__body {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    position: absolute;
    bottom: 0.3vmin;
    left: 6vmin;
    width: 18vmin;
    height: 4vmin;
    border-top-left-radius: 3vmin;
    border-top-right-radius: 6vmin;
    border-bottom-right-radius: 1.5vmin;
    border-bottom-left-radius: 6vmin;
    background-color: #914f1e;
    z-index: -2;
    animation: body 10s cubic-bezier(0.3, 0.41, 0.18, 1.01) infinite;
  }

  .dog__tail {
    position: absolute;
    top: 20px;
    right: -1.5vmin;
    height: 3vmin;
    width: 4vmin;
    background-color: #914f1e;
    border-radius: 1.5vmin;
  }

  .dog__paws {
    position: absolute;
    bottom: 0;
    left: 7.5vmin;
    width: 10vmin;
    height: 3vmin;
  }

  .dog__bl-leg {
    left: -3vmin;
    z-index: -10;
  }

  .dog__bl-paw::before {
    background-color: #fffbe6;
  }

  .dog__bl-top {
    background-image: linear-gradient(80deg, transparent 20%, #deac80 20%);
  }

  .dog__fl-leg {
    z-index: 10;
    left: 0;
  }

  .dog__fl-paw::before {
    background-color: #fffbe6;
  }

  .dog__fr-leg {
    right: 0;
  }

  .dog__fr-paw::before {
    background-color: #fffbe6;
  }

  /* Loading Text Styles */
  .loading-text {
    color: white;
    text-align: center;

    .library-name {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(45deg, #fff, #f0f0f0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: ${pulse} 2s ease-in-out infinite;
    }

    .loading-message {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      opacity: 0.9;
      position: relative;

      &::after {
        content: "|";
        animation: ${blink} 1s infinite;
        margin-left: 2px;
      }
    }
  }

  .progress-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .progress-bar {
    width: 300px;
    height: 6px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #ffd89b, #19547b);
      border-radius: 10px;
      animation: ${progress} 3s ease-in-out infinite;
    }
  }

  .progress-text {
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* Floating Books */
  .floating-books {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;

    .book {
      position: absolute;
      font-size: 2rem;
      opacity: 0.3;
      animation: ${float} 4s ease-in-out infinite;

      &.book-1 {
        top: 10%;
        left: 10%;
        animation-delay: 0s;
      }
      &.book-2 {
        top: 20%;
        right: 15%;
        animation-delay: 1s;
      }
      &.book-3 {
        bottom: 30%;
        left: 20%;
        animation-delay: 2s;
      }
      &.book-4 {
        bottom: 20%;
        right: 10%;
        animation-delay: 3s;
      }
    }
  }

  /* Quote Container */
  .quote-container {
    margin-top: 20px;
    color: rgba(255, 255, 255, 0.8);
    font-style: italic;
    max-width: 400px;

    .quote {
      font-size: 1rem;
      line-height: 1.5;
      margin-bottom: 0.5rem;
    }

    .author {
      font-size: 0.9rem;
      opacity: 0.7;
    }
  }

  /*==============================*/
  /* Original Dog Animations */
  /*==============================*/

  @keyframes head {
    0%,
    10%,
    20%,
    26%,
    28%,
    90%,
    100% {
      height: 8.25vmin;
      bottom: 0;
      transform-origin: bottom right;
      transform: rotateZ(0);
    }
    5%,
    15%,
    22%,
    24%,
    30% {
      height: 8.1vmin;
    }
    32%,
    50% {
      height: 8.25vmin;
    }
    55%,
    60% {
      bottom: 0.75vmin;
      transform-origin: bottom right;
      transform: rotateZ(0);
    }
    70%,
    80% {
      bottom: 0.75vmin;
      transform-origin: bottom right;
      transform: rotateZ(10deg);
    }
  }

  @keyframes body {
    0%,
    10%,
    20%,
    26%,
    28%,
    32%,
    100% {
      height: 7.2vmin;
    }
    5%,
    15%,
    22%,
    24%,
    30% {
      height: 7.05vmin;
    }
  }

  @keyframes ear-l {
    0%,
    10%,
    20%,
    26%,
    28%,
    82%,
    100% {
      transform: rotateZ(-50deg);
    }
    5%,
    15%,
    22%,
    24% {
      transform: rotateZ(-48deg);
    }
    30%,
    31% {
      transform: rotateZ(-30deg);
    }
    32%,
    80% {
      transform: rotateZ(-60deg);
    }
  }

  @keyframes ear-r {
    0%,
    10%,
    20%,
    26%,
    28% {
      transform: rotateZ(20deg);
    }
    5%,
    15%,
    22%,
    24% {
      transform: rotateZ(18deg);
    }
    30%,
    31% {
      transform: rotateZ(10deg);
    }
    32% {
      transform: rotateZ(25deg);
    }
  }

  @keyframes snout {
    0%,
    10%,
    20%,
    26%,
    28%,
    82%,
    100% {
      height: 3.75vmin;
    }
    5%,
    15%,
    22%,
    24% {
      height: 3.45vmin;
    }
  }

  @keyframes snout-b {
    0%,
    10%,
    20%,
    26%,
    28%,
    98%,
    100% {
      width: 1.875vmin;
    }
    5%,
    15%,
    22%,
    24% {
      width: 1.8vmin;
    }
    34%,
    98% {
      width: 1.275vmin;
    }
  }

  @keyframes shadow {
    0%,
    10%,
    20%,
    26%,
    28%,
    30%,
    84%,
    100% {
      width: 99%;
    }
    5%,
    15%,
    22%,
    24% {
      width: 101%;
    }
    34%,
    81% {
      width: 96%;
    }
  }

  @keyframes eye {
    0%,
    30% {
      width: 0.675vmin;
      height: 0.3vmin;
    }
    32%,
    59%,
    90%,
    100% {
      width: 0.525vmin;
      height: 0.525vmin;
      transform: translateY(0);
    }
    60%,
    75% {
      transform: translateY(-0.3vmin);
    }
    80%,
    85% {
      transform: translateY(0.15vmin);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .loading-text .library-name {
      font-size: 2rem;
    }

    .progress-bar {
      width: 250px;
    }

    .floating-books .book {
      font-size: 1.5rem;
    }

    .quote-container {
      max-width: 300px;

      .quote {
        font-size: 0.9rem;
      }
    }
  }

  @media (max-width: 480px) {
    .loading-text .library-name {
      font-size: 1.8rem;
    }

    .loading-text .loading-message {
      font-size: 1rem;
    }

    .progress-bar {
      width: 200px;
    }

    .dog {
      width: 25vmin;
    }
  }
`;

export default Loading;
