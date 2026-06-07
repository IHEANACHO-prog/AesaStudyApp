// ============================================
// AESA — Theme Context
// PASTE TO: src/contexts/ThemeContext.tsx
// ============================================
// • Default: LIGHT
// • No localStorage — resets to light on every reload
// • Applies data-theme attribute to <html> element
// ============================================

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
  isDark:      boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme:       'light',
  toggleTheme: () => {},
  isDark:      false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Always start as light — no persistence ──────────────────
  const [theme, setTheme] = useState<Theme>('light');

  // ── Apply data-theme to <html> on every change ──────────────
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark',  theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
