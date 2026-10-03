import React, { useState, useRef } from 'react';
import { Plus, Search, MessageSquare, FileText, Settings, X, Trash2, Edit2, Check, Upload, Loader2 } from 'lucide-react';

export default function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeConvId,
  onSelectConv,
  onNewChat,
  onOpenSettings,
  currentFile,
  numPages,
  isIndexing,
  onRenameConv,
  onDeleteConv,
  searchQuery,
  onSearchChange,
  onFileSelect,
  onOpenDocumentPicker,
  documentsList = [],
  activeDocumentId,
  onSelectDocument,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const fileInputRef = useRef(null);

  const startEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEdit = (id, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConv(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = '';
    }
  };

  const filteredConvs = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.doc_name && c.doc_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Hidden PDF File Input (Shared across application) */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar Main Container */}
      <aside
        className={`sidebar-container ${isOpen ? 'open' : ''}`}
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          zIndex: 50,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Top Header & Logo */}
        <div style={{ padding: '1.25rem 1rem 0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: 'var(--logo-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img src="/studymate-logo.png" alt="StudyMate Logo" style={{ height: '24px', width: 'auto', objectFit: 'contain' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              StudyMate
            </span>
          </div>

          {/* Sidebar Close Button (Desktop & Mobile) */}
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            aria-label="Close sidebar"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action: + New Chat Button */}
        <div style={{ padding: '0 1rem 0.75rem 1rem' }}>
          <button
            onClick={() => { onNewChat(); if (isOpen) onClose(); }}
            aria-label="New chat"
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
              transition: 'background-color 0.2s ease',
            }}
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '0 1rem 0.75rem 1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search conversations"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem' }}>
          {/* Section: Recent Chats */}
          <div style={{
            fontSize: '0.725rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            margin: '0.75rem 0.5rem 0.4rem 0.5rem',
          }}>
            Recent Chats
          </div>

          {filteredConvs.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.75rem', textAlign: 'center' }}>
              No chats found
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isActive = conv.id === activeConvId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => { onSelectConv(conv.id); if (isOpen) onClose(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.65rem',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '3px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    <MessageSquare size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} flexShrink={0} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Edit conversation title"
                        style={{
                          background: 'var(--bg-app)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.825rem',
                          width: '100%',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                    ) : (
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: isActive ? 600 : 400,
                      }}>
                        {conv.title}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isEditing ? (
                      <button
                        onClick={(e) => saveEdit(conv.id, e)}
                        aria-label="Save conversation title"
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '2px' }}
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => startEdit(conv, e)}
                          title="Rename chat"
                          aria-label="Rename conversation"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', opacity: 0.7 }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteConv(conv.id); }}
                          title="Delete chat"
                          aria-label="Delete conversation"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', opacity: 0.7 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Section: Documents */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '1.25rem 0.5rem 0.4rem 0.5rem',
          }}>
            <span style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}>
              Documents
            </span>
            {onOpenDocumentPicker && (
              <button
                onClick={onOpenDocumentPicker}
                aria-label="View all documents"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View all{documentsList.length > 0 ? ` (${documentsList.length})` : ''}
              </button>
            )}
          </div>

          {/* Indexing Indicator if active */}
          {isIndexing && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.55rem 0.65rem',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '8px',
              color: 'var(--accent-primary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
            }}>
              <Loader2 size={15} className="spin-icon" />
              <span>Indexing PDF...</span>
            </div>
          )}

          {/* Document List Entries */}
          {documentsList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {documentsList.map((doc) => {
                const isActive = doc.document_id === activeDocumentId || doc.doc_name === currentFile;
                return (
                  <div
                    key={doc.document_id || doc.doc_name}
                    onClick={() => {
                      if (onSelectDocument) onSelectDocument(doc);
                      if (isOpen) onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select document ${doc.doc_name}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileText size={15} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} flexShrink={0} />
                    <span style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      fontWeight: isActive ? 600 : 400,
                    }}>
                      {doc.doc_name}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: '0.675rem',
                        fontWeight: 600,
                        backgroundColor: 'var(--badge-success-bg)',
                        color: 'var(--badge-success-text)',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        flexShrink: 0,
                      }}>
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : currentFile ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                borderLeft: '3px solid var(--accent-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
              }}
            >
              <FileText size={15} color="var(--accent-primary)" flexShrink={0} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, fontWeight: 600 }}>
                {currentFile}
              </span>
              <span style={{
                fontSize: '0.675rem',
                fontWeight: 600,
                backgroundColor: 'var(--badge-success-bg)',
                color: 'var(--badge-success-text)',
                padding: '1px 6px',
                borderRadius: '9999px',
                flexShrink: 0,
              }}>
                Active
              </span>
            </div>
          ) : null}
        </div>

        {/* Bottom Section: Settings Button */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={onOpenSettings}
            aria-label="Settings and appearance"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0.55rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <Settings size={17} color="var(--text-muted)" />
            <span>Settings & Appearance</span>
          </button>
        </div>
      </aside>
    </>
  );
}
