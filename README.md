# 📚 StudyMate — PDF Question & Answer with RAG

StudyMate is a beginner-friendly **Retrieval-Augmented Generation (RAG)** application. Upload any PDF and ask questions — answers are generated **only** from the document content, with page references.

---

## 🏗️ How the RAG Pipeline Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Upload PDF  │ ──▶ │ Extract Text │ ──▶ │ Split into   │
│              │     │  (PyPDF)     │     │   Chunks     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │   Embed      │
                                         │ (SentenceTF) │
                                         └──────┬───────┘
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │ Store in     │
                                         │   FAISS      │
                                         └──────┬───────┘
                                                 │
         ┌───────────────────────────────────────┘
         ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ User asks a  │ ──▶ │  Retrieve    │ ──▶ │  Generate    │
│  question    │     │  top-k chunks│     │  answer w/   │
│              │     │  (FAISS)     │     │  Gemini API  │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 📁 Project Structure

| File                | Purpose                                      |
|---------------------|----------------------------------------------|
| `app.py`            | Modern Streamlit UI and chat interface       |
| `rag_pipeline.py`   | Embeddings, FAISS indexing, retrieval, Gemini  |
| `pdf_processor.py`  | PDF text extraction and text chunking          |
| `database.py`       | SQLite database for persistent conversation history |
| `studymate.db`      | Local SQLite database file                   |
| `requirements.txt`  | Python dependencies                            |
| `.env.example`      | Template for your API key                      |
| `.gitignore`        | Files to exclude from version control          |

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/your-username/studymate.git
cd studymate
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Add your Gemini API key

```bash
cp .env.example .env
```

Open `.env` and replace `your_google_api_key_here` with your actual key.  
Get a free key at: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 5. Run the app

```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`.

---

## 🔑 Technologies Used

| Technology                    | Role                              |
|-------------------------------|-----------------------------------|
| **Python**                    | Core language                     |
| **Streamlit**                 | Web UI                            |
| **PyPDF**                     | PDF text extraction               |
| **LangChain**                 | Text splitting / chunking         |
| **Sentence Transformers**     | Text → vector embeddings          |
| **FAISS**                     | Vector similarity search          |
| **Google Gemini API**         | LLM answer generation             |

---

## 📝 Notes

- The first run may take a moment as the embedding model (~80 MB) is downloaded automatically.
- Only text-based PDFs are supported. Scanned / image-only PDFs will not work without OCR.
- All answers are grounded in the uploaded document — Gemini will not use external knowledge.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
