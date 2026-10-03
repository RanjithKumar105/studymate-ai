"""
rag_pipeline.py — The core Retrieval-Augmented Generation (RAG) pipeline.

RAG in a nutshell:
  1. EMBED   → Convert text chunks into numerical vectors (embeddings).
  2. STORE   → Put those vectors into a FAISS index for fast similarity search.
  3. RETRIEVE → Given a user question, find the most similar chunks.
  4. GENERATE → Send the question + retrieved chunks to Google Gemini,
                which produces a grounded, source-backed answer.
"""

import os
import time
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file (contains the Gemini API key)
load_dotenv()


# ──────────────────────────────────────────────
# Step 1: Build the embedding model (loaded once)
# ──────────────────────────────────────────────

# We use a lightweight, high-quality model from Hugging Face.
# "all-MiniLM-L6-v2" produces 384-dimensional embeddings and
# is fast enough to run on a CPU.
_embedding_model = None


def get_embedding_model():
    """Lazy-load the sentence-transformer model (singleton).

    Includes retry logic to handle intermittent SSL errors
    (DECRYPTION_FAILED_OR_BAD_RECORD_MAC) that can occur when
    downloading the model weights from Hugging Face.
    """
    global _embedding_model
    if _embedding_model is None:
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
                break  # success — exit the retry loop
            except Exception as e:
                if attempt == max_retries:
                    raise RuntimeError(
                        f"Failed to load embedding model after {max_retries} "
                        f"attempts. Last error: {e}"
                    )
                wait = 2 ** attempt          # exponential backoff: 2s, 4s
                print(f"⚠️ Model download attempt {attempt} failed: {e}")
                print(f"   Retrying in {wait}s...")
                time.sleep(wait)
    return _embedding_model


# ──────────────────────────────────────────────
# Step 2: Create embeddings for all chunks
# ──────────────────────────────────────────────

def create_embeddings(chunks):
    """
    Convert a list of text chunks into numerical vectors.

    Args:
        chunks: List of dicts with at least a "text" key.

    Returns:
        A NumPy array of shape (num_chunks, embedding_dim).
    """
    model = get_embedding_model()
    texts = [chunk["text"] for chunk in chunks]

    # .encode() returns a NumPy array; normalize for cosine similarity
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return np.array(embeddings, dtype="float32")


# ──────────────────────────────────────────────
# Step 3: Build a FAISS index
# ──────────────────────────────────────────────

def build_faiss_index(embeddings):
    """
    Create an in-memory FAISS index from the embedding matrix.

    FAISS (Facebook AI Similarity Search) lets us do fast
    nearest-neighbor lookups — even with millions of vectors.
    For this beginner project we use a simple flat (exact) index.

    Args:
        embeddings: NumPy array of shape (n, dim).

    Returns:
        A faiss.IndexFlatIP index (Inner Product ≈ cosine sim
        when vectors are L2-normalized).
    """
    dimension = embeddings.shape[1]

    # IndexFlatIP = exact inner-product search (cosine sim for unit vectors)
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)          # add all vectors at once

    return index


# ──────────────────────────────────────────────
# Step 4: Retrieve relevant chunks for a query
# ──────────────────────────────────────────────

def retrieve_relevant_chunks(query, index, chunks, top_k=4):
    """
    Given a user question, embed it and search the FAISS index
    for the top-k most similar chunks.

    Args:
        query:   The user's question string.
        index:   A FAISS index built from chunk embeddings.
        chunks:  The original list of chunk dicts (text + metadata).
        top_k:   How many chunks to retrieve (default 4).

    Returns:
        A list of chunk dicts, each augmented with a "score" key.
    """
    model = get_embedding_model()

    # Embed the query the same way we embedded the chunks
    query_vector = model.encode([query], normalize_embeddings=True)
    query_vector = np.array(query_vector, dtype="float32")

    # Search the FAISS index
    scores, indices = index.search(query_vector, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue                            # FAISS returns -1 for empty slots
        chunk = chunks[idx].copy()
        chunk["score"] = float(score)
        results.append(chunk)

    return results


# ──────────────────────────────────────────────
# Step 5: Generate an answer with Google Gemini
# ──────────────────────────────────────────────

PREFERRED_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]


def configure_gemini():
    """Set up the Gemini API client using the key from .env."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY not found. "
            "Please add it to your .env file (see .env.example)."
        )
    genai.configure(api_key=api_key)


def call_gemini_with_fallback(contents):
    """Try preferred Gemini models in sequence until one succeeds or retries exhaust."""
    configure_gemini()
    last_error = None
    for model_name in PREFERRED_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(contents)
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            time.sleep(1)
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Failed to generate response from Gemini API.")


def generate_answer(question, retrieved_chunks):
    """
    Send the question and context to Gemini and return the answer.

    The prompt instructs Gemini to:
      • Answer ONLY from the provided context.
      • Cite the page number(s) used.
      • Say "not found" if the context doesn't contain the answer.

    Args:
        question:          The user's question.
        retrieved_chunks:  List of chunk dicts from retrieve_relevant_chunks().

    Returns:
        The generated answer string.
    """
    # Build a context block from the retrieved chunks
    context_parts = []
    for chunk in retrieved_chunks:
        context_parts.append(
            f"[Page {chunk['page']}]:\n{chunk['text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    # The prompt grounds Gemini on the retrieved content only
    prompt = f"""You are a helpful study assistant called StudyMate.

Answer the following question using ONLY the context provided below.
If the answer cannot be found in the context, clearly state:
"⚠️ The information was not found in the uploaded document."

Always mention the page number(s) where you found the information.

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:"""

    return call_gemini_with_fallback(prompt)


# ──────────────────────────────────────────────
# Step 6: Image Multimodal Analysis with Gemini Vision
# ──────────────────────────────────────────────

def analyze_image_with_gemini(image_bytes, mime_type, question):
    """
    Send an image and user question to Gemini Vision and return the answer.

    Args:
        image_bytes: Raw bytes of the image file.
        mime_type: MIME type string (e.g. 'image/jpeg', 'image/png', 'image/webp').
        question: The user's question about the image.

    Returns:
        Generated answer string.
    """
    image_part = {
        "mime_type": mime_type,
        "data": image_bytes
    }

    prompt = f"""You are a helpful study assistant called StudyMate.

Analyze the provided image and answer the user's question clearly, accurately, and thoughtfully.

Support rich markdown formatting in your response (such as bold text, bullet points, numbered lists, paragraphs, headers, and code blocks where appropriate).

QUESTION:
{question}

ANSWER:"""

    return call_gemini_with_fallback([prompt, image_part])


