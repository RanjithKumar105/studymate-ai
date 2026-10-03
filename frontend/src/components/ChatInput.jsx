import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, FileText, FolderOpen, Paperclip, Image, Camera, X, Loader2, Check } from 'lucide-react';
import CameraModal from './CameraModal';
import './ChatComposer.css';

export default function ChatInput({
  onSendMessage,
  onUploadClick,
  onBrowseDocuments,
  disabled,
  currentFile,
  numPages,
  isIndexing,
  indexingStatus,
  onDetachDocument,
  selectedImage,
  onSelectImage,
  onRemoveImage,
  onCancelIndexing,
  onCancelImageProcessing,
  isGenerating,
}) {
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const plusBtnRef = useRef(null);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check if image processing / Q&A analysis is active
  const isProcessingImage = selectedImage && isGenerating;
  const isProcessing = isIndexing || isProcessingImage;

  // Determine if send is possible
  const canSend = (text.trim() || selectedImage) && !disabled && !isProcessing;

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        plusBtnRef.current && !plusBtnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        plusBtnRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (canSend) {
      onSendMessage(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [canSend, text, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
      const isAllowed = allowedExts.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isAllowed) {
        alert('⚠️ Unsupported image format. Please select a .jpg, .jpeg, .png, or .webp image file.');
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('⚠️ Image size exceeds 10MB limit. Please select a smaller file.');
        e.target.value = '';
        return;
      }
      const dataUrl = URL.createObjectURL(file);
      if (onSelectImage) {
        onSelectImage({ file, dataUrl, name: file.name, type: 'image', source: 'upload' });
      }
      e.target.value = '';
    }
  };

  const handleGeneralFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        onUploadClick(file);
      } else {
        alert('⚠️ Unsupported document format. Only .pdf files are supported for document study Q&A.');
      }
      e.target.value = '';
    }
  };

  const handleCancelClick = () => {
    if (isIndexing && onCancelIndexing) {
      onCancelIndexing();
    } else if (isProcessingImage && onCancelImageProcessing) {
      onCancelImageProcessing();
    } else if (onCancelIndexing) {
      onCancelIndexing();
    }
  };

  const menuItems = [
    {
      id: 'upload-pdf',
      icon: Paperclip,
      label: 'Upload PDF',
      desc: 'Upload a document for Q&A',
      onClick: () => {
        setMenuOpen(false);
        fileInputRef.current?.click();
      },
    },
    {
      id: 'upload-image',
      icon: Image,
      label: 'Upload Image',
      desc: 'Choose an image from your device',
      onClick: () => {
        setMenuOpen(false);
        photoInputRef.current?.click();
      },
    },
    {
      id: 'take-picture',
      icon: Camera,
      label: 'Take Picture',
      desc: 'Use your camera to capture',
      onClick: () => {
        setMenuOpen(false);
        setCameraOpen(true);
      },
    },
    {
      id: 'browse-docs',
      icon: FolderOpen,
      label: 'Browse Documents',
      desc: 'Search your StudyMate library',
      onClick: () => {
        setMenuOpen(false);
        onBrowseDocuments();
      },
    },
  ];

  const hasAttachments = currentFile || isIndexing || selectedImage;

  // Placeholder logic per Requirement 12
  const getPlaceholder = () => {
    if (selectedImage) {
      return "Ask anything about this image...";
    }
    if (currentFile || isIndexing) {
      return "Ask anything about your document...";
    }
    return "Upload a PDF or image to get started...";
  };

  const getProcessingText = () => {
    if (isIndexing) {
      return indexingStatus || 'Processing & indexing PDF...';
    }
    if (selectedImage?.source === 'camera') {
      return '📷 Processing image...';
    }
    return '🖼️ Processing image...';
  };

  return (
    <div className="composer-root">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleGeneralFileChange}
        aria-label="Upload PDF file"
      />
      <input
        type="file"
        ref={photoInputRef}
        accept=".jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={handlePhotoFileChange}
        aria-label="Upload image file"
      />

      {/* Plus Attachment Popover Menu */}
      {menuOpen && (
        <>
          <div
            className="composer-menu-overlay"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            className="composer-menu"
            role="menu"
            aria-label="Attachment options"
          >
            {menuItems.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="composer-menu-item"
                  role="menuitem"
                  onClick={item.onClick}
                >
                  <div className="composer-menu-item-icon">
                    <IconComp size={17} />
                  </div>
                  <div>
                    <div className="composer-menu-item-label">{item.label}</div>
                    <div className="composer-menu-item-desc">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Attachments Preview Area */}
      <div className={`composer-attachments ${hasAttachments ? 'has-items' : ''}`}>
        {/* PDF Attachment Chip */}
        {(currentFile || isIndexing) && (
          <div className="attachment-chip">
            {isIndexing ? (
              <>
                <Loader2 size={16} className="spin-icon" color="var(--accent-primary)" />
                <span className="attachment-chip-status">
                  {indexingStatus || 'Processing & indexing PDF...'}
                </span>
                <button
                  type="button"
                  className="attachment-remove-btn"
                  onClick={handleCancelClick}
                  title="Cancel upload"
                  aria-label="Cancel upload"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <FileText size={16} color="var(--accent-primary)" />
                <span className="attachment-chip-name">{currentFile}</span>
                <span className="attachment-chip-badge">
                  <Check size={10} /> Indexed
                </span>
                {numPages > 0 && (
                  <span className="attachment-chip-pages">({numPages} pgs)</span>
                )}
                {onDetachDocument && (
                  <button
                    type="button"
                    className="attachment-remove-btn"
                    onClick={onDetachDocument}
                    title="Remove document attachment"
                    aria-label="Remove document attachment"
                  >
                    <X size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Image / Photo Attachment Chip */}
        {selectedImage && (
          <div className="attachment-image-chip">
            {selectedImage.dataUrl ? (
              <img
                src={selectedImage.dataUrl}
                alt="Attachment preview"
                className="attachment-image-thumb"
              />
            ) : (
              <Image size={18} color="var(--accent-primary)" />
            )}
            <div className="attachment-image-info">
              <span className="attachment-image-name">
                {selectedImage.name || 'photo.png'}
              </span>
              <span className="attachment-image-label">
                {isProcessingImage ? 'Processing...' : 'Image Question Mode'}
              </span>
            </div>
            {(onRemoveImage || onCancelImageProcessing) && (
              <button
                type="button"
                className="attachment-remove-btn"
                onClick={isProcessingImage ? onCancelImageProcessing : onRemoveImage}
                title="Cancel upload"
                aria-label="Cancel upload"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modern Composer Input Box */}
      <form
        onSubmit={handleSubmit}
        className={`composer-form ${isProcessing ? 'is-processing' : ''}`}
      >
        {/* Plus (+) Button */}
        <button
          ref={plusBtnRef}
          type="button"
          className={`composer-plus-btn ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          title="Add attachments or browse documents"
          aria-label="Add attachments"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          disabled={isProcessing}
        >
          <Plus size={18} strokeWidth={2.2} />
        </button>

        {isProcessing ? (
          /* Processing State View inside composer bar */
          <div className="composer-processing-bar">
            <Loader2 size={16} className="spin-icon processing-spinner" />
            <span className="composer-processing-text">
              {getProcessingText()}
            </span>
          </div>
        ) : (
          /* Text Area when idle */
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            rows={1}
            disabled={disabled}
            aria-label="Message input"
          />
        )}

        {/* Action Button: Cancel (X) when processing, Send when normal */}
        {isProcessing ? (
          <button
            type="button"
            className="composer-cancel-btn"
            onClick={handleCancelClick}
            title="Cancel upload"
            aria-label="Cancel upload"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        ) : (
          <button
            type="submit"
            className={`composer-send-btn ${
              disabled ? 'loading' : canSend ? 'enabled' : ''
            }`}
            disabled={!canSend}
            title={canSend ? 'Send message' : 'Type a message to send'}
            aria-label="Send message"
          >
            {disabled ? (
              <Loader2 size={16} className="spin-icon" />
            ) : (
              <Send size={16} />
            )}
          </button>
        )}
      </form>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(imgData) => {
          if (onSelectImage) {
            onSelectImage({ ...imgData, source: 'camera' });
          }
        }}
      />
    </div>
  );
}
