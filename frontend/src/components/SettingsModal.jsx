import React from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-app)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Settings & Preferences
          </h3>
          <button
            onClick={onClose}
            aria-label="Close settings modal"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Appearance Section */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.65rem' }}>
              Appearance Theme
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { name: 'Light', icon: Sun },
                { name: 'Dark', icon: Moon },
                { name: 'System', icon: Monitor },
              ].map((item) => {
                const IconComp = item.icon;
                const isSelected = theme === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setTheme(item.name)}
                    aria-label={`Set theme to ${item.name}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '0.75rem 0.5rem',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <IconComp size={18} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />

          {/* Architecture / About Section */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              About StudyMate Architecture
            </label>
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.75rem 0.85rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}>
              <div>• <strong>Frontend:</strong> React 18 + Vite SPA</div>
              <div>• <strong>AI Generator:</strong> Google Gemini 3.8 Flash</div>
              <div>• <strong>Vector Index:</strong> FAISS (Flat Inner Product)</div>
              <div>• <strong>Embeddings:</strong> sentence-transformers (all-MiniLM-L6-v2)</div>
              <div>• <strong>Extractor:</strong> PyPDF Text Engine</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
