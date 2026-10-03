import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('studymate_theme') || 'System';
  });

  useEffect(() => {
    localStorage.setItem('studymate_theme', theme);

    const applyTheme = () => {
      let activeTheme = theme;
      if (theme === 'System') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        activeTheme = theme.toLowerCase();
      }
      document.documentElement.setAttribute('data-theme', activeTheme);
    };

    applyTheme();

    if (theme === 'System') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
