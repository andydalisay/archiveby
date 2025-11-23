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
      // Dark modern theme - navy & pink
      background: '#0f1419',
      cardBackground: '#1a1f2e',
      text: '#f7f9fc',
      textSecondary: '#8b95a8',
      border: '#2a3441',
      primary: '#ffb3c1',
      primaryHover: '#ffc4d0',
      secondary: '#1e3a5f',
      danger: '#ff6b9d',
      success: '#4ade80',
      accent: '#ffd4e0',
      navy: '#1e3a5f',
      navyDark: '#152844',
      pink: '#ffb3c1',
      pinkLight: '#ffd4e0',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLg: 'rgba(0, 0, 0, 0.5)',
    } : {
      // Light modern theme - navy & pale pink
      background: '#f8f9fd',
      cardBackground: '#ffffff',
      text: '#1a2332',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      primary: '#ffb3c1',
      primaryHover: '#ff9eb3',
      secondary: '#1e3a5f',
      danger: '#ff6b9d',
      success: '#10b981',
      accent: '#1e3a5f',
      navy: '#1e3a5f',
      navyDark: '#152844',
      pink: '#ffb3c1',
      pinkLight: '#ffeef3',
      shadow: 'rgba(30, 58, 95, 0.08)',
      shadowLg: 'rgba(30, 58, 95, 0.15)',
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
