import React from "react";
import styled, { keyframes } from "styled-components";

const Chatbot = ({ onOpen }) => {
  return (
    <ChatbotContainer onClick={onOpen}>
      {/* Robot Body */}
      <RobotBody>
        {/* Robot Head */}
        <RobotHead>
          <RobotEyes>
            <EyeLeft>●</EyeLeft>
            <EyeRight>●</EyeRight>
          </RobotEyes>
          <RobotMouth>⌄</RobotMouth>
          <RobotAntenna />
        </RobotHead>
        
        {/* Robot Body Details */}
        <RobotScreen>AI</RobotScreen>
        <RobotButtons>
          <Button className="btn-1">•</Button>
          <Button className="btn-2">•</Button>
          <Button className="btn-3">•</Button>
        </RobotButtons>
      </RobotBody>

      {/* Speech Bubble */}
      <SpeechBubble>
        <BubbleText>Welcome!   👋</BubbleText>
        <BubbleTail />
      </SpeechBubble>

      {/* Floating Animation */}
      <FloatingOrbits>
        <Orbit className="orbit-1">⚡</Orbit>
        <Orbit className="orbit-2">🔍</Orbit>
        <Orbit className="orbit-3">📚</Orbit>
      </FloatingOrbits>
    </ChatbotContainer>
  );
};

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-5px) rotate(1deg); }
  66% { transform: translateY(3px) rotate(-1deg); }
`;

const blink = keyframes`
  0%, 45%, 55%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
`;

const orbit = keyframes`
  0% { transform: rotate(0deg) translateX(25px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(25px) rotate(-360deg); }
`;

// Styled Components
const ChatbotContainer = styled.div`
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    transform: scale(1.05);
    
    ${props => props.theme.robotBody} {
      box-shadow: 
        0 10px 25px rgba(0, 215, 87, 0.4),
        0 0 0 3px #00d757,
        inset 0 0 20px rgba(255, 255, 255, 0.3);
    }
    
    ${props => props.theme.speechBubble} {
      transform: scale(1.1) translateY(-5px);
    }
  }

  &:active {
    transform: scale(0.95);
  }
`;

const RobotBody = styled.div`
  width: 80px;
  height: 100px;
  background: linear-gradient(135deg, #00d757, #00a4ef);
  border-radius: 20px 20px 10px 10px;
  position: relative;
  border: 4px solid #2c3e50;
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.3),
    inset 0 0 15px rgba(255, 255, 255, 0.2);
  animation: ${float} 4s ease-in-out infinite;
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #00d757, #00a4ef);
    border-radius: 22px 22px 12px 12px;
    z-index: -1;
    opacity: 0.7;
    filter: blur(5px);
  }
`;

const RobotHead = styled.div`
  width: 60px;
  height: 50px;
  background: linear-gradient(135deg, #00a4ef, #0078d7);
  border-radius: 15px 15px 5px 5px;
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  border: 3px solid #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
`;

const RobotEyes = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
`;

const Eye = styled.div`
  width: 8px;
  height: 8px;
  background: #00ff88;
  border-radius: 50%;
  animation: ${blink} 3s infinite;
  box-shadow: 0 0 10px #00ff88;
`;

const EyeLeft = styled(Eye)`
  animation-delay: 0s;
`;

const EyeRight = styled(Eye)`
  animation-delay: 0.5s;
`;

const RobotMouth = styled.div`
  width: 20px;
  height: 8px;
  background: #ff6b6b;
  border-radius: 0 0 10px 10px;
  margin-top: 2px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: #2c3e50;
  }
`;

const RobotAntenna = styled.div`
  width: 4px;
  height: 15px;
  background: #ffd166;
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 2px 2px 0 0;
  
  &::after {
    content: '';
    width: 8px;
    height: 8px;
    background: #ff6b6b;
    border-radius: 50%;
    position: absolute;
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    animation: ${pulse} 2s infinite;
  }
`;

const RobotScreen = styled.div`
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 25px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ff88;
  font-size: 12px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  border: 2px solid #00ff88;
  text-shadow: 0 0 5px #00ff88;
`;

const RobotButtons = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
`;

const Button = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd166;
  border: 1px solid #2c3e50;
  
  &.btn-1 { background: #00d757; }
  &.btn-2 { background: #ff6b6b; }
  &.btn-3 { background: #00a4ef; }
`;

const SpeechBubble = styled.div`
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 8px 12px;
  border-radius: 15px;
  border: 3px solid #2c3e50;
  box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  white-space: nowrap;

  &::before {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid #2c3e50;
  }
`;

const BubbleText = styled.span`
  font-size: 12px;
  font-weight: bold;
  color: #2c3e50;
  font-family: "Comic Sans MS", cursive;
`;

const BubbleTail = styled.div`
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid white;
`;

const FloatingOrbits = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  pointer-events: none;
`;

const Orbit = styled.div`
  position: absolute;
  font-size: 12px;
  animation: ${orbit} 4s linear infinite;
  
  &.orbit-1 { animation-duration: 3s; animation-delay: 0s; }
  &.orbit-2 { animation-duration: 4s; animation-delay: -1s; }
  &.orbit-3 { animation-duration: 5s; animation-delay: -2s; }
`;

// Theme for nested selectors
ChatbotContainer.defaultProps = {
  theme: {
    robotBody: RobotBody,
    speechBubble: SpeechBubble
  }
};

export default Chatbot;