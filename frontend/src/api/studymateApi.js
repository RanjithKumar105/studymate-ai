/**
 * studymateApi.js — React frontend API layer for StudyMate Flask backend.
 *
 * Endpoints:
 *   - GET  /api/health
 *   - POST /api/upload
 *   - POST /api/chat
 *   - GET  /api/conversations
 *   - POST /api/conversations
 *   - GET  /api/conversations/:id
 *   - PUT  /api/conversations/:id
 *   - DELETE /api/conversations/:id
 *   - GET  /api/conversations/:id/messages
 *   - GET  /api/documents
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Default timeout for API requests (60 seconds for Gemini calls)
const DEFAULT_TIMEOUT_MS = 60000;
// Upload may take longer for large PDFs + embedding
const UPLOAD_TIMEOUT_MS = 120000;

/**
 * Helper: fetch with timeout and unified error handling.
 */
async function apiFetch(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);

  const externalSignal = options.signal;
  const onExternalAbort = () => {
    controller.abort('user_cancel');
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort('user_cancel');
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const { signal: _, ...fetchOptions } = options;

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }

    // Try to parse JSON (even error responses from Flask are JSON)
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Server returned an invalid response. Please try again.');
    }

    if (!res.ok) {
      // Rate limit handling
      if (res.status === 429) {
        throw new Error('⚠️ Gemini API rate limit reached. Please wait a moment and try again.');
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }

    if (err.name === 'AbortError') {
      if (externalSignal?.aborted || controller.signal.reason === 'user_cancel') {
        const cancelErr = new Error('Operation cancelled by user.');
        cancelErr.name = 'AbortError';
        cancelErr.isUserCancel = true;
        throw cancelErr;
      }
      throw new Error('⏱️ Request timed out. The server may be busy — please try again.');
    }
    if (err.name === 'TypeError') {
      throw new Error('🔌 Backend server is unreachable. Please ensure server.py is running on port 5000.');
    }
    throw err;
  }
}


// ──────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────

export async function checkHealth() {
  try {
    const data = await apiFetch(`${API_BASE_URL}/health`, {}, 8000);
    return { isConnected: data.status === 'ok', message: data.message };
  } catch {
    return { isConnected: false, message: 'Backend server unavailable' };
  }
}


// ──────────────────────────────────────────────
// PDF Upload
// ──────────────────────────────────────────────

export async function uploadPdf(file, conversationId = null, signal = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (conversationId) {
    formData.append('conversation_id', conversationId);
  }

  return apiFetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
    signal,
  }, UPLOAD_TIMEOUT_MS);
}


// ──────────────────────────────────────────────
// RAG Chat
// ──────────────────────────────────────────────

export async function sendChatMessage(question, documentId, conversationId = null, signal = null) {
  return apiFetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      document_id: documentId,
      conversation_id: conversationId || '',
    }),
    signal,
  });
}


// ──────────────────────────────────────────────
// Image Multimodal Q&A
// ──────────────────────────────────────────────

function dataURLtoBlob(dataurl) {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
}

export async function analyzeImage(imageFileOrBlob, question, conversationId = null, signal = null) {
  let blobToUpload = imageFileOrBlob;

  if (imageFileOrBlob && typeof imageFileOrBlob === 'object' && !(imageFileOrBlob instanceof Blob) && !(imageFileOrBlob instanceof File)) {
    if (imageFileOrBlob.file && (imageFileOrBlob.file instanceof Blob || imageFileOrBlob.file instanceof File)) {
      blobToUpload = imageFileOrBlob.file;
    } else if (imageFileOrBlob.dataUrl && typeof imageFileOrBlob.dataUrl === 'string') {
      blobToUpload = dataURLtoBlob(imageFileOrBlob.dataUrl) || imageFileOrBlob;
    }
  } else if (typeof imageFileOrBlob === 'string' && imageFileOrBlob.startsWith('data:')) {
    blobToUpload = dataURLtoBlob(imageFileOrBlob) || imageFileOrBlob;
  }

  const formData = new FormData();
  const filename = (blobToUpload && blobToUpload.name) || (imageFileOrBlob && imageFileOrBlob.name) || 'image.png';
  formData.append('image', blobToUpload, filename);
  formData.append('question', question);
  if (conversationId) {
    formData.append('conversation_id', conversationId);
  }

  return apiFetch(`${API_BASE_URL}/analyze-image`, {
    method: 'POST',
    body: formData,
    signal,
  }, DEFAULT_TIMEOUT_MS);
}




// ──────────────────────────────────────────────
// Conversation Management
// ──────────────────────────────────────────────

export async function getConversations(searchQuery = '') {
  const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
  return apiFetch(`${API_BASE_URL}/conversations${params}`);
}

export async function createConversation(title = 'New Chat', docName = null) {
  return apiFetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, doc_name: docName }),
  });
}

export async function getConversation(convId) {
  return apiFetch(`${API_BASE_URL}/conversations/${encodeURIComponent(convId)}`);
}

export async function renameConversation(convId, newTitle) {
  return apiFetch(`${API_BASE_URL}/conversations/${encodeURIComponent(convId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: newTitle }),
  });
}

export async function deleteConversation(convId) {
  return apiFetch(`${API_BASE_URL}/conversations/${encodeURIComponent(convId)}`, {
    method: 'DELETE',
  });
}

export async function getConversationMessages(convId) {
  return apiFetch(`${API_BASE_URL}/conversations/${encodeURIComponent(convId)}/messages`);
}


// ──────────────────────────────────────────────
// Document List & Management
// ──────────────────────────────────────────────

export async function getDocuments() {
  return apiFetch(`${API_BASE_URL}/documents`);
}

export async function deleteDocument(documentId) {
  return apiFetch(`${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  });
}
