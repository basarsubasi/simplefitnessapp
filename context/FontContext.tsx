import React, { createContext, useContext} from 'react';
import { 
  useFonts,
  NotoSansSC_400Regular,
} from '@expo-google-fonts/noto-sans-sc';
import { 
  NotoSansJP_400Regular,
} from '@expo-google-fonts/noto-sans-jp';
import { 
  NotoSansKR_400Regular,
} from '@expo-google-fonts/noto-sans-kr';
import { useSettings } from './SettingsContext';
import { TextStyle } from 'react-native';

// Define the type for our context
type FontContextType = {
  fontLoaded: boolean;
  getCJKFontStyle: () => TextStyle;
};

// Create the context
const FontContext = createContext<FontContextType | undefined>(undefined);

// Font mapping for CJK languages
const CJK_FONT_MAP: Record<string, string> = {
  zh: 'NotoSansSC_400Regular',
  ja: 'NotoSansJP_400Regular',
  ko: 'NotoSansKR_400Regular',
};

export function FontProvider({ children }: { children: React.ReactNode }) {
  const { language } = useSettings();
  
  // Load only the CJK fonts
  const [fontsLoaded] = useFonts({
    NotoSansSC_400Regular,
    NotoSansJP_400Regular,
    NotoSansKR_400Regular,
  });
  
  // Function to get font style only if needed for CJK languages
  const getCJKFontStyle = (): TextStyle => {
    if (fontsLoaded && language in CJK_FONT_MAP) {
      return { fontFamily: CJK_FONT_MAP[language] };
    }
    return {};
  };
  
  return (
    <FontContext.Provider
      value={{
        fontLoaded: fontsLoaded,
        getCJKFontStyle,
      }}
    >
      {children}
    </FontContext.Provider>
  );
}

// Custom hook to use the font context
export function useFont() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
} 