'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const DEFAULT_THEME: Theme = 'dark';
const THEME_STORAGE_KEY = 'theme';
const THEME_CHANGE_EVENT = 'vibecraft-theme-change';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: DEFAULT_THEME, toggle: () => {} });

function getStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function getClientTheme(): Theme {
  return getStoredTheme() ?? (
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  );
}

function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  return getClientTheme();
}

function getServerThemeSnapshot(): Theme {
  return DEFAULT_THEME;
}

function setClientTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribeToTheme(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) callback();
  };
  const handleSystemThemeChange = () => {
    if (!getStoredTheme()) callback();
  };

  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener('storage', handleStorage);
  mediaQuery.addEventListener('change', handleSystemThemeChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setClientTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
