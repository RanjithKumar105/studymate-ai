import React from 'react';
import { Menu, FileText, Sun, Moon, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ onToggleSidebar, sidebarOpen, currentFile, isIndexing, numPages, isConnected }) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'Dark') setTheme('Light');
    else if (theme === 'Light') setTheme('System');
    else setTheme('Dark');
  };

  return (
    <header style={{
      height: '56px',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-app)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.25rem',
      zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Toggle Sidebar Hamburger Menu Button */}
        {(!sidebarOpen || typeof window !== 'undefined') && (
          <button
            onClick={onToggleSidebar}
            className={`header-hamburger-btn ${!sidebarOpen ? 'visible' : ''}`}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '4px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Menu size={20} />
          </button>
        )}

        {/* Brand & Document Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            StudyMate
          </span>

          {isIndexing ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '9999px',
              padding: '3px 12px',
              fontSize: '0.775rem',
              fontWeight: 500,
              color: 'var(--accent-primary)',
            }}>
              <Loader2 size={14} className="spin-icon" />
              <span>Indexing PDF...</span>
            </div>
          ) : currentFile ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '9999px',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              maxWidth: '220px',
              minWidth: 0,
            }}>
              <FileText size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentFile}
              </span>
              <span style={{
                fontWeight: 600,
                color: 'var(--badge-success-text)',
                backgroundColor: 'var(--badge-success-bg)',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontSize: '0.675rem',
                flexShrink: 0,
              }}>
                ✓ Indexed
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right Controls: Connection Status & Theme Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Backend Connection Indicator */}
        <div
          title={isConnected ? 'Backend API Server Connected' : 'Backend API Server Unavailable'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isConnected ? 'var(--badge-success-text)' : 'var(--badge-warning-text)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '3px 10px',
            borderRadius: '9999px',
          }}
        >
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#10B981' : '#EF4444',
            display: 'inline-block',
          }} />
          <span>{isConnected ? 'Connected' : 'Offline'}</span>
        </div>

        {/* Quick Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={`Current Theme: ${theme}`}
          aria-label={`Current Theme: ${theme}. Click to toggle.`}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '5px 10px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {theme === 'Dark' ? <Moon size={14} color="var(--accent-primary)" /> : <Sun size={14} color="var(--accent-primary)" />}
          <span style={{ fontWeight: 500 }}>{theme}</span>
        </button>
      </div>
    </header>
  );
}
