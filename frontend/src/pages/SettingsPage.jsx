import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HomeButton from "../components/ui/HomeButton";
import { UseAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Settings, Globe, Check, ArrowLeft } from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = UseAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [saving, setSaving] = useState(false);

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
      // Optionally show success message
    }, 300);
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
        <HomeButton nav ="/books" />
        
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

          {/* Future settings sections can be added here */}
        </SettingsContainer>
      </ContentWrapper>
      <Footer />
    </PageContainer>
  );
};

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  width: 100vw;
`;

const ContentWrapper = styled.div`
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
  position: relative;
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

  &:hover {
    background: #f0f0f0;
    border-color: #4a90e2;
    color: #4a90e2;
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
`;

const SettingsIcon = styled.div`
  color: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TitleText = styled.div`
  h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 1rem;
  }
`;

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SettingsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  color: #333;
`;

const SectionDescription = styled.p`
  color: #666;
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
`;

const LanguageOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
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

  &:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const LanguageFlag = styled.div`
  font-size: 2rem;
  line-height: 1;
`;

const LanguageInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const LanguageName = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
`;

const LanguageNativeName = styled.div`
  font-size: 0.875rem;
  color: #666;
`;

const SelectedIcon = styled.div`
  color: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
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

  &:hover:not(:disabled) {
    background: #357abd;
  }
`;

export default SettingsPage;

