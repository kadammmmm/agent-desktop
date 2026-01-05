import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get the resolved theme based on system preference
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

// Get saved theme from localStorage
function getSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem('agent-preferences');
    if (saved) {
      const prefs = JSON.parse(saved);
      if (prefs.theme && ['light', 'dark', 'system'].includes(prefs.theme)) {
        return prefs.theme;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 'system';
}

// Resolve theme to light or dark
function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Target element for theme class - defaults to document.documentElement */
  targetElement?: HTMLElement | null;
}

export function ThemeProvider({ children, targetElement }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getSavedTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(getSavedTheme()));

  // Apply theme class to target element
  const applyTheme = useCallback((resolved: 'light' | 'dark') => {
    const target = targetElement || document.documentElement;
    target.classList.remove('light', 'dark');
    target.classList.add(resolved);
  }, [targetElement]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Save to localStorage (merge with existing preferences)
    try {
      const existing = localStorage.getItem('agent-preferences');
      const prefs = existing ? JSON.parse(existing) : {};
      prefs.theme = newTheme;
      localStorage.setItem('agent-preferences', JSON.stringify(prefs));
    } catch {
      // Ignore storage errors
    }
  }, [applyTheme]);

  // Apply theme on mount and listen for system preference changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Listen for system theme changes when using 'system' theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
