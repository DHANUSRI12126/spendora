import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

/**
 * Modern interactive ThemeToggle component.
 * Can be rendered as:
 * - 'button': A stylish circular glassmorphic toggle button for Navbar & Landing page.
 * - 'pill': A pill-shaped segmented selector (Light / Dark / System) for Settings & Profile.
 */
export const ThemeToggle = ({ variant = 'button', className = '' }) => {
  const { theme, resolvedTheme, isDark, toggleTheme, setTheme } = useTheme();

  if (variant === 'pill') {
    return (
      <div 
        className={`theme-segmented-control ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--segmented-bg, rgba(255, 255, 255, 0.05))',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          gap: '4px'
        }}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            background: theme === 'light' ? 'var(--primary)' : 'transparent',
            color: theme === 'light' ? '#ffffff' : 'var(--text-secondary)'
          }}
          title="Light Theme"
        >
          <Sun size={15} /> Light
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            background: theme === 'dark' ? 'var(--primary)' : 'transparent',
            color: theme === 'dark' ? '#ffffff' : 'var(--text-secondary)'
          }}
          title="Dark Theme"
        >
          <Moon size={15} /> Dark
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            background: theme === 'system' ? 'var(--primary)' : 'transparent',
            color: theme === 'system' ? '#ffffff' : 'var(--text-secondary)'
          }}
          title="System Preference"
        >
          <Monitor size={15} /> System
        </button>
      </div>
    );
  }

  // Default 'button' variant for Navbar / Header
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: isDark 
          ? 'rgba(255, 255, 255, 0.04)' 
          : 'rgba(79, 70, 229, 0.08)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(79, 70, 229, 0.2)'}`,
        color: isDark ? '#fbbf24' : '#4f46e5',
        boxShadow: isDark 
          ? '0 2px 10px rgba(0, 0, 0, 0.2)' 
          : '0 2px 10px rgba(79, 70, 229, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        outline: 'none',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.boxShadow = isDark 
          ? '0 4px 15px rgba(251, 191, 36, 0.25)' 
          : '0 4px 15px rgba(79, 70, 229, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = isDark 
          ? '0 2px 10px rgba(0, 0, 0, 0.2)' 
          : '0 2px 10px rgba(79, 70, 229, 0.1)';
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isDark ? 'rotate(0deg)' : 'rotate(360deg)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {isDark ? (
          <Sun size={19} strokeWidth={2.2} />
        ) : (
          <Moon size={19} strokeWidth={2.2} />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
