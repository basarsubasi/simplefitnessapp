import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { loadSettings, saveSettings } from '../utils/settingsStorage';
import i18n from '../utils/i18n';
import * as Localization from 'expo-localization';

// Helper to get device's preferred time format
const getDeviceTimeFormat = (): '24h' | 'AM/PM' => {
  const locale = Localization.getLocales()[0];
  if (locale?.regionCode === 'US') {
    return 'AM/PM';
  }
  return '24h';
};

// NEW HELPER: Get device's preferred date format based on region
const getDeviceDateFormat = (): 'mm-dd-yyyy' | 'dd-mm-yyyy' => {
  const locale = Localization.getLocales()[0];
  // US & Canada are primary regions using MM-DD-YYYY
  if (locale?.regionCode === 'US' || locale?.regionCode === 'CA') {
    return 'mm-dd-yyyy';
  }
  // Default to DD-MM-YYYY for most other regions
  return 'dd-mm-yyyy';
};

// NEW HELPER: Get device's preferred measurement system for weight
const getDeviceWeightFormat = (): 'lbs' | 'kg' => {
  const locale = Localization.getLocales()[0];
  // 'imperial' is used in regions like the US
  if (locale?.measurementSystem === 'us') {
    return 'lbs';
  }
  // Default to 'metric' (kg)
  return 'kg';
};

// NEW HELPER: Get device's first day of the week based on region
const getDeviceFirstWeekday = (): 'Sunday' | 'Monday' => {
  const locale = Localization.getLocales()[0];
  const sundayFirstRegions = ['JP', 'US', 'CA', 'BR', 'KR'];
  if (
    locale?.regionCode &&
    sundayFirstRegions.includes(locale.regionCode.toUpperCase())
  ) {
    return 'Sunday';
  }
  return 'Monday';
};

// 1) Create the type for your context values:
type SettingsContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  dateFormat: string;
  setDateFormat: (fmt: string) => void;
  weightFormat: string;
  setWeightFormat: (fmt: string) => void;
  firstWeekday: 'Sunday' | 'Monday';
  setFirstWeekday: (day: 'Sunday' | 'Monday') => void;
};

// 2) Declare the actual context:
const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('dd-mm-yyyy');
  const [weightFormat, setWeightFormat] = useState('kg');
  const [firstWeekday, setFirstWeekday] = useState<'Sunday' | 'Monday'>(
    'Monday',
  );



  // Load settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      const savedSettings = await loadSettings();
      // MODIFIED: Get all device formats at once
      const deviceTimeFormat = getDeviceTimeFormat();
      const deviceDateFormat = getDeviceDateFormat();
      const deviceWeightFormat = getDeviceWeightFormat();
      const deviceFirstWeekday = getDeviceFirstWeekday();

      if (savedSettings) {
        setLanguage(savedSettings.language || 'en');
        // MODIFIED: Use device format as fallback
        setDateFormat(savedSettings.dateFormat || deviceDateFormat);
        setWeightFormat(savedSettings.weightFormat || deviceWeightFormat);
        setFirstWeekday(savedSettings.firstWeekday || deviceFirstWeekday);

      } else {
        const fallbackLng = 'en';
        const defaultLocale =
          Localization.getLocales()[0]?.languageCode || fallbackLng;
        setLanguage(defaultLocale);
        // ADDED: Initialize state based on device format
        setDateFormat(deviceDateFormat);
        setWeightFormat(deviceWeightFormat);
        setFirstWeekday(deviceFirstWeekday);
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
        weightFormat,
        firstWeekday,
      });
    };
    persistSettings();
  }, [
    language,
    dateFormat,
    weightFormat,
    firstWeekday,
    isInitialized,
  ]);

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        dateFormat,
        setDateFormat,
        weightFormat,
        setWeightFormat,
        firstWeekday,
        setFirstWeekday,
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