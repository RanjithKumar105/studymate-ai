import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Check, Upload, Layers, Trash2 } from 'lucide-react';

export default function DocumentPickerModal({
  isOpen,
  onClose,
  documents = [],
  activeDocumentId,
  onSelectDocument,
  onUploadClick,
  onDeleteDocument,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [docToDelete, setDocToDelete] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (docToDelete) {
          setDocToDelete(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, docToDelete]);

  if (!isOpen) return null;

  const filteredDocs = documents.filter((doc) =>
    doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} color="var(--accent-primary)" />
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Your Documents
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close document modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Upload Button */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                width: '100%',
              }}
              autoFocus
            />
          </div>

          <button
            onClick={() => {
              onClose();
              onUploadClick();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Upload size={15} />
            <span>Upload PDF</span>
          </button>
        </div>

        {/* Document List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
          {filteredDocs.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                {searchTerm ? 'No documents match your search.' : 'No uploaded documents yet.'}
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                Upload a PDF to start asking questions.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isActive = doc.document_id === activeDocumentId;

              return (
                <div
                  key={doc.document_id}
                  onClick={() => {
                    onSelectDocument(doc);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-card)',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-app)',
                        color: isActive ? '#FFFFFF' : 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={20} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {doc.doc_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--badge-success-bg)',
                            color: 'var(--badge-success-text)',
                            border: '1px solid var(--badge-success-border)',
                            padding: '1px 7px',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Check size={11} /> Indexed
                        </span>
                        {doc.num_pages > 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            • {doc.num_pages} pages
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                    {isActive && (
                      <div
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: '#FFFFFF',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={15} />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocToDelete(doc);
                      }}
                      title="Delete document"
                      aria-label={`Delete ${doc.doc_name}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      className="doc-delete-btn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Dialog Popover */}
      {docToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.15s ease forwards',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setDocToDelete(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '410px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4
              style={{
                margin: '0 0 0.5rem 0',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Delete document?
            </h4>
            <p
              style={{
                margin: '0 0 1.25rem 0',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{docToDelete.doc_name}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetDoc = docToDelete;
                  setDocToDelete(null);
                  if (onDeleteDocument) {
                    await onDeleteDocument(targetDoc);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
