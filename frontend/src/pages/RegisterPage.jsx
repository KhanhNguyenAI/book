// src/pages/RegisterPage.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UseAuth } from "../context/AuthContext";
import styled, { keyframes } from "styled-components";
import toast from "react-hot-toast";

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
    let firstError = null;

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      if (!firstError) firstError = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
      if (!firstError) firstError = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      if (!firstError) firstError = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
      if (!firstError) firstError = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      if (!firstError) firstError = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      if (!firstError) firstError = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      if (!firstError) firstError = "Passwords do not match";
    }

    if (firstError) {
      toast.error(firstError);
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
        toast.success("Registration successful! Welcome to Briona Library!");
        navigate(from, { replace: true });
      } else {
        const errorMessage = result.message || "Registration failed";
        setErrors({
          submit: errorMessage,
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred";
      setErrors({
        submit: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NatureContainer>
      <NatureCard>
        {/* Nature Background Elements */}
        <div className="nature-bg">
          <div className="leaf leaf-1">🍃</div>
          <div className="leaf leaf-2">🌿</div>
          <div className="leaf leaf-3">🍂</div>
          <div className="flower flower-1">🌸</div>
          <div className="flower flower-2">🌼</div>
        </div>

        <NatureHeader>
          <NatureTitle>Join Briona Library</NatureTitle>
          <NatureSubtitle>Begin your reading journey surrounded by nature's beauty</NatureSubtitle>
        </NatureHeader>

        <NatureForm onSubmit={handleSubmit}>
          <FormGroup>
            <NatureLabel>
              <span className="label-icon">👤</span>
              Username
            </NatureLabel>
            <NatureInput
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose your username..."
              $hasError={!!errors.username}
              disabled={isLoading}
            />
            {errors.username && <ErrorText>🌱 {errors.username}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <NatureLabel>
              <span className="label-icon">📧</span>
              Email
            </NatureLabel>
            <NatureInput
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email address..."
              $hasError={!!errors.email}
              disabled={isLoading}
            />
            {errors.email && <ErrorText>🌱 {errors.email}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <NatureLabel>
              <span className="label-icon">🔑</span>
              Password
            </NatureLabel>
            <NatureInput
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a secure password..."
              $hasError={!!errors.password}
              disabled={isLoading}
            />
            {errors.password && <ErrorText>🌱 {errors.password}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <NatureLabel>
              <span className="label-icon">✅</span>
              Confirm Password
            </NatureLabel>
            <NatureInput
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password..."
              $hasError={!!errors.confirmPassword}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <ErrorText>🌱 {errors.confirmPassword}</ErrorText>
            )}
          </FormGroup>

          {errors.submit && (
            <ErrorText className="submit-error">🍃 {errors.submit}</ErrorText>
          )}

          <RegisterButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <LoadingSpinner>
                <div className="nature-spinner"></div>
                Creating Account...
              </LoadingSpinner>
            ) : (
              <>
                <ButtonIcon>🌿</ButtonIcon>
                Create Account
              </>
            )}
          </RegisterButton>
        </NatureForm>

        <NatureFooter>
          <NatureText>
            Already have an account?{" "}
            <NatureLink to="/auth/login" state={{ from: location.state?.from }}>
              Sign In Here
            </NatureLink>
          </NatureText>
          <NatureText>
            Just want to explore?{" "}
            <NatureLink to="/books">Browse Books</NatureLink>
          </NatureText>
        </NatureFooter>
      </NatureCard>

      {/* Floating Nature Elements */}
      <FloatingElements>
        <FloatingElement style={{ left: '5%', animationDelay: '0s' }}>📚</FloatingElement>
        <FloatingElement style={{ left: '15%', animationDelay: '1.5s' }}>🌱</FloatingElement>
        <FloatingElement style={{ left: '25%', animationDelay: '3s' }}>✨</FloatingElement>
        <FloatingElement style={{ left: '35%', animationDelay: '4.5s' }}>📖</FloatingElement>
        <FloatingElement style={{ left: '45%', animationDelay: '6s' }}>🍃</FloatingElement>
        <FloatingElement style={{ left: '55%', animationDelay: '7.5s' }}>🌿</FloatingElement>
        <FloatingElement style={{ left: '65%', animationDelay: '9s' }}>🌸</FloatingElement>
        <FloatingElement style={{ left: '75%', animationDelay: '10.5s' }}>🌼</FloatingElement>
        <FloatingElement style={{ left: '85%', animationDelay: '12s' }}>🌟</FloatingElement>
        <FloatingElement style={{ left: '95%', animationDelay: '13.5s' }}>💫</FloatingElement>
      </FloatingElements>
    </NatureContainer>
  );
};

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(-10px) rotate(240deg); }
`;

const gentleFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
`;

const leafFall = keyframes`
  0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.7; }
  100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled Components
const NatureContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%);
  padding: 2rem;
  position: relative;
  overflow: hidden;
  width: 100vw;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const NatureCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  max-width: 480px;
  width: 100%;
  position: relative;
  z-index: 2;
  animation: ${fadeInUp} 0.8s ease-out;

  .nature-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
    border-radius: 24px;

    .leaf, .flower {
      position: absolute;
      font-size: 20px;
      opacity: 0.1;
      animation: ${leafFall} 20s linear infinite;
    }

    .leaf-1 { left: 10%; animation-delay: 0s; }
    .leaf-2 { left: 30%; animation-delay: 5s; }
    .leaf-3 { left: 70%; animation-delay: 10s; }
    .flower-1 { left: 20%; animation-delay: 2s; }
    .flower-2 { left: 80%; animation-delay: 7s; }
  }
`;

const NatureHeader = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const NatureTitle = styled.h1`
  color: #2d3436;
  margin: 0 0 1rem 0;
  font-size: 2.2rem;
  font-weight: 300;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #2d3436 0%, #81b214 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const NatureSubtitle = styled.p`
  color: #636e72;
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
`;

const NatureForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const NatureLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #2d3436;
  font-size: 0.95rem;

  .label-icon {
    font-size: 1.1rem;
  }
`;

const NatureInput = styled.input`
  padding: 1rem 1.2rem;
  border: 1.5px solid ${props => props.$hasError ? '#e74c3c' : 'rgba(129, 178, 20, 0.3)'};
  border-radius: 16px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  color: #2d3436;
  transition: all 0.3s ease;
  font-family: inherit;

  ${(props) => props.$hasError && `
    background: rgba(231, 76, 60, 0.05);
  `}

  &:focus {
    outline: none;
    border-color: #81b214;
    box-shadow: 0 0 0 3px rgba(129, 178, 20, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #b2bec3;
  }
`;

const ErrorText = styled.span`
  color: #e74c3c;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &.submit-error {
    text-align: center;
    display: block;
    margin-top: 0.5rem;
    font-size: 0.9rem;
    padding: 0.75rem;
    background: rgba(231, 76, 60, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(231, 76, 60, 0.2);
  }
`;

const RegisterButton = styled.button`
  background: linear-gradient(135deg, #81b214, #4caf50);
  border: none;
  border-radius: 16px;
  padding: 1.2rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(129, 178, 20, 0.3);
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(129, 178, 20, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ButtonIcon = styled.span`
  font-size: 1.2rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;

  .nature-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const NatureFooter = styled.div`
  text-align: center;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(129, 178, 20, 0.2);
`;

const NatureText = styled.p`
  color: #636e72;
  margin: 0.75rem 0;
  font-size: 0.9rem;
`;

const NatureLink = styled(Link)`
  color: #81b214;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.3s ease;
  
  &:hover {
    color: #4caf50;
    text-decoration: underline;
  }
`;

const FloatingElements = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
`;

const FloatingElement = styled.div`
  position: absolute;
  font-size: 1.5rem;
  opacity: 0.15;
  animation: ${gentleFloat} 8s ease-in-out infinite;
  bottom: -50px;
`;

export default RegisterPage;