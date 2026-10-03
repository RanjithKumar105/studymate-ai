import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function Sources({ sourcePages = [], retrievedChunks = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!sourcePages.length && !retrievedChunks.length) return null;

  return (
    <div style={{
      marginTop: '0.75rem',
      paddingTop: '0.65rem',
      borderTop: '1px dashed var(--border-color)',
    }}>
      {/* Page Badges Bar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>
          Sources:
        </span>
        {sourcePages.map((page, i) => (
          <span
            key={i}
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileText size={12} />
            <span>Page {page}</span>
          </span>
        ))}
      </div>

      {/* View Sources Toggle */}
      {retrievedChunks.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontSize: '0.775rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 0',
            }}
          >
            <span>{expanded ? 'Hide retrieved sources' : 'View retrieved sources'}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Expanded Retrieved Chunks Detail */}
          {expanded && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {retrievedChunks.map((chunk, idx) => {
                const scoreFmt = typeof chunk.score === 'number' ? chunk.score.toFixed(2) : 'N/A';
                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.85rem',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      marginBottom: '0.35rem',
                    }}>
                      <span>📄 Page {chunk.page}</span>
                      <span>Retrieval score: {scoreFmt}</span>
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.45',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {chunk.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
