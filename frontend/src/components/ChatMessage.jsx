import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Copy, RefreshCw, Check, Loader2, AlertCircle } from 'lucide-react';
import Sources from './Sources';

export default function ChatMessage({ message, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;
  const isError = message.isError;

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '1rem 0',
      borderBottom: '1px solid var(--border-color)',
    }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        {isUser ? (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
          }}>
            <User size={18} />
          </div>
        ) : (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'var(--logo-bg)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
          }}>
            <img src="/studymate-logo.png" alt="StudyMate Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header Label & Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            {isUser ? 'You' : 'StudyMate'}
          </span>
          {message.timestamp && (
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              {message.timestamp}
            </span>
          )}
        </div>

        {/* Message Body Content */}
        <div style={{
          fontSize: '0.9rem',
          lineHeight: 1.65,
          color: isError ? '#EF4444' : 'var(--text-primary)',
        }} className="markdown-content">
          {isLoading ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-primary)',
              fontWeight: 500,
              padding: '0.2rem 0'
            }}>
              <Loader2 size={18} className="spin-icon" />
              <span>{message.content || 'Searching document and generating answer...'}</span>
            </div>
          ) : isUser ? (
            <div>
              {message.imagePreview && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <img
                    src={message.imagePreview}
                    alt="Attached input"
                    style={{
                      maxHeight: '160px',
                      maxWidth: '100%',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}
                  />
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
            </div>
          ) : isError ? (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              backgroundColor: 'var(--badge-warning-bg)',
              color: 'var(--badge-warning-text)',
              border: '1px solid var(--badge-warning-border)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{message.content}</div>
            </div>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* AI Action Buttons & Sources */}
        {!isUser && !isLoading && !isError && (
          <div>
            <Sources
              sourcePages={message.source_pages || []}
              retrievedChunks={message.retrieved_chunks || []}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.65rem' }}>
              <button
                onClick={handleCopy}
                title="Copy answer"
                aria-label="Copy answer to clipboard"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {copied ? <Check size={13} color="var(--accent-primary)" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={onRegenerate}
                title="Regenerate answer"
                aria-label="Regenerate answer"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={13} />
                <span>Regenerate</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

