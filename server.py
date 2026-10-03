"""
server.py — Flask HTTP API layer for StudyMate AI Study Assistant.

Endpoints:
  - GET  /api/health                         : Returns API status and system health.
  - POST /api/upload                         : Uploads PDF, processes text/chunks, builds FAISS index, caches session.
  - POST /api/chat                           : Accepts question & document_id, retrieves chunks via FAISS, generates answer via Gemini.
  - GET  /api/conversations                  : List all conversations (with optional search).
  - POST /api/conversations                  : Create a new conversation.
  - GET  /api/conversations/<id>             : Get single conversation details.
  - PUT  /api/conversations/<id>             : Rename a conversation.
  - DELETE /api/conversations/<id>           : Delete a conversation and its data.
  - GET  /api/conversations/<id>/messages    : Get all messages for a conversation.
  - GET  /api/documents                      : List all uploaded documents in the current session.
"""

import os
import uuid
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from pdf_processor import extract_text_from_pdf, split_text_into_chunks
from rag_pipeline import (
    create_embeddings,
    build_faiss_index,
    retrieve_relevant_chunks,
    generate_answer,
)
import database

# Load environment variables (.env contains GOOGLE_API_KEY)
load_dotenv()

app = Flask(__name__)

# Enable CORS for React development server on port 5175 only
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5175", "http://127.0.0.1:5175"]}})
# Ensure a tiny delay before handling the first request to avoid immediate burst
import time


# Temporary upload directory
UPLOAD_FOLDER = Path(__file__).resolve().parent / "temp_uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

# In-memory document cache mapping document_id -> { doc_name, num_pages, num_chunks, chunks, index }
document_store = {}

# Initialize SQLite database schema on startup
database.init_db()


@app.errorhandler(404)
def not_found(error):
    return jsonify({"status": "error", "message": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"status": "error", "message": f"Internal server error: {str(error)}"}), 500


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint returning API status."""
    return jsonify({
        "status": "ok",
        "service": "StudyMate Flask API",
        "version": "1.0.0",
        "message": "StudyMate API is running smoothly"
    }), 200


# ──────────────────────────────────────────────
# PDF Upload
# ──────────────────────────────────────────────

@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    """Handle PDF upload, text extraction, chunking, FAISS index construction, and caching."""
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file part in the request"}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"status": "error", "message": "No selected file"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"status": "error", "message": "Invalid file format. Only PDF files are supported."}), 400

    # Optional: conversation_id from form data to link document to a conversation
    conversation_id = request.form.get("conversation_id", "").strip()

    temp_path = None
    try:
        doc_id = str(uuid.uuid4())
        safe_filename = f"{doc_id}_{file.filename}"
        temp_path = UPLOAD_FOLDER / safe_filename
        file.save(str(temp_path))

        # Process PDF using existing pipeline
        pages = extract_text_from_pdf(str(temp_path))
        if not pages:
            return jsonify({"status": "error", "message": "Could not extract readable text from PDF."}), 400

        chunks = split_text_into_chunks(pages)
        if not chunks:
            return jsonify({"status": "error", "message": "No text chunks generated from PDF."}), 400

        embeddings = create_embeddings(chunks)
        index = build_faiss_index(embeddings)

        # Store in memory for active sessions
        document_store[doc_id] = {
            "doc_name": file.filename,
            "num_pages": len(pages),
            "num_chunks": len(chunks),
            "chunks": chunks,
            "index": index,
        }

        # If a conversation_id was provided, update it; otherwise create a new conversation
        if conversation_id:
            database.update_conversation_doc(conversation_id, file.filename)
            database.save_document_chunks(conversation_id, chunks)
        else:
            # Auto-create a conversation linked to this document
            conv_title = f"Study: {file.filename}"
            conversation_id = database.create_conversation(title=conv_title, doc_name=file.filename)
            database.save_document_chunks(conversation_id, chunks)

        return jsonify({
            "status": "success",
            "document_id": doc_id,
            "conversation_id": conversation_id,
            "doc_name": file.filename,
            "num_pages": len(pages),
            "num_chunks": len(chunks),
            "message": "Document indexed successfully"
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to process PDF: {str(e)}"}), 500

    finally:
        # Clean up temporary uploaded file
        if temp_path and temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception:
                pass


# ──────────────────────────────────────────────
# RAG Chat
# ──────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle RAG question answering."""
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()
    doc_id = data.get("document_id", "").strip()
    conversation_id = data.get("conversation_id", "").strip()

    if not question:
        return jsonify({"status": "error", "message": "Question field is required."}), 400

    if not doc_id:
        return jsonify({"status": "error", "message": "document_id field is required."}), 400

    if doc_id not in document_store:
        return jsonify({
            "status": "error",
            "message": f"Document ID '{doc_id}' not found or session expired. Please re-upload the PDF."
        }), 404

    doc_data = document_store[doc_id]
    index = doc_data["index"]
    chunks = doc_data["chunks"]

    try:
        # 1. Retrieve relevant chunks using existing RAG function
        retrieved = retrieve_relevant_chunks(
            query=question,
            index=index,
            chunks=chunks,
            top_k=4
        )

        # 2. Generate answer using Gemini via existing RAG function (with retry for free tier rate limits)
        answer = None
        last_error = None
        for attempt in range(1, 4):
            try:
                answer = generate_answer(question, retrieved)
                if answer:
                    break
            except Exception as e:
                last_error = e
                if "429" in str(e) or "quota" in str(e).lower():
                    import time
                    time.sleep(4 * attempt)
                else:
                    raise e

        if not answer:
            raise last_error or Exception("Failed to generate answer from Gemini.")

        # 3. Format sources & page numbers
        formatted_sources = []
        source_pages = sorted(list(set(c["page"] for c in retrieved)))

        for c in retrieved:
            formatted_sources.append({
                "page": c.get("page", 1),
                "score": round(float(c.get("score", 0.0)), 2),
                "text": c.get("text", "")
            })

        # 4. Persist messages to SQLite if conversation_id is provided
        if conversation_id:
            # Save user message
            database.add_message(
                conv_id=conversation_id,
                sender="user",
                content=question,
            )
            # Save assistant message with sources
            database.add_message(
                conv_id=conversation_id,
                sender="assistant",
                content=answer,
                source_pages=source_pages,
                retrieved_chunks=formatted_sources,
            )
            # Auto-update conversation title from first question
            conv = database.get_conversation(conversation_id)
            if conv and (conv.get("title", "").startswith("Study:") or conv.get("title") == "New Chat"):
                auto_title = database.generate_title_from_question(question)
                database.update_conversation_title(conversation_id, auto_title)

        return jsonify({
            "status": "success",
            "question": question,
            "answer": answer,
            "sources": formatted_sources,
            "source_pages": source_pages,
            "document_id": doc_id,
            "conversation_id": conversation_id,
            "doc_name": doc_data["doc_name"]
        }), 200

    except Exception as e:
        err_msg = str(e)
        status_code = 429 if ("429" in err_msg or "quota" in err_msg.lower()) else 500
        return jsonify({"status": "error", "message": f"RAG Generation Error: {err_msg}"}), status_code


# ──────────────────────────────────────────────
# Image Multimodal Analysis
# ──────────────────────────────────────────────

@app.route("/api/analyze-image", methods=["POST"])
def analyze_image():
    """Handle image analysis questions using Gemini Vision."""
    question = request.form.get("question", "").strip()
    conversation_id = request.form.get("conversation_id", "").strip()

    if not question:
        return jsonify({"status": "error", "message": "Question field is required."}), 400

    if "image" not in request.files:
        return jsonify({"status": "error", "message": "No image file provided."}), 400

    file = request.files["image"]
    if not file or file.filename == "":
        return jsonify({"status": "error", "message": "Selected image file is empty."}), 400

    # Validate image file extension
    filename_lower = file.filename.lower()
    allowed_exts = (".jpg", ".jpeg", ".png", ".webp")
    if not any(filename_lower.endswith(ext) for ext in allowed_exts):
        return jsonify({
            "status": "error",
            "message": "Unsupported image type. Allowed formats: .jpg, .jpeg, .png, .webp"
        }), 400

    # Determine mime_type
    mime_type = "image/jpeg"
    if filename_lower.endswith(".png"):
        mime_type = "image/png"
    elif filename_lower.endswith(".webp"):
        mime_type = "image/webp"

    try:
        image_bytes = file.read()
        if not image_bytes:
            return jsonify({"status": "error", "message": "Uploaded image file is empty."}), 400

        # Validate file size (10 MB limit)
        if len(image_bytes) > 10 * 1024 * 1024:
            return jsonify({
                "status": "error",
                "message": "Image size exceeds 10 MB limit. Please upload a smaller image."
            }), 400

        from rag_pipeline import analyze_image_with_gemini
        answer = analyze_image_with_gemini(image_bytes, mime_type, question)

        # Save to database if conversation_id is provided
        if conversation_id:
            database.add_message(
                conv_id=conversation_id,
                sender="user",
                content=question,
            )
            database.add_message(
                conv_id=conversation_id,
                sender="assistant",
                content=answer,
            )
            conv = database.get_conversation(conversation_id)
            if conv and (conv.get("title", "").startswith("Study:") or conv.get("title") == "New Chat"):
                auto_title = database.generate_title_from_question(question)
                database.update_conversation_title(conversation_id, auto_title)

        return jsonify({
            "status": "success",
            "question": question,
            "answer": answer,
            "type": "image",
            "conversation_id": conversation_id,
        }), 200

    except Exception as e:
        err_msg = str(e)
        status_code = 429 if ("429" in err_msg or "quota" in err_msg.lower()) else 500
        return jsonify({"status": "error", "message": f"Image Analysis Error: {err_msg}"}), status_code


# ──────────────────────────────────────────────
# Conversation Management Endpoints
# ──────────────────────────────────────────────

@app.route("/api/conversations", methods=["GET"])
def list_conversations():
    """List all conversations, optionally filtered by search query."""
    search = request.args.get("search", "").strip()
    conversations = database.get_conversations(search_query=search if search else None)
    return jsonify({
        "status": "success",
        "conversations": conversations,
    }), 200


@app.route("/api/conversations", methods=["POST"])
def create_conversation():
    """Create a new conversation."""
    data = request.get_json(silent=True) or {}
    title = data.get("title", "New Chat").strip()
    doc_name = data.get("doc_name", "").strip() or None

    conv_id = database.create_conversation(title=title, doc_name=doc_name)
    return jsonify({
        "status": "success",
        "conversation": {
            "id": conv_id,
            "title": title,
            "doc_name": doc_name,
        }
    }), 201


@app.route("/api/conversations/<conv_id>", methods=["GET"])
def get_conversation(conv_id):
    """Get single conversation details."""
    conv = database.get_conversation(conv_id)
    if not conv:
        return jsonify({"status": "error", "message": "Conversation not found."}), 404
    return jsonify({"status": "success", "conversation": conv}), 200


@app.route("/api/conversations/<conv_id>", methods=["PUT"])
def update_conversation(conv_id):
    """Rename a conversation."""
    data = request.get_json(silent=True) or {}
    new_title = data.get("title", "").strip()
    if not new_title:
        return jsonify({"status": "error", "message": "Title is required."}), 400

    database.update_conversation_title(conv_id, new_title)
    return jsonify({"status": "success", "message": "Conversation renamed."}), 200


@app.route("/api/conversations/<conv_id>", methods=["DELETE"])
def delete_conversation(conv_id):
    """Delete a conversation and all its associated data."""
    success = database.delete_conversation(conv_id)
    if success:
        return jsonify({"status": "success", "message": "Conversation deleted."}), 200
    return jsonify({"status": "error", "message": "Failed to delete conversation."}), 500


@app.route("/api/conversations/<conv_id>/messages", methods=["GET"])
def get_conversation_messages(conv_id):
    """Get all messages for a conversation."""
    conv = database.get_conversation(conv_id)
    if not conv:
        return jsonify({"status": "error", "message": "Conversation not found."}), 404

    messages = database.get_messages(conv_id)
    return jsonify({
        "status": "success",
        "conversation_id": conv_id,
        "messages": messages,
    }), 200


# ──────────────────────────────────────────────
# Document List Endpoint
# ──────────────────────────────────────────────

@app.route("/api/documents", methods=["GET"])
def list_documents():
    """List all documents currently loaded in the session."""
    docs = []
    for doc_id, doc_data in document_store.items():
        docs.append({
            "document_id": doc_id,
            "doc_name": doc_data["doc_name"],
            "num_pages": doc_data["num_pages"],
            "num_chunks": doc_data["num_chunks"],
        })
    return jsonify({"status": "success", "documents": docs}), 200


@app.route("/api/documents/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """Delete a document from session memory cache."""
    found = False
    deleted_name = ""

    if doc_id in document_store:
        doc_info = document_store.pop(doc_id)
        deleted_name = doc_info.get("doc_name", "")
        found = True
    else:
        # Search by doc_name or doc_id matching
        keys_to_remove = [
            k for k, v in document_store.items()
            if k == doc_id or v.get("doc_name") == doc_id
        ]
        for k in keys_to_remove:
            doc_info = document_store.pop(k)
            deleted_name = doc_info.get("doc_name", "")
            found = True

    if found:
        return jsonify({
            "status": "success",
            "message": f"Document '{deleted_name or doc_id}' deleted successfully"
        }), 200

    return jsonify({"status": "error", "message": "Document not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"[StudyMate API] Server running on http://localhost:{port}")
    print(f"[StudyMate API] CORS allowed origin: http://localhost:5175")
    app.run(host="0.0.0.0", port=port, debug=True)
