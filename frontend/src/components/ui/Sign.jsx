import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UseAuth } from "../../context/AuthContext";
import styled, { keyframes } from "styled-components";

const Sign = ({ className }) => {
  const { isAuthenticated, user, login, register } = UseAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  const handleSignClick = () => {
    if (isAuthenticated) {
      navigate("/profile");
    } else {
      setShowAuthModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowAuthModal(false);
    setErrors({});
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!isLoginMode) {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLoginMode && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      let result;

      if (isLoginMode) {
        result = await login({
          username: formData.username,
          password: formData.password,
        });
      } else {
        result = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
      }

      if (result && result.success) {
        handleCloseModal();
        navigate("/");
      } else {
        setErrors({
          submit: result?.message || "Authentication failed",
        });
      }
    } catch (error) {
      setErrors({
        submit: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrors({});
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const result = await login({
        username: "Khanhbriona123",
        password: "Khanhbriona@123123",
      });

      if (result && result.success) {
        handleCloseModal();
        navigate("/");
      } else {
        setErrors({ submit: "Demo login failed" });
      }
    } catch (error) {
      setErrors({
        submit: error.message || "Demo login error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ComicWrapper>
        <div className={className}>
          {isAuthenticated ? (
            <UserBubble onClick={handleSignClick}>
              <Avatar>{user?.username?.charAt(0).toUpperCase() || "U"}</Avatar>
              <UserInfo>
                <UserName>{user?.username || "User"}</UserName>
                <UserRole>{user?.role || "Member"}</UserRole>
              </UserInfo>
              <Sparkle>✨</Sparkle>
            </UserBubble>
          ) : (
            <ComicButton onClick={handleSignClick}>
              <ButtonInner>
                <ComicIcon>🎭</ComicIcon>
                <ButtonText>SIGN IN</ButtonText>
                <ComicHighlight />
              </ButtonInner>
              <ComicShadow />
            </ComicButton>
          )}
        </div>
      </ComicWrapper>

      {/* Comic Style Authentication Modal */}
      {showAuthModal && (
        <ComicModalOverlay onClick={handleCloseModal}>
          <ComicModal onClick={(e) => e.stopPropagation()}>
            <ComicModalHeader>
              <ComicTitle>
                {isLoginMode ? "WELCOME BACK! 🎉" : "JOIN THE ADVENTURE! 🚀"}
              </ComicTitle>
              <ComicSubtitle>
                {isLoginMode
                  ? "Ready to continue your story?"
                  : "Start your epic journey today!"}
              </ComicSubtitle>
              <CloseComicButton onClick={handleCloseModal}>✕</CloseComicButton>
            </ComicModalHeader>

            <ComicForm onSubmit={handleAuthSubmit}>
              <ComicFormGroup>
                <ComicLabel>🎯 Username</ComicLabel>
                <ComicInput
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Your hero name..."
                  $hasError={!!errors.username}
                />
                {errors.username && (
                  <ComicError>💥 {errors.username}</ComicError>
                )}
              </ComicFormGroup>

              {!isLoginMode && (
                <ComicFormGroup>
                  <ComicLabel>📧 Email</ComicLabel>
                  <ComicInput
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Your magical email..."
                    $hasError={!!errors.email}
                  />
                  {errors.email && <ComicError>💥 {errors.email}</ComicError>}
                </ComicFormGroup>
              )}

              <ComicFormGroup>
                <ComicLabel>🔑 Password</ComicLabel>
                <ComicInput
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Your secret code..."
                  $hasError={!!errors.password}
                />
                {errors.password && (
                  <ComicError>💥 {errors.password}</ComicError>
                )}
              </ComicFormGroup>

              {!isLoginMode && (
                <ComicFormGroup>
                  <ComicLabel>✅ Confirm Password</ComicLabel>
                  <ComicInput
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Repeat your secret code..."
                    $hasError={!!errors.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <ComicError>💥 {errors.confirmPassword}</ComicError>
                  )}
                </ComicFormGroup>
              )}

              {errors.submit && (
                <ComicError className="submit-error">
                  ⚡ {errors.submit}
                </ComicError>
              )}

              <ComicSubmitButton type="submit" disabled={isLoading}>
                {isLoading ? (
                  <ComicSpinner>🌀</ComicSpinner>
                ) : isLoginMode ? (
                  <>
                    <ComicButtonIcon>🎯</ComicButtonIcon>
                    LET'S GO!
                  </>
                ) : (
                  <>
                    <ComicButtonIcon>✨</ComicButtonIcon>
                    CREATE ACCOUNT!
                  </>
                )}
              </ComicSubmitButton>

              <ComicDemoButton
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
              >
                <ComicButtonIcon>🎮</ComicButtonIcon>
                TRY DEMO MODE
              </ComicDemoButton>
            </ComicForm>

            <ComicSwitchMode>
              <ComicSwitchText>
                {isLoginMode ? "New adventurer? " : "Already have an account? "}
                <ComicSwitchButton type="button" onClick={switchAuthMode}>
                  {isLoginMode ? "JOIN THE QUEST!" : "RETURN TO BATTLE!"}
                </ComicSwitchButton>
              </ComicSwitchText>
            </ComicSwitchMode>

            <ComicFooter>
              <ComicNote>🌟 Your adventure awaits! 🌟</ComicNote>
            </ComicFooter>
          </ComicModal>
        </ComicModalOverlay>
      )}
    </>
  );
};

// Animations
const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Styled Components
const ComicWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ComicButton = styled.button`
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: 4px solid #333;
  border-radius: 20px;
  padding: 0;
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  animation: ${bounce} 2s infinite ease-in-out;
  box-shadow: 0 8px 0 #333, 0 12px 20px rgba(0, 0, 0, 0.3);

  &:hover {
    animation: ${pulse} 0.5s ease-in-out;
    transform: translateY(-2px);
    box-shadow: 0 10px 0 #333, 0 15px 25px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: translateY(4px);
    box-shadow: 0 4px 0 #333, 0 8px 15px rgba(0, 0, 0, 0.3);
  }
`;

const ButtonInner = styled.div`
  background: linear-gradient(135deg, #ffd166, #ff9e6d);
  padding: 1rem 2rem;
  border-radius: 16px;
  border: 3px solid #333;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Comic Sans MS", cursive, sans-serif;
  font-weight: bold;
  color: #333;
  text-shadow: 2px 2px 0px rgba(255, 255, 255, 0.5);
`;

const ComicHighlight = styled.div`
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 70%
  );
  transform: rotate(45deg);
  transition: all 0.3s ease;
`;

const ComicShadow = styled.div`
  position: absolute;
  bottom: -8px;
  left: 4px;
  right: 4px;
  height: 8px;
  background: #333;
  border-radius: 0 0 16px 16px;
  z-index: -1;
`;

const ComicIcon = styled.span`
  font-size: 1.5rem;
  animation: ${float} 3s infinite ease-in-out;
`;

const ButtonText = styled.span`
  font-size: 1.2rem;
  letter-spacing: 1px;
`;

const UserBubble = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #74b9ff, #0984e3);
  border: 4px solid #333;
  border-radius: 25px;
  padding: 0.8rem 1.5rem;
  cursor: pointer;
  position: relative;
  box-shadow: 0 6px 0 #333, 0 10px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  animation: ${bounce} 3s infinite ease-in-out;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 0 #333, 0 12px 25px rgba(0, 0, 0, 0.3);
  }
`;

const Avatar = styled.div`
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #fd79a8, #e84393);
  border: 3px solid #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Comic Sans MS", cursive, sans-serif;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 0 #333;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  color: #333;
  font-family: "Comic Sans MS", cursive, sans-serif;
`;

const UserName = styled.span`
  font-weight: bold;
  font-size: 1.1rem;
  text-shadow: 1px 1px 0 white;
`;

const UserRole = styled.span`
  font-size: 0.9rem;
  opacity: 0.8;
  text-transform: capitalize;
`;

const Sparkle = styled.span`
  animation: ${sparkle} 2s infinite ease-in-out;
  font-size: 1.2rem;
`;

// Modal Styles
const ComicModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const ComicModal = styled.div`
  background: linear-gradient(135deg, #ffeaa7, #fab1a0);
  border: 6px solid #333;
  border-radius: 25px;
  padding: 2rem;
  max-width: 450px;
  width: 90%;
  position: relative;
  box-shadow: 0 15px 0 #333, 0 20px 40px rgba(0, 0, 0, 0.5);
  animation: ${pulse} 0.5s ease-out;
`;

const ComicModalHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
`;

const ComicTitle = styled.h2`
  font-family: "Comic Sans MS", cursive, sans-serif;
  color: #333;
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  text-shadow: 3px 3px 0 rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
`;

const ComicSubtitle = styled.p`
  font-family: "Comic Sans MS", cursive, sans-serif;
  color: #666;
  margin: 0;
  font-size: 1rem;
`;

const CloseComicButton = styled.button`
  position: absolute;
  top: -10px;
  right: -10px;
  width: 40px;
  height: 40px;
  background: #ff7675;
  border: 3px solid #333;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 0 #333;
  transition: all 0.2s ease;

  &:hover {
    background: #ff5252;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
    box-shadow: 0 2px 0 #333;
  }
`;

const ComicForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const ComicFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ComicLabel = styled.label`
  font-family: "Comic Sans MS", cursive, sans-serif;
  font-weight: bold;
  color: #333;
  font-size: 1rem;
  text-shadow: 1px 1px 0 white;
`;

const ComicInput = styled.input`
  padding: 0.8rem 1rem;
  border: 3px solid #333;
  border-radius: 15px;
  font-size: 1rem;
  font-family: "Comic Sans MS", cursive, sans-serif;
  background: white;
  transition: all 0.3s ease;
  box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.1);
  color: black;
  ${(props) =>
    props.$hasError &&
    `
    border-color: #e74c3c;
    background: #ffeaea;
  `}

  &:focus {
    outline: none;
    border-color: #74b9ff;
    box-shadow: 0 0 0 3px rgba(116, 185, 255, 0.3);
    transform: translateY(-2px);
  }

  &::placeholder {
    color: #999;
    font-style: italic;
  }
`;

const ComicError = styled.span`
  color: #e74c3c;
  font-family: "Comic Sans MS", cursive, sans-serif;
  font-size: 0.9rem;
  font-weight: bold;

  &.submit-error {
    text-align: center;
    display: block;
    margin-top: 0.5rem;
    font-size: 1rem;
  }
`;

const ComicSubmitButton = styled.button`
  background: linear-gradient(135deg, #55efc4, #00b894);
  border: 3px solid #333;
  border-radius: 15px;
  padding: 1rem;
  font-family: "Comic Sans MS", cursive, sans-serif;
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 6px 0 #333;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 0 #333;
  }

  &:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: 0 3px 0 #333;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 0 #333;
  }
`;

const ComicDemoButton = styled(ComicSubmitButton)`
  background: linear-gradient(135deg, #fdcb6e, #e17055);
  margin-top: 0.5rem;
`;

const ComicButtonIcon = styled.span`
  font-size: 1.2rem;
`;

const ComicSpinner = styled.span`
  animation: ${spin} 1s linear infinite;
  font-size: 1.5rem;
  display: inline-block;
`;

const ComicSwitchMode = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 2px dashed #333;
`;

const ComicSwitchText = styled.p`
  font-family: "Comic Sans MS", cursive, sans-serif;
  color: #666;
  margin: 0;
`;

const ComicSwitchButton = styled.button`
  background: none;
  border: none;
  color: #0984e3;
  cursor: pointer;
  font-family: "Comic Sans MS", cursive, sans-serif;
  font-weight: bold;
  font-size: 1rem;
  text-decoration: underline;
  text-shadow: 1px 1px 0 white;

  &:hover {
    color: #74b9ff;
    transform: scale(1.05);
  }
`;

const ComicFooter = styled.div`
  text-align: center;
  margin-top: 1rem;
`;

const ComicNote = styled.p`
  font-family: "Comic Sans MS", cursive, sans-serif;
  color: #666;
  font-size: 0.9rem;
  margin: 0;
  font-style: italic;
`;

export default Sign;
