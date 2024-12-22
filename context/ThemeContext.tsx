import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Appearance } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Define the themes
const LightTheme = {
  type: 'light',
  background: '#FFFFFF',
  text: '#000000',
  card: '#F7F7F7',
  border: 'rgba(0, 0, 0, 0.2)',
  buttonBackground: '#000000',
  buttonText: '#FFFFFF',
  homeCardColor1: '#000000',
  homeCardColor2:'#D3D3D3',
  homeCardColor3:'#808080',
  homeButtonColor1:'#FFFFFF',
  homeButtonColor2:'#505050',
  homeButtonColor3:'#000000',
  homeButtonText1: '#000000',
  homeButtonText2:'#FFFFFF',
  homeButtonText3:'#FFFFFF',
  homeCardText1: 'white',
  homeCardText2: 'white',
  inactivetint: 'rgba(0, 0, 0, 0.2)',
  logborder:'rgba(0, 0, 0, 0.2)'
};

const DarkTheme = {
  type: 'dark',
  background: '#121212',
  text: 'white',
  card: '#1E1E1E',
  border: 'rgba(125, 125, 125, 0.1)',
  buttonBackground: 'white',
  buttonText: 'black',
  homeCardColor1: '#1E1E1E',
  homeCardColor2:'#1E1E1E',
  homeCardColor3:'#1E1E1E',
  homeButtonColor1:'#FFFFFF',
  homeButtonColor2:'#FFFFFF',
  homeButtonColor3:'#FFFFFF',
  homeButtonText1: '#000000',
  homeButtonText2:'#000000',
  homeButtonText3:'#000000',
  homeCardText1: 'white',
  homeCardText2: 'white',
  inactivetint: 'rgba(245, 245, 245, 0.1)',
  logborder:'rgba(245, 245, 245, 0.1)'
};

// Context for theme management
const ThemeContext = createContext({
  theme: LightTheme, // Default theme
  toggleTheme: () => {}, // Default placeholder function
});

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState(LightTheme);

  const themeFilePath = `${FileSystem.documentDirectory}theme.json`;

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await FileSystem.readAsStringAsync(themeFilePath);
        setTheme(storedTheme === 'dark' ? DarkTheme : LightTheme);
      } catch {
        const colorScheme = Appearance.getColorScheme();
        setTheme(colorScheme === 'dark' ? DarkTheme : LightTheme);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === LightTheme ? DarkTheme : LightTheme;
    setTheme(newTheme);
    await FileSystem.writeAsStringAsync(themeFilePath, theme === LightTheme ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
