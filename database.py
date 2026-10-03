"""
database.py — SQLite database management for StudyMate persistent conversation history.

Handles:
  - Database initialization (tables for conversations, messages, document_chunks).
  - Conversation CRUD operations (create, read, search, update title/doc, delete).
  - Message storage & retrieval (user questions, AI answers, page sources, retrieved chunks).
  - Document chunk persistence (enables vector index reconstruction across restarts).
"""

import sqlite3
import json
import uuid
from datetime import datetime
import os

DB_PATH = "studymate.db"


def get_connection(db_path=DB_PATH):
    """Establish connection to SQLite database with foreign key support enabled."""
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Access columns by column name
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path=DB_PATH):
    """Create required SQLite tables and indexes if they do not exist."""
    try:
        with get_connection(db_path) as conn:
            cursor = conn.cursor()

            # Table 1: Conversations
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                doc_name TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            # Table 2: Messages
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                content TEXT NOT NULL,
                source_pages TEXT,
                retrieved_chunks TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );
            """)

            # Table 3: Document Chunks (for restoring vector store across sessions)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                chunk_id INTEGER NOT NULL,
                page INTEGER NOT NULL,
                text TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );
            """)

            # Fast index lookups
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chunks_conv ON document_chunks(conversation_id);")
            conn.commit()
    except sqlite3.Error as e:
        print(f"❌ Database initialization error: {e}")


def create_conversation(title="New Chat", doc_name=None, db_path=DB_PATH):
    """Create a new conversation entry and return its unique ID."""
    conv_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with get_connection(db_path) as conn:
            conn.execute(
                "INSERT INTO conversations (id, title, doc_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (conv_id, title, doc_name, now, now),
            )
            conn.commit()
        return conv_id
    except sqlite3.Error as e:
        print(f"❌ Error creating conversation: {e}")
        return conv_id


def get_conversations(search_query=None, db_path=DB_PATH):
    """Retrieve all conversations, optionally filtered by title, doc name, or question content."""
    try:
        with get_connection(db_path) as conn:
            cursor = conn.cursor()
            if search_query and search_query.strip():
                query = f"%{search_query.strip()}%"
                cursor.execute(
                    """
                    SELECT DISTINCT c.* FROM conversations c
                    LEFT JOIN messages m ON c.id = m.conversation_id
                    WHERE c.title LIKE ? OR c.doc_name LIKE ? OR m.content LIKE ?
                    ORDER BY c.updated_at DESC
                    """,
                    (query, query, query),
                )
            else:
                cursor.execute("SELECT * FROM conversations ORDER BY updated_at DESC")

            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"❌ Error fetching conversations: {e}")
        return []


def get_conversation(conv_id, db_path=DB_PATH):
    """Fetch details for a single conversation by ID."""
    try:
        with get_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    except sqlite3.Error as e:
        print(f"❌ Error fetching conversation {conv_id}: {e}")
        return None


def update_conversation_title(conv_id, title, db_path=DB_PATH):
    """Update conversation title and updated_at timestamp."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with get_connection(db_path) as conn:
            conn.execute(
                "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
                (title, now, conv_id),
            )
            conn.commit()
    except sqlite3.Error as e:
        print(f"❌ Error updating title for {conv_id}: {e}")


def update_conversation_doc(conv_id, doc_name, db_path=DB_PATH):
    """Update associated document name for a conversation."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with get_connection(db_path) as conn:
            conn.execute(
                "UPDATE conversations SET doc_name = ?, updated_at = ? WHERE id = ?",
                (doc_name, now, conv_id),
            )
            conn.commit()
    except sqlite3.Error as e:
        print(f"❌ Error updating document name for {conv_id}: {e}")


def delete_conversation(conv_id, db_path=DB_PATH):
    """Delete a conversation and all its associated messages and document chunks."""
    try:
        with get_connection(db_path) as conn:
            conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
            conn.execute("DELETE FROM document_chunks WHERE conversation_id = ?", (conv_id,))
            conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
            conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"❌ Error deleting conversation {conv_id}: {e}")
        return False


def add_message(conv_id, sender, content, source_pages=None, retrieved_chunks=None, db_path=DB_PATH):
    """Save a user or assistant message to the database."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pages_json = json.dumps(source_pages) if source_pages is not None else None
    chunks_json = json.dumps(retrieved_chunks) if retrieved_chunks is not None else None
    try:
        with get_connection(db_path) as conn:
            conn.execute(
                """
                INSERT INTO messages (conversation_id, sender, content, source_pages, retrieved_chunks, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (conv_id, sender, content, pages_json, chunks_json, now),
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conv_id),
            )
            conn.commit()
    except sqlite3.Error as e:
        print(f"❌ Error adding message to {conv_id}: {e}")


def get_messages(conv_id, db_path=DB_PATH):
    """Retrieve all messages for a conversation ordered chronologically."""
    try:
        with get_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC", (conv_id,))
            rows = cursor.fetchall()
            messages = []
            for row in rows:
                msg = dict(row)
                if msg["source_pages"]:
                    msg["source_pages"] = json.loads(msg["source_pages"])
                if msg["retrieved_chunks"]:
                    msg["retrieved_chunks"] = json.loads(msg["retrieved_chunks"])
                messages.append(msg)
            return messages
    except sqlite3.Error as e:
        print(f"❌ Error fetching messages for {conv_id}: {e}")
        return []


def save_document_chunks(conv_id, chunks, db_path=DB_PATH):
    """Persist document chunks for a conversation to enable index reconstruction across restarts."""
    try:
        with get_connection(db_path) as conn:
            conn.execute("DELETE FROM document_chunks WHERE conversation_id = ?", (conv_id,))
            conn.executemany(
                """
                INSERT INTO document_chunks (conversation_id, chunk_id, page, text)
                VALUES (?, ?, ?, ?)
                """,
                [(conv_id, c["chunk_id"], c["page"], c["text"]) for c in chunks],
            )
            conn.commit()
    except sqlite3.Error as e:
        print(f"❌ Error saving chunks for {conv_id}: {e}")


def get_document_chunks(conv_id, db_path=DB_PATH):
    """Retrieve all document chunks for a conversation."""
    try:
        with get_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT chunk_id, page, text FROM document_chunks WHERE conversation_id = ? ORDER BY chunk_id ASC",
                (conv_id,),
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"❌ Error loading chunks for {conv_id}: {e}")
        return []


def generate_title_from_question(question):
    """Generate a clean, concise title from the user's first question."""
    cleaned = question.strip().rstrip("?").rstrip(".")
    words = cleaned.split()
    if len(words) > 6:
        title = " ".join(words[:6]).strip() + "..."
    else:
        title = cleaned.strip()
    return title.title()
