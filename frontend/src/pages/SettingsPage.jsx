import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { UseAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { userService } from "../services/user";
import toast from "react-hot-toast";
import { Settings, Globe, Check, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = UseAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [saving, setSaving] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
  };

  const handleSaveLanguage = () => {
    setSaving(true);
    // Change language immediately
    changeLanguage(selectedLanguage);
    
    // Simulate save delay
    setTimeout(() => {
      setSaving(false);
      toast.success("Language settings saved!");
    }, 300);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    let firstError = null;

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
      if (!firstError) firstError = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
      if (!firstError) firstError = "New password is required";
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = "New password must be at least 6 characters";
      if (!firstError) firstError = "New password must be at least 6 characters";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
      if (!firstError) firstError = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
      if (!firstError) firstError = "Passwords do not match";
    }

    if (firstError) {
      toast.error(firstError);
    }

    return errors;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);
    setPasswordErrors({});

    try {
      const result = await userService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.status === "success") {
        toast.success("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const errorMessage = result.message || "Failed to change password";
        toast.error(errorMessage);
        setPasswordErrors({ submit: errorMessage });
      }
    } catch (error) {
      const errorMessage = error.message || "An unexpected error occurred";
      toast.error(errorMessage);
      setPasswordErrors({ submit: errorMessage });
    } finally {
      setChangingPassword(false);
    }
  };



  const handleBackClick = () => {
    navigate("/profile");
  };

  const languages = [
    { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
    { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer>
      <Header />
      <ContentWrapper>
        
        <PageHeader>
          <BackButton onClick={handleBackClick}>
            <ArrowLeft size={20} />
            {t("back")}
          </BackButton>
          <HeaderContent>
            <SettingsIcon>
              <Settings size={32} />
            </SettingsIcon>
            <TitleText>
              <h1>{t("settings")}</h1>
              <p>{language === "ja" ? "アカウント設定と環境設定を管理" : "Manage your account settings and preferences"}</p>
            </TitleText>
          </HeaderContent>
        </PageHeader>

        <SettingsContainer>
          <SettingsSection>
            <SectionHeader>
              <Globe size={20} />
              <SectionTitle>{t("languageSettings")}</SectionTitle>
            </SectionHeader>
            <SectionDescription>{t("languageDescription")}</SectionDescription>
            
            <LanguageOptions>
              {languages.map((lang) => (
                <LanguageOption
                  key={lang.code}
                  $selected={selectedLanguage === lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <LanguageFlag>{lang.flag}</LanguageFlag>
                  <LanguageInfo>
                    <LanguageName>{lang.name}</LanguageName>
                    <LanguageNativeName>{lang.nativeName}</LanguageNativeName>
                  </LanguageInfo>
                  {selectedLanguage === lang.code && (
                    <SelectedIcon>
                      <Check size={20} />
                    </SelectedIcon>
                  )}
                </LanguageOption>
              ))}
            </LanguageOptions>

            <SaveButton
              onClick={handleSaveLanguage}
              disabled={saving || selectedLanguage === language}
            >
              {saving ? t("loading") : t("save")}
            </SaveButton>
          </SettingsSection>

          <SettingsSection>
            <SectionHeader>
              <Lock size={20} />
              <SectionTitle>Change Password</SectionTitle>
            </SectionHeader>
            <SectionDescription>
              Update your password to keep your account secure
            </SectionDescription>
            
            <PasswordForm onSubmit={handleChangePassword}>
              <FormGroup>
                <FormLabel>Current Password</FormLabel>
                <PasswordInputWrapper>
                  <PasswordInput
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter your current password"
                    $hasError={!!passwordErrors.currentPassword}
                    disabled={changingPassword}
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </PasswordToggle>
                </PasswordInputWrapper>
                {passwordErrors.currentPassword && (
                  <ErrorText>{passwordErrors.currentPassword}</ErrorText>
                )}
              </FormGroup>

              <FormGroup>
                <FormLabel>New Password</FormLabel>
                <PasswordInputWrapper>
                  <PasswordInput
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter your new password (min 6 characters)"
                    $hasError={!!passwordErrors.newPassword}
                    disabled={changingPassword}
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </PasswordToggle>
                </PasswordInputWrapper>
                {passwordErrors.newPassword && (
                  <ErrorText>{passwordErrors.newPassword}</ErrorText>
                )}
              </FormGroup>

              <FormGroup>
                <FormLabel>Confirm New Password</FormLabel>
                <PasswordInputWrapper>
                  <PasswordInput
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm your new password"
                    $hasError={!!passwordErrors.confirmPassword}
                    disabled={changingPassword}
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </PasswordToggle>
                </PasswordInputWrapper>
                {passwordErrors.confirmPassword && (
                  <ErrorText>{passwordErrors.confirmPassword}</ErrorText>
                )}
              </FormGroup>

              {passwordErrors.submit && (
                <ErrorText className="submit-error">{passwordErrors.submit}</ErrorText>
              )}

              <SaveButton
                type="submit"
                disabled={changingPassword}
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </SaveButton>
            </PasswordForm>
          </SettingsSection>
        </SettingsContainer>
      </ContentWrapper>
      <Footer />
    </PageContainer>
  );
};

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  width: 100vw;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
`;

const ContentWrapper = styled.div`
  flex: 1;
  max-width: 1200px;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
  animation: ${fadeIn} 0.5s ease-out;

  @media (max-width: 768px) {
    padding: 1rem;
  }

  @media (max-width: 480px) {
    padding: 0.5rem;
  }
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: all 0.2s;
  box-sizing: border-box;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #f0f0f0;
    border-color: #4a90e2;
    color: #4a90e2;
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.9rem;
    gap: 0.4rem;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1.5rem;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    gap: 0.75rem;
    border-radius: 8px;
    flex-wrap: wrap;
  }
`;

const SettingsIcon = styled.div`
  color: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 480px) {
    svg {
      width: 24px;
      height: 24px;
    }
  }
`;

const TitleText = styled.div`
  flex: 1;
  min-width: 0;

  h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    color: #333;
    word-wrap: break-word;
    overflow-wrap: break-word;

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }

    @media (max-width: 480px) {
      font-size: 1.25rem;
    }
  }

  p {
    margin: 0;
    color: #666;
    font-size: 1rem;
    word-wrap: break-word;
    overflow-wrap: break-word;

    @media (max-width: 480px) {
      font-size: 0.9rem;
    }
  }
`;

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    gap: 1.5rem;
  }

  @media (max-width: 480px) {
    gap: 1rem;
  }
`;

const SettingsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 8px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    gap: 0.5rem;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  color: #333;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const SectionDescription = styled.p`
  color: #666;
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }
`;

const LanguageOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 2px solid ${(props) => (props.$selected ? "#4a90e2" : "#e0e0e0")};
  border-radius: 12px;
  background: ${(props) => (props.$selected ? "#f0f7ff" : "white")};
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  &:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 480px) {
    padding: 1rem;
    gap: 0.75rem;
    border-radius: 8px;
  }
`;

const LanguageFlag = styled.div`
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const LanguageInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

const LanguageName = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const LanguageNativeName = styled.div`
  font-size: 0.875rem;
  color: #666;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

const SelectedIcon = styled.div`
  color: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 480px) {
    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: ${(props) => (props.disabled ? "#ccc" : "#4a90e2")};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: background 0.2s;
  box-sizing: border-box;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #357abd;
  }

  @media (max-width: 480px) {
    padding: 0.875rem;
    font-size: 0.9rem;
    white-space: normal;
  }
`;

const PasswordForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    gap: 1.25rem;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const FormLabel = styled.label`
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const PasswordInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const PasswordInput = styled.input`
  width: 100%;
  padding: 0.875rem 3rem 0.875rem 1rem;
  border: 2px solid ${(props) => (props.$hasError ? "#e74c3c" : "#e0e0e0")};
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #333;
  transition: all 0.2s;
  font-family: inherit;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;

  ${(props) => props.$hasError && `
    background: rgba(231, 76, 60, 0.05);
  `}

  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #b2bec3;
  }

  @media (max-width: 480px) {
    padding: 0.75rem 2.5rem 0.75rem 0.875rem;
    font-size: 0.9rem;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  transition: color 0.2s;
  flex-shrink: 0;
  box-sizing: border-box;

  &:hover {
    color: #4a90e2;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    right: 0.5rem;
    padding: 0.2rem;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const ErrorText = styled.span`
  color: #e74c3c;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  &.submit-error {
    text-align: center;
    display: block;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: rgba(231, 76, 60, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(231, 76, 60, 0.2);
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;

    &.submit-error {
      padding: 0.625rem;
      font-size: 0.8rem;
    }
  }
`;

export default SettingsPage;

