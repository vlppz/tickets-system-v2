import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { themeStyles, useTheme } from '../lib/theme';

function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        ...styles.button,
        ...(compact ? styles.buttonCompact : {})
      }}
      data-hover="neutral"
      title={isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
      aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {!compact && <span>{isDark ? 'Светлая тема' : 'Темная тема'}</span>}
    </button>
  );
}

const styles = themeStyles({
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#374151',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  buttonCompact: {
    padding: '8px',
    minWidth: '36px'
  }
});

export default ThemeToggle;
