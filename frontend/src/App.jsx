import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import SettingsModal from './components/SettingsModal';
import DocumentPickerModal from './components/DocumentPickerModal';
import {
  checkHealth,
  uploadPdf,
  sendChatMessage,
  analyzeImage,
  getConversations,
  getConversationMessages,
  renameConversation,
  deleteConversation,
  deleteDocument,
} from './api/studymateApi';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 768 : true));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Active Document & Document Library State
  const [documentId, setDocumentId] = useState(null);
  const [currentFile, setCurrentFile] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentsList, setDocumentsList] = useState([]);

  // Chat State
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Backend conversation_id associated with the active chat (SQLite ID)
  const [backendConvId, setBackendConvId] = useState(null);

  // AbortControllers for cancelling active requests
  const uploadAbortControllerRef = useRef(null);
  const chatAbortControllerRef = useRef(null);

  // Check Backend Connection Status on Mount & Load Conversations
  useEffect(() => {
    const initialize = async () => {
      const healthRes = await checkHealth();
      setIsConnected(healthRes.isConnected);

      if (healthRes.isConnected) {
        await loadConversations();
      }
    };
    initialize();
  }, []);

  // Load conversations list from backend
  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      if (res.conversations && res.conversations.length > 0) {
        const convList = res.conversations.map(c => ({
          id: c.id,
          title: c.title || 'Untitled Chat',
          doc_name: c.doc_name || '',
          updated_at: formatRelativeDate(c.updated_at),
          backend_id: c.id,
        }));
        setConversations(convList);
      }
    } catch {
      // Non-critical: conversations just won't load from history
    }
  }, []);

  // Cancel PDF Upload / Indexing Handler
  const handleCancelIndexing = useCallback(() => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort('user_cancel');
      uploadAbortControllerRef.current = null;
    }
    setIsIndexing(false);
    setIndexingStatus('');
    setErrorMessage(null);
  }, []);

  // Cancel Image Processing / Analysis Handler
  const handleCancelImageProcessing = useCallback(() => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort('user_cancel');
      chatAbortControllerRef.current = null;
    }
    setIsGenerating(false);
    setSelectedImage(null);
    setErrorMessage(null);

    if (activeConvId) {
      setMessagesMap(prev => {
        const msgs = prev[activeConvId] || [];
        const filtered = msgs.filter(m => !m.isLoading);
        return {
          ...prev,
          [activeConvId]: filtered,
        };
      });
    }
  }, [activeConvId]);

  const currentMessages = activeConvId ? (messagesMap[activeConvId] || []) : [];

  // 1. Unified PDF File Upload Handler
  const handleFileSelect = async (file) => {
    if (!file) return;

    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort('new_upload');
    }
    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;

    setErrorMessage(null);
    setIsIndexing(true);
    setIndexingStatus('Processing & indexing PDF...');

    try {
      const res = await uploadPdf(file, backendConvId || undefined, controller.signal);

      setDocumentId(res.document_id);
      setCurrentFile(res.doc_name);
      setNumPages(res.num_pages || 0);
      setIndexingStatus('Indexed ✓');

      // Update backend conversation ID if one was created
      const returnedConvId = res.conversation_id;
      if (returnedConvId) {
        setBackendConvId(returnedConvId);
      }

      // Update Document Library List (prevents duplicates)
      const newDocItem = {
        document_id: res.document_id,
        doc_name: res.doc_name,
        num_pages: res.num_pages || 0,
        num_chunks: res.num_chunks || 0,
        uploaded_at: 'Today',
      };

      setDocumentsList(prev => {
        const exists = prev.some(d => d.document_id === res.document_id || d.doc_name === res.doc_name);
        if (exists) {
          return prev.map(d => (d.document_id === res.document_id || d.doc_name === res.doc_name) ? newDocItem : d);
        }
        return [newDocItem, ...prev];
      });

      // Update active chat or create new one in local state
      let convId = activeConvId;
      if (!convId) {
        convId = returnedConvId || `conv-${Date.now()}`;
        setActiveConvId(convId);
      }

      // Sync to conversation list
      setConversations(prev => {
        const exists = prev.some(c => c.id === convId);
        if (exists) {
          return prev.map(c => c.id === convId ? { ...c, doc_name: res.doc_name, title: `Study: ${res.doc_name}` } : c);
        }
        return [{ id: convId, title: `Study: ${res.doc_name}`, doc_name: res.doc_name, updated_at: 'Today', backend_id: returnedConvId }, ...prev];
      });

      // Reload conversations from backend to stay in sync
      await loadConversations();

    } catch (err) {
      if (err.name === 'AbortError' || err.isUserCancel) {
        // Silently reset without displaying an error message to the user
        setIndexingStatus('');
      } else {
        setErrorMessage(err.message || 'Failed to upload PDF.');
        setIndexingStatus('');
      }
    } finally {
      uploadAbortControllerRef.current = null;
      setIsIndexing(false);
      setTimeout(() => {
        setIndexingStatus(prev => prev === 'Indexed ✓' ? '' : prev);
      }, 2500);
    }
  };

  // Select Document from Library
  const handleSelectDocument = (doc) => {
    setDocumentId(doc.document_id);
    setCurrentFile(doc.doc_name);
    setNumPages(doc.num_pages || 0);
    setErrorMessage(null);

    if (activeConvId) {
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, doc_name: doc.doc_name } : c));
    }
  };

  // Detach / Clear Active Document
  const handleDetachDocument = () => {
    setDocumentId(null);
    setCurrentFile('');
    setNumPages(0);
  };

  // Delete Document Handler
  const handleDeleteDocument = async (doc) => {
    if (!doc) return;
    const docId = doc.document_id || doc.doc_name;

    try {
      await deleteDocument(docId);
    } catch {
      // Non-critical: Ignore error if already removed
    }

    setDocumentsList(prev => prev.filter(d => d.document_id !== doc.document_id && d.doc_name !== doc.doc_name));

    const isCurrentActive = (doc.document_id && doc.document_id === documentId) || (doc.doc_name && doc.doc_name === currentFile);
    if (isCurrentActive) {
      setDocumentId(null);
      setCurrentFile('');
      setNumPages(0);
    }
  };

  // 2. Chat Question Submission Handler
  const handleSendMessage = async (text) => {
    setErrorMessage(null);

    if (isGenerating || isIndexing || !text.trim()) {
      return;
    }

    const hasImage = !!selectedImage;
    const hasDoc = !!documentId;

    if (!hasImage && !hasDoc) {
      setErrorMessage('⚠️ Please upload a PDF or attach an image first.');
      return;
    }

    const currentImageAttachment = selectedImage;
    if (hasImage) {
      setSelectedImage(null);
    }

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let convId = activeConvId;

    if (!convId) {
      convId = backendConvId || `conv-${Date.now()}`;
      const newTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
      const newConv = {
        id: convId,
        title: newTitle,
        doc_name: currentFile || (hasImage ? 'Image Q&A' : ''),
        updated_at: 'Today',
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(convId);
    }

    const userMsgId = `msg-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const loadingMsgId = `msg-loading-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Add User Message and Loading Placeholder atomically
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: timeNow,
      imagePreview: currentImageAttachment ? currentImageAttachment.dataUrl : null
    };

    const loadingMsg = {
      id: loadingMsgId,
      role: 'assistant',
      content: hasImage ? 'StudyMate is analyzing the image...' : 'StudyMate is searching your document...',
      timestamp: timeNow,
      isLoading: true
    };

    setMessagesMap(prev => {
      const prevMsgs = prev[convId] || [];
      return {
        ...prev,
        [convId]: [...prevMsgs, userMsg, loadingMsg]
      };
    });

    setIsGenerating(true);

    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort('new_request');
    }
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    try {
      let res;
      if (hasImage) {
        // Mode B: Image question
        const imageFileObj = currentImageAttachment.file || currentImageAttachment;
        res = await analyzeImage(imageFileObj, text, backendConvId || '', controller.signal);
      } else {
        // Mode A: PDF RAG question
        res = await sendChatMessage(text, documentId, backendConvId || '', controller.signal);
      }

      // Update backend conversation ID if returned
      if (res.conversation_id && !backendConvId) {
        setBackendConvId(res.conversation_id);
      }

      const aiMsg = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source_pages: res.source_pages || [],
        retrieved_chunks: res.sources || [],
        type: res.type || (hasImage ? 'image' : 'doc'),
        isLoading: false
      };

      setMessagesMap(prev => {
        const currentMsgs = prev[convId] || [];
        const updated = currentMsgs.map(m => (m.id === loadingMsgId || m.isLoading) ? aiMsg : m);
        return {
          ...prev,
          [convId]: updated
        };
      });

      // Auto-update conversation title from first question
      setConversations(prev => {
        return prev.map(c => {
          if (c.id === convId) {
            const msgs = messagesMap[convId] || [];
            const hasOnlyThisQuestion = msgs.filter(m => m.role === 'user').length <= 1;
            if (hasOnlyThisQuestion && (c.title === 'New Chat' || c.title.startsWith('Study:'))) {
              const autoTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
              return { ...c, title: autoTitle, updated_at: 'Today' };
            }
          }
          return c;
        });
      });

    } catch (err) {
      if (err.name === 'AbortError' || err.isUserCancel) {
        // Clean up loading message silently on user cancel
        setMessagesMap(prev => {
          const currentMsgs = prev[convId] || [];
          const filtered = currentMsgs.filter(m => m.id !== loadingMsgId && !m.isLoading);
          return {
            ...prev,
            [convId]: filtered
          };
        });
      } else {
        const errorMsg = {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: err.message || 'Failed to generate answer. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source_pages: [],
          retrieved_chunks: [],
          isError: true,
          isLoading: false
        };

        setMessagesMap(prev => {
          const currentMsgs = prev[convId] || [];
          const updated = currentMsgs.map(m => (m.id === loadingMsgId || m.isLoading) ? errorMsg : m);
          return {
            ...prev,
            [convId]: updated
          };
        });
      }
    } finally {
      chatAbortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  // 3. New Chat Handler (Preserves active PDF document)
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv = {
      id: newId,
      title: currentFile ? `Study: ${currentFile}` : 'New Chat',
      doc_name: currentFile,
      updated_at: 'Today',
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newId);
    setBackendConvId(null);
    setErrorMessage(null);
  };

  // Load messages from backend when selecting a persisted conversation
  const handleSelectConv = async (id) => {
    setActiveConvId(id);
    setErrorMessage(null);

    const conv = conversations.find(c => c.id === id);
    if (conv && conv.doc_name) {
      setCurrentFile(conv.doc_name);
    }

    // If we have backend_id and no cached messages, load from backend
    const backendId = conv?.backend_id || id;
    if (!messagesMap[id] || messagesMap[id].length === 0) {
      try {
        const res = await getConversationMessages(backendId);
        if (res.messages && res.messages.length > 0) {
          const loadedMsgs = res.messages.map((m, idx) => ({
            id: `msg-loaded-${idx}-${m.id || idx}`,
            role: m.sender,
            content: m.content,
            timestamp: formatTime(m.created_at),
            source_pages: m.source_pages || [],
            retrieved_chunks: m.retrieved_chunks || [],
            isLoading: false,
            isError: false,
          }));
          setMessagesMap(prev => ({ ...prev, [id]: loadedMsgs }));
          setBackendConvId(backendId);
        }
      } catch {
        // Non-critical: message history unavailable
      }
    } else {
      setBackendConvId(backendId);
    }
  };

  const handleRenameConv = async (id, newTitle) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));

    // Persist rename to backend
    const conv = conversations.find(c => c.id === id);
    const backendId = conv?.backend_id || id;
    try {
      await renameConversation(backendId, newTitle);
    } catch {
      // Non-critical: rename didn't persist
    }
  };

  const handleDeleteConv = async (id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    // Clean up messages map
    setMessagesMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (activeConvId === id) {
      setActiveConvId(null);
      setBackendConvId(null);
    }

    // Persist delete to backend
    const conv = conversations.find(c => c.id === id);
    const backendId = conv?.backend_id || id;
    try {
      await deleteConversation(backendId);
    } catch {
      // Non-critical: delete didn't persist
    }
  };

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState(null);

  // Bottom ChatGPT-style Composer
  return (
    <div className="app-container">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConv={handleSelectConv}
        onNewChat={handleNewChat}
        onOpenSettings={() => setSettingsOpen(true)}
        currentFile={currentFile}
        numPages={numPages}
        isIndexing={isIndexing}
        onRenameConv={handleRenameConv}
        onDeleteConv={handleDeleteConv}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFileSelect={handleFileSelect}
        onOpenDocumentPicker={() => setDocPickerOpen(true)}
        documentsList={documentsList}
        activeDocumentId={documentId}
        onSelectDocument={handleSelectDocument}
      />

      {/* Main View Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        {/* Top Status Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          currentFile={currentFile}
          isIndexing={isIndexing}
          numPages={numPages}
          isConnected={isConnected}
        />

        {/* Global Error Banner if present */}
        {errorMessage && (
          <div style={{
            backgroundColor: 'var(--badge-warning-bg)',
            color: 'var(--badge-warning-text)',
            borderBottom: '1px solid var(--badge-warning-border)',
            padding: '0.5rem 1rem',
            fontSize: '0.825rem',
            textAlign: 'center',
            fontWeight: 500,
          }}>
            {errorMessage}
          </div>
        )}

        {/* Scrollable Center Chat Content */}
        <ChatWindow
          messages={currentMessages}
          onSelectPrompt={handleSendMessage}
          onRegenerate={() => {
            const lastUserMsg = [...currentMessages].reverse().find(m => m.role === 'user');
            if (lastUserMsg) {
              handleSendMessage(lastUserMsg.content);
            }
          }}
        />

        {/* Bottom ChatGPT-style Composer */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onUploadClick={(file) => {
            if (file) {
              handleFileSelect(file);
            } else {
              const fileInput = document.querySelector('input[type="file"]');
              if (fileInput) fileInput.click();
            }
          }}
          onBrowseDocuments={() => setDocPickerOpen(true)}
          disabled={isIndexing || isGenerating}
          currentFile={currentFile}
          numPages={numPages}
          isIndexing={isIndexing}
          indexingStatus={indexingStatus}
          onDetachDocument={handleDetachDocument}
          selectedImage={selectedImage}
          onSelectImage={(img) => setSelectedImage(img)}
          onRemoveImage={() => setSelectedImage(null)}
          onCancelIndexing={handleCancelIndexing}
          onCancelImageProcessing={handleCancelImageProcessing}
          isGenerating={isGenerating}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Document Library Picker Modal */}
      <DocumentPickerModal
        isOpen={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        documents={documentsList}
        activeDocumentId={documentId}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
        onUploadClick={() => {
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.click();
        }}
      />
    </div>
  );
}


// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d >= today) return 'Today';
    if (d >= yesterday) return 'Yesterday';
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}


export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
