import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'tickets-system-theme';
const THEME_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext(null);

const COLOR_TOKEN_MAP = [
  ['rgba(59, 130, 246, 0.5)', 'var(--color-brand-glow)'],
  ['rgba(59, 130, 246, 0.2)', 'var(--color-brand-selection)'],
  ['rgba(59, 130, 246, 0.1)', 'var(--color-brand-ring)'],
  ['rgba(0, 0, 0, 0.15)', 'var(--shadow-strong)'],
  ['rgba(0, 0, 0, 0.1)', 'var(--shadow-medium)'],
  ['rgba(0, 0, 0, 0.05)', 'var(--shadow-soft)'],
  ['rgba(0, 0, 0, 0.5)', 'var(--overlay)'],
  ['#eff6ff', 'var(--color-brand-surface)'],
  ['#dbeafe', 'var(--color-brand-surface-strong)'],
  ['#bfdbfe', 'var(--color-brand-surface-hover)'],
  ['#fecaca', 'var(--color-danger-border)'],
  ['#fee2e2', 'var(--color-danger-surface)'],
  ['#f9fafb', 'var(--color-surface-muted)'],
  ['#f3f4f6', 'var(--color-surface-subtle)'],
  ['#e5e7eb', 'var(--color-border)'],
  ['#d1d5db', 'var(--color-border-strong)'],
  ['#10b981', 'var(--color-success)'],
  ['#dc2626', 'var(--color-danger)'],
  ['#9ca3af', 'var(--color-text-dim)'],
  ['#6b7280', 'var(--color-text-muted)'],
  ['#4b5563', 'var(--color-text-secondary)'],
  ['#374151', 'var(--color-text-secondary)'],
  ['#1f2937', 'var(--color-text-primary)'],
  ['#111827', 'var(--color-text-strong)'],
  ['#2563eb', 'var(--color-brand-hover)'],
  ['#1e40af', 'var(--color-brand-text)'],
  ['#3b82f6', 'var(--color-brand)'],
  ['#ffffff', 'var(--color-surface)']
];

function replaceThemeTokens(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return COLOR_TOKEN_MAP.reduce(
    (output, [literal, token]) => output.replaceAll(literal, token),
    value
  );
}

function convertStyleValue(value) {
  if (Array.isArray(value)) {
    return value.map(convertStyleValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, convertStyleValue(nestedValue)])
    );
  }

  return replaceThemeTokens(value);
}

function getPreferredTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
}

export function themeValue(value) {
  return replaceThemeTokens(value);
}

export function themeStyles(styles) {
  return convertStyleValue(styles);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getPreferredTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme: () => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
