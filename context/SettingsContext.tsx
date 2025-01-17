import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../settingsStorage';
import i18n from '../i18n';
import * as Localization from 'expo-localization'; // <-- import expo-localization

// 1) Create the type for your context values:
type SettingsContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  dateFormat: string;
  setDateFormat: (fmt: string) => void;
  weightFormat: string;
  setWeightFormat: (fmt: string) => void;
};

// 2) Declare the actual context:
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('dd-mm-yyyy');
  const [weightFormat, setWeightFormat] = useState('kg');

  // Load settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      const savedSettings = await loadSettings();
      if (savedSettings) {
        setLanguage(savedSettings.language || 'en');
        setDateFormat(savedSettings.dateFormat || 'dd-mm-yyyy');
        setWeightFormat(savedSettings.weightFormat || 'kg');
      }
      else {
       const fallbackLng = 'en';
       const defaultLocale = Localization.getLocales()[0]?.languageCode || fallbackLng;
       setLanguage(defaultLocale)


      }
      setIsInitialized(true);
    };
    initializeSettings();
  }, []);

  // Keep i18n in sync with context
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  // Save settings only after initial load
  useEffect(() => {
    if (!isInitialized) return;
    const persistSettings = async () => {
      await saveSettings({ language, dateFormat, weightFormat });
    };
    persistSettings();
  }, [language, dateFormat, weightFormat, isInitialized]);

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        dateFormat,
        setDateFormat,
        weightFormat,
        setWeightFormat,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// Export a custom hook so consumers can read from our SettingsContext
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
