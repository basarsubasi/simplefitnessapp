import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../utils/settingsStorage';
import i18n from '../utils/i18n';
import * as Localization from 'expo-localization'; // <-- import expo-localization
import { requestNotificationPermissions } from '../utils/notificationUtils';

// Helper to get device's preferred time format
const getDeviceTimeFormat = (): '24h' | 'AM/PM' => {
  const locale = Localization.getLocales()[0];
  // h11/h12 are AM/PM, h23/h24 are 24-hour
  if (locale && 'hourCycle' in locale && (locale.hourCycle === 'h11' || locale.hourCycle === 'h12')) {
    return 'AM/PM';
  }
  return '24h';
};

// 1) Create the type for your context values:
type SettingsContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  dateFormat: string;
  setDateFormat: (fmt: string) => void;
  timeFormat: '24h' | 'AM/PM';
  setTimeFormat: (fmt: '24h' | 'AM/PM') => void;
  weightFormat: string;
  setWeightFormat: (fmt: string) => void;
  notificationPermissionGranted: boolean;
  setNotificationPermissionGranted: (granted: boolean) => void;
  requestNotificationPermission: () => Promise<boolean>;
};

// 2) Declare the actual context:
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('dd-mm-yyyy');
  const [timeFormat, setTimeFormat] = useState<'24h' | 'AM/PM'>('24h');
  const [weightFormat, setWeightFormat] = useState('kg');
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);

  // Function to request notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermissions();
    setNotificationPermissionGranted(granted);
    return granted;
  };

  // Load settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      const savedSettings = await loadSettings();
      const deviceTimeFormat = getDeviceTimeFormat();

      if (savedSettings) {
        setLanguage(savedSettings.language || 'en');
        setDateFormat(savedSettings.dateFormat || 'dd-mm-yyyy');
        
        let timeFormatToSet = savedSettings.timeFormat;
        if (timeFormatToSet === '24-Hour') { // Migration from old value
            timeFormatToSet = '24h';
        }
        setTimeFormat(timeFormatToSet || deviceTimeFormat);

        setWeightFormat(savedSettings.weightFormat || 'kg');
        setNotificationPermissionGranted(savedSettings.notificationPermissionGranted || false);
      }
      else {
       const fallbackLng = 'en';
       const defaultLocale = Localization.getLocales()[0]?.languageCode || fallbackLng;
       setLanguage(defaultLocale)
       setTimeFormat(deviceTimeFormat);
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
      await saveSettings({ 
        language, 
        dateFormat, 
        timeFormat,
        weightFormat,
        notificationPermissionGranted,
      });
    };
    persistSettings();
  }, [language, dateFormat, timeFormat, weightFormat, notificationPermissionGranted, isInitialized]);

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        dateFormat,
        setDateFormat,
        timeFormat,
        setTimeFormat,
        weightFormat,
        setWeightFormat,
        notificationPermissionGranted,
        setNotificationPermissionGranted,
        requestNotificationPermission,
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
