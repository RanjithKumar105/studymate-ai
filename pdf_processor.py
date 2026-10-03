"""
pdf_processor.py — Extract and chunk text from PDF files.

This module handles two steps of the RAG pipeline:
  1. EXTRACT  → Read raw text from each page of an uploaded PDF.
  2. CHUNK    → Split the full text into smaller, overlapping pieces
               so that each piece fits within an embedding model's
               context window and stays topically focused.
"""

from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter


# ──────────────────────────────────────────────
# Step 1: Extract text from a PDF file
# ──────────────────────────────────────────────

def extract_text_from_pdf(pdf_file):
    """
    Read every page of a PDF and return a list of dictionaries,
    each containing the page number and its extracted text.

    Args:
        pdf_file: A file-like object (e.g. from Streamlit's file uploader).

    Returns:
        A list of dicts:  [{"page": 1, "text": "..."}, ...]
    """
    reader = PdfReader(pdf_file)
    pages = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""          # some pages may be images
        if text.strip():                           # skip completely blank pages
            pages.append({
                "page": page_number,
                "text": text.strip(),
            })

    return pages


# ──────────────────────────────────────────────
# Step 2: Split extracted text into chunks
# ──────────────────────────────────────────────

def split_text_into_chunks(pages, chunk_size=800, chunk_overlap=200):
    """
    Take the per-page text and split it into smaller chunks.

    Why chunk?
    • Embedding models have a limited input length.
    • Smaller chunks produce more precise search results —
      the retriever can pinpoint the *exact* paragraph that
      answers a question instead of returning an entire page.

    We use LangChain's RecursiveCharacterTextSplitter, which
    tries to split on paragraph breaks first, then sentences,
    then words — keeping each chunk as coherent as possible.

    Args:
        pages:         List of {"page": int, "text": str} dicts.
        chunk_size:    Maximum number of characters per chunk.
        chunk_overlap: Number of characters shared between consecutive
                       chunks (helps preserve context at boundaries).

    Returns:
        A list of dicts:
            [{"text": "chunk text...", "page": 1, "chunk_id": 0}, ...]
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],   # split hierarchy
    )

    chunks = []
    chunk_id = 0

    for page_info in pages:
        # Split one page's text into sub-chunks
        page_chunks = splitter.split_text(page_info["text"])

        for chunk_text in page_chunks:
            chunks.append({
                "text": chunk_text,
                "page": page_info["page"],
                "chunk_id": chunk_id,
            })
            chunk_id += 1

    return chunks
