import React from 'react';
import { Lightbulb, Search, BookOpen, Target } from 'lucide-react';

export default function WelcomeScreen({ onSelectPrompt }) {
  const suggestions = [
    { icon: Lightbulb, title: "What are the key concepts?", query: "What are the key concepts?" },
    { icon: Search, title: "Explain this topic simply", query: "Explain this topic simply" },
    { icon: BookOpen, title: "Summarize this document", query: "Summarize this document" },
    { icon: Target, title: "Give me important exam questions", query: "Give me important exam questions" },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      maxWidth: '780px',
      margin: '0 auto',
      width: '100%',
    }}>
      {/* Responsive Logo Container Card */}
      <div style={{
        backgroundColor: 'var(--logo-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '8px 20px',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src="/studymate-logo.png"
          alt="StudyMate Logo"
          style={{ maxWidth: '140px', width: '100%', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      <h1 style={{
        fontSize: '2rem',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
        marginBottom: '0.25rem',
        textAlign: 'center',
      }}>
        StudyMate
      </h1>

      <p style={{
        fontSize: '1.05rem',
        fontWeight: 600,
        color: 'var(--accent-primary)',
        marginBottom: '0.5rem',
        textAlign: 'center',
      }}>
        Your AI Study Assistant
      </p>

      <p style={{
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        marginBottom: '2rem',
        textAlign: 'center',
        maxWidth: '520px',
      }}>
        Ask questions about your documents using Retrieval-Augmented Generation.
      </p>

      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        marginBottom: '0.85rem',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        Suggested Questions
      </h3>

      {/* Responsive Suggestion Grid */}
      <div className="suggestion-grid">
        {suggestions.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div
              key={idx}
              onClick={() => onSelectPrompt(item.query)}
              role="button"
              tabIndex={0}
              aria-label={`Ask suggested question: ${item.title}`}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem 1.15rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
              className="suggestion-card"
            >
              <div style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent-primary)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <IconComponent size={18} />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {item.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
