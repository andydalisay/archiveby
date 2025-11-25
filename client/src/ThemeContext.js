import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const theme = {
    darkMode,
    toggleDarkMode,
    colors: darkMode ? {
      // Dark Amigo theme
      background: '#2d2d2d',
      cardBackground: '#393D3F',
      text: '#F6F6EF',
      textSecondary: '#B5B5B5',
      border: '#4d4d4d',
      primary: '#FECAC5',
      primaryHover: '#FEE5E1',
      secondary: '#B5F2E6',
      danger: '#FF9B9B',
      success: '#B5F2E6',
      accent: '#B5F2E6',
      navy: '#393D3F',
      navyDark: '#2d2d2d',
      pink: '#FECAC5',
      pinkLight: '#FEE5E1',
      skyMint: '#B5F2E6',
      softCoral: '#FECAC5',
      canvasLight: '#F6F6EF',
      amigoInk: '#393D3F',
      shadow: 'rgba(0, 0, 0, 0.2)',
      shadowLg: 'rgba(0, 0, 0, 0.3)',
    } : {
      // Light Amigo theme - soft, muted palette
      background: '#F6F6EF',
      cardBackground: '#FFFFFF',
      text: '#393D3F',
      textSecondary: '#6B6B6B',
      border: '#E8E8E0',
      primary: '#FECAC5',
      primaryHover: '#FDB8B2',
      secondary: '#B5F2E6',
      danger: '#FF9B9B',
      success: '#B5F2E6',
      accent: '#393D3F',
      navy: '#393D3F',
      navyDark: '#2d2d2d',
      pink: '#FECAC5',
      pinkLight: '#FEE5E1',
      skyMint: '#B5F2E6',
      softCoral: '#FECAC5',
      canvasLight: '#F6F6EF',
      amigoInk: '#393D3F',
      shadow: 'rgba(57, 61, 63, 0.06)',
      shadowLg: 'rgba(57, 61, 63, 0.12)',
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
