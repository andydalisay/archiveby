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
      background: '#1a1a1a',
      cardBackground: '#2d2d2d',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#404040',
      primary: '#4a9eff',
      danger: '#ff4444',
      success: '#44ff44',
    } : {
      background: '#f5f5f5',
      cardBackground: '#ffffff',
      text: '#000000',
      textSecondary: '#666666',
      border: '#dddddd',
      primary: '#007bff',
      danger: '#dc3545',
      success: '#28a745',
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
