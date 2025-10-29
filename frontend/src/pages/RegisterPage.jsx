// src/pages/RegisterPage.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UseAuth } from "../context/AuthContext";
import styled from "styled-components";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { register } = UseAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

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

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setErrors({
          submit: result.message || "Registration failed",
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

  return (
    <RegisterContainer>
      <ComicCard>
        <ComicHeader>
          <ComicTitle>🚀 JOIN THE ADVENTURE!</ComicTitle>
          <ComicSubtitle>Start your epic reading journey today! 📖</ComicSubtitle>
        </ComicHeader>

        <ComicForm onSubmit={handleSubmit}>
          <FormGroup>
            <ComicLabel>👤 Username</ComicLabel>
            <ComicInput
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose your hero name..."
              $hasError={!!errors.username}
              disabled={isLoading}
            />
            {errors.username && <ErrorText>💥 {errors.username}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <ComicLabel>📧 Email</ComicLabel>
            <ComicInput
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Your magical email address..."
              $hasError={!!errors.email}
              disabled={isLoading}
            />
            {errors.email && <ErrorText>💥 {errors.email}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <ComicLabel>🔑 Password</ComicLabel>
            <ComicInput
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a strong password..."
              $hasError={!!errors.password}
              disabled={isLoading}
            />
            {errors.password && <ErrorText>💥 {errors.password}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <ComicLabel>✅ Confirm Password</ComicLabel>
            <ComicInput
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Repeat your password..."
              $hasError={!!errors.confirmPassword}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <ErrorText>💥 {errors.confirmPassword}</ErrorText>
            )}
          </FormGroup>

          {errors.submit && (
            <ErrorText className="submit-error">⚡ {errors.submit}</ErrorText>
          )}

          <RegisterButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <LoadingSpinner>🌀</LoadingSpinner>
            ) : (
              <>
                <ButtonIcon>✨</ButtonIcon>
                CREATE MY ACCOUNT!
              </>
            )}
          </RegisterButton>
        </ComicForm>

        <ComicFooter>
          <ComicText>
            Already have an account?{" "}
            <ComicLink to="/login" state={{ from: location.state?.from }}>
              🎭 SIGN IN HERE!
            </ComicLink>
          </ComicText>
          <ComicText>
            Just want to explore?{" "}
            <ComicLink to="/books">📚 BROWSE BOOKS</ComicLink>
          </ComicText>
        </ComicFooter>
      </ComicCard>

      <ComicBubbles>
        <Bubble>📖</Bubble>
        <Bubble>🎨</Bubble>
        <Bubble>🌟</Bubble>
        <Bubble>✨</Bubble>
      </ComicBubbles>
    </RegisterContainer>
  );
};

// Reuse styled components from LoginPage với minor adjustments
const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
  padding: 2rem;
  position: relative;
  overflow: hidden;
  width : 100vw;
`;

const ComicCard = styled.div`
  background: white;
  border-radius: 25px;
  padding: 3rem;
  border: 6px solid #2c3e50;
  box-shadow: 15px 15px 0px rgba(0, 0, 0, 0.3);
  max-width: 450px;
  width: 100%;
  position: relative;
  z-index: 2;
`;

const ComicHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const ComicTitle = styled.h1`
  font-family: "Comic Neue", cursive;
  color: #2c3e50;
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.1);
`;

const ComicSubtitle = styled.p`
  font-family: "Comic Neue", cursive;
  color: #7f8c8d;
  margin: 0;
  font-size: 1.1rem;
`;

const ComicForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ComicLabel = styled.label`
  font-family: "Comic Neue", cursive;
  font-weight: bold;
  color: #2c3e50;
  font-size: 1.1rem;
`;

const ComicInput = styled.input`
  padding: 1rem;
  border: 3px solid #2c3e50;
  border-radius: 15px;
  font-size: 1rem;
  font-family: "Comic Neue", cursive;
  background: white;
  transition: all 0.3s ease;
  box-shadow: inset 3px 3px 5px rgba(0, 0, 0, 0.1);
  
  ${(props) => props.$hasError && `
    border-color: #e74c3c;
    background: #ffeaea;
  `}

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.span`
  color: #e74c3c;
  font-family: "Comic Neue", cursive;
  font-size: 0.9rem;
  font-weight: bold;

  &.submit-error {
    text-align: center;
    display: block;
    margin-top: 0.5rem;
    font-size: 1rem;
  }
`;

const RegisterButton = styled.button`
  background: linear-gradient(135deg, #a29bfe, #6c5ce7);
  border: 3px solid #2c3e50;
  border-radius: 15px;
  padding: 1.2rem;
  font-family: "Comic Neue", cursive;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 6px 0 #2c3e50;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 0 #2c3e50;
  }

  &:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: 0 3px 0 #2c3e50;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 0 #2c3e50;
  }
`;

const ButtonIcon = styled.span`
  font-size: 1.3rem;
`;

const LoadingSpinner = styled.span`
  animation: spin 1s linear infinite;
  font-size: 1.5rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ComicFooter = styled.div`
  text-align: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 3px dashed #bdc3c7;
`;

const ComicText = styled.p`
  font-family: "Comic Neue", cursive;
  color: #7f8c8d;
  margin: 0.5rem 0;
`;

const ComicLink = styled(Link)`
  color: #e74c3c;
  font-weight: bold;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
    color: #c0392b;
  }
`;

const ComicBubbles = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`;

const Bubble = styled.div`
  position: absolute;
  font-size: 2rem;
  opacity: 0.1;
  animation: float 6s ease-in-out infinite;

  &:nth-child(1) {
    top: 15%;
    left: 5%;
    animation-delay: 0s;
  }
  &:nth-child(2) {
    top: 25%;
    right: 10%;
    animation-delay: 2s;
  }
  &:nth-child(3) {
    bottom: 20%;
    left: 15%;
    animation-delay: 4s;
  }
  &:nth-child(4) {
    bottom: 10%;
    right: 5%;
    animation-delay: 6s;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(180deg); }
  }
`;

export default RegisterPage;