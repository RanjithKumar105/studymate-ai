"""
app.py — Modern, Responsive Streamlit Frontend for StudyMate AI Study Assistant.

Fixes & Improvements:
  - Responsive logo rendering with container card (no cropping, no absolute coords).
  - Normal flow sidebar layout with independent scrolling and clear section labels.
  - Custom Segmented Theme Selector (Light / Dark / System) with high-contrast text labels.
  - Professional Dark Theme Palette (#0B0F19 app bg, #111827 sidebar, #161D2D cards).
  - Centered main chat width (max 820px) with flex flow layout.
  - Adequate bottom padding (8rem) preventing chat input overlap on suggestions/messages.
  - Responsive 2-column to 1-column suggestion grid for mobile/tablet/desktop breakpoints.
  - Preserved intact RAG pipeline (pdf_processor, rag_pipeline, database, FAISS, Gemini).
"""

import streamlit as st
import datetime
import html
import base64
from pathlib import Path

from pdf_processor import extract_text_from_pdf, split_text_into_chunks
from rag_pipeline import (
    create_embeddings,
    build_faiss_index,
    retrieve_relevant_chunks,
    generate_answer,
)
import database

# ──────────────────────────────────────────────
# 1. Path & Asset Setup
# ──────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
LOGO_PATH = BASE_DIR / "assets" / "studymate-logo.png"

def get_logo_base64():
    """Load logo image as base64 string for clean responsive inline HTML rendering."""
    if LOGO_PATH.exists():
        with open(LOGO_PATH, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    return None

LOGO_B64 = get_logo_base64()

st.set_page_config(
    page_title="StudyMate — AI Study Assistant",
    page_icon=str(LOGO_PATH) if LOGO_PATH.exists() else "📚",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Initialize SQLite database schema
database.init_db()


# ──────────────────────────────────────────────
# 2. Session State Initialization
# ──────────────────────────────────────────────

if "active_conv_id" not in st.session_state:
    st.session_state.active_conv_id = None
if "messages" not in st.session_state:
    st.session_state.messages = []
if "chunks" not in st.session_state:
    st.session_state.chunks = None
if "index" not in st.session_state:
    st.session_state.index = None
if "current_file" not in st.session_state:
    st.session_state.current_file = None
if "num_pages" not in st.session_state:
    st.session_state.num_pages = 0
if "num_chunks" not in st.session_state:
    st.session_state.num_chunks = 0
if "pending_question" not in st.session_state:
    st.session_state.pending_question = None
if "theme" not in st.session_state:
    st.session_state.theme = "System"  # Light | Dark | System
if "search_query" not in st.session_state:
    st.session_state.search_query = ""
if "enter_to_send" not in st.session_state:
    st.session_state.enter_to_send = True
if "show_sources_default" not in st.session_state:
    st.session_state.show_sources_default = False


# ──────────────────────────────────────────────
# 3. Dynamic CSS & Theme Engine
# ──────────────────────────────────────────────

def inject_custom_styles():
    theme_setting = st.session_state.theme

    # High-contrast theme color palettes
    if theme_setting == "Dark":
        color_vars = """
            --bg-app: #0B0F19;
            --bg-sidebar: #111827;
            --bg-card: #161D2D;
            --bg-chat-user: #1E1B4B;
            --bg-chat-ai: #161D2D;
            --border-color: #1F2937;
            --text-primary: #F9FAFB;
            --text-secondary: #9CA3AF;
            --text-muted: #6B7280;
            --accent-primary: #6366F1;
            --accent-hover: #4F46E5;
            --accent-light: #312E81;
            --badge-success-bg: #064E3B;
            --badge-success-text: #34D399;
            --badge-success-border: #059669;
            --input-bg: #161D2D;
            --input-text: #F9FAFB;
        """
        app_bg = "#0B0F19"
        sidebar_bg = "#111827"
        text_col = "#F9FAFB"
    elif theme_setting == "Light":
        color_vars = """
            --bg-app: #FFFFFF;
            --bg-sidebar: #F8FAFC;
            --bg-card: #F1F5F9;
            --bg-chat-user: #EEF2FF;
            --bg-chat-ai: #F8FAFC;
            --border-color: #E2E8F0;
            --text-primary: #0F172A;
            --text-secondary: #475569;
            --text-muted: #64748B;
            --accent-primary: #4F46E5;
            --accent-hover: #4338CA;
            --accent-light: #EEF2FF;
            --badge-success-bg: #ECFDF5;
            --badge-success-text: #059669;
            --badge-success-border: #A7F3D0;
            --input-bg: #FFFFFF;
            --input-text: #0F172A;
        """
        app_bg = "#FFFFFF"
        sidebar_bg = "#F8FAFC"
        text_col = "#0F172A"
    else:  # System mode using media queries
        color_vars = """
            --bg-app: #FFFFFF;
            --bg-sidebar: #F8FAFC;
            --bg-card: #F1F5F9;
            --bg-chat-user: #EEF2FF;
            --bg-chat-ai: #F8FAFC;
            --border-color: #E2E8F0;
            --text-primary: #0F172A;
            --text-secondary: #475569;
            --text-muted: #64748B;
            --accent-primary: #4F46E5;
            --accent-hover: #4338CA;
            --accent-light: #EEF2FF;
            --badge-success-bg: #ECFDF5;
            --badge-success-text: #059669;
            --badge-success-border: #A7F3D0;
            --input-bg: #FFFFFF;
            --input-text: #0F172A;
        """
        app_bg = "var(--bg-app)"
        sidebar_bg = "var(--bg-sidebar)"
        text_col = "var(--text-primary)"

    dark_media_vars = """
        --bg-app: #0B0F19;
        --bg-sidebar: #111827;
        --bg-card: #161D2D;
        --bg-chat-user: #1E1B4B;
        --bg-chat-ai: #161D2D;
        --border-color: #1F2937;
        --text-primary: #F9FAFB;
        --text-secondary: #9CA3AF;
        --text-muted: #6B7280;
        --accent-primary: #6366F1;
        --accent-hover: #4F46E5;
        --accent-light: #312E81;
        --badge-success-bg: #064E3B;
        --badge-success-text: #34D399;
        --badge-success-border: #059669;
        --input-bg: #161D2D;
        --input-text: #F9FAFB;
    """

    css = f"""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        :root {{
            {color_vars}
        }}

        @media (prefers-color-scheme: dark) {{
            :root {{
                {dark_media_vars if theme_setting == "System" else ""}
            }}
        }}

        /* Reset & Global Typography */
        html, body, [class*="css"] {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }}

        .stApp {{
            background-color: {app_bg} !important;
            color: {text_col} !important;
            overflow-x: hidden;
        }}

        #MainMenu, footer {{ visibility: hidden; }}
        header[data-testid="stHeader"] {{
            background: transparent !important;
            z-index: 10;
        }}

        /* Responsive Sidebar */
        [data-testid="stSidebar"] {{
            background-color: {sidebar_bg} !important;
            border-right: 1px solid var(--border-color) !important;
        }}

        [data-testid="stSidebar"] > div:first-child {{
            padding-top: 1.25rem;
            padding-left: 0.85rem;
            padding-right: 0.85rem;
            overflow-y: auto;
        }}

        /* Main Container Width & Floating Input Padding */
        .main .block-container {{
            max-width: 820px !important;
            padding-top: 1rem !important;
            padding-bottom: 8rem !important;
            margin: 0 auto !important;
        }}

        /* Logo Presentation Container */
        .logo-card-container {{
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #FFFFFF;
            border-radius: 12px;
            padding: 6px 14px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            width: fit-content;
            margin: 0 auto;
        }}

        .logo-card-container.sidebar-logo {{
            margin: 0 0 0.75rem 0;
            padding: 4px 10px;
            border-radius: 8px;
        }}

        .logo-img-responsive {{
            height: auto;
            object-fit: contain;
            display: block;
        }}

        /* Top Sticky Status Bar */
        .top-status-bar {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.65rem 1rem;
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            margin-bottom: 1.25rem;
        }}

        .top-status-title {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
        }}

        /* Status Badges */
        .status-badge-success {{
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background-color: var(--badge-success-bg);
            color: var(--badge-success-text);
            border: 1px solid var(--badge-success-border);
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
        }}

        .status-badge-warning {{
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background-color: #FFFBEB;
            color: #D97706;
            border: 1px solid #FDE68A;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
        }}

        /* Welcome Screen Hero */
        .welcome-hero {{
            text-align: center;
            padding: 1.5rem 0 1rem 0;
        }}

        .welcome-title {{
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-top: 0.75rem;
            margin-bottom: 0.25rem;
            color: var(--text-primary);
        }}

        .welcome-subtitle {{
            font-size: 1.05rem;
            font-weight: 600;
            color: var(--accent-primary);
            margin-bottom: 0.5rem;
        }}

        .welcome-desc {{
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
        }}

        /* Assistant Header */
        .assistant-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.4rem;
        }}

        .assistant-name {{
            font-weight: 700;
            font-size: 0.9rem;
            color: var(--text-primary);
        }}

        .message-timestamp {{
            font-size: 0.725rem;
            color: var(--text-muted);
        }}

        /* Source Badges */
        .source-bar {{
            margin-top: 0.75rem;
            padding-top: 0.6rem;
            border-top: 1px dashed var(--border-color);
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
        }}

        .source-label {{
            font-weight: 600;
            font-size: 0.775rem;
            color: var(--text-secondary);
            margin-right: 4px;
        }}

        .page-badge {{
            display: inline-flex;
            align-items: center;
            background-color: var(--accent-light);
            color: var(--accent-primary);
            border: 1px solid var(--border-color);
            font-weight: 600;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
        }}

        /* Chunk Card Details */
        .chunk-card {{
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.85rem 1rem;
            margin-bottom: 0.65rem;
        }}

        .chunk-meta {{
            font-size: 0.775rem;
            font-weight: 600;
            color: var(--accent-primary);
            margin-bottom: 0.4rem;
            display: flex;
            justify-content: space-between;
        }}

        .chunk-text {{
            font-size: 0.825rem;
            color: var(--text-secondary);
            line-height: 1.5;
            white-space: pre-wrap;
        }}

        /* Sidebar Section Titles & Items */
        .sidebar-section-title {{
            font-size: 0.725rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-muted);
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
        }}

        /* ChatGPT Floating Input Bar */
        [data-testid="stChatInput"] {{
            border-radius: 24px !important;
            border: 1px solid var(--border-color) !important;
            background-color: var(--input-bg) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
        }}

        [data-testid="stChatInput"] textarea {{
            color: var(--input-text) !important;
        }}

        /* Theme Segmented Radio Control */
        [data-testid="stRadio"] div[role="radiogroup"] {{
            display: flex !important;
            flex-direction: row !important;
            gap: 6px !important;
        }}

        [data-testid="stRadio"] label {{
            background-color: var(--bg-card) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 8px !important;
            padding: 5px 12px !important;
            color: var(--text-primary) !important;
            font-weight: 500 !important;
            font-size: 0.825rem !important;
            cursor: pointer !important;
        }}

        [data-testid="stRadio"] label p, [data-testid="stRadio"] label span {{
            color: var(--text-primary) !important;
            font-size: 0.825rem !important;
        }}

        /* Responsive Breakpoints */
        @media (max-width: 640px) {{
            .main .block-container {{
                padding-left: 0.75rem !important;
                padding-right: 0.75rem !important;
                padding-bottom: 9rem !important;
            }}

            [data-testid="column"] {{
                width: 100% !important;
                flex: 1 1 100% !important;
                min-width: 100% !important;
            }}

            .welcome-title {{
                font-size: 1.6rem !important;
            }}
        }}
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)

inject_custom_styles()


# ──────────────────────────────────────────────
# 4. Helper Logic for Conversations & RAG Index
# ──────────────────────────────────────────────

def render_logo_html(size="medium"):
    """Render StudyMate logo in a clean white rounded card container."""
    if LOGO_B64:
        max_w = "110px" if size == "small" else "140px"
        container_cls = "sidebar-logo" if size == "small" else "hero-logo"
        return f"""
        <div class="logo-card-container {container_cls}">
            <img src="data:image/png;base64,{LOGO_B64}" alt="StudyMate" class="logo-img-responsive" style="max-width: {max_w};" />
        </div>
        """
    return "<h3>📚 StudyMate</h3>"


def load_conversation(conv_id):
    """Load messages and vector index from SQLite database for a conversation."""
    st.session_state.active_conv_id = conv_id
    conv = database.get_conversation(conv_id)
    if not conv:
        return

    st.session_state.current_file = conv.get("doc_name")

    # Load messages
    raw_msgs = database.get_messages(conv_id)
    messages = []
    for m in raw_msgs:
        dt = m.get("created_at", "")
        formatted_time = ""
        if dt:
            try:
                parsed_dt = datetime.datetime.strptime(dt, "%Y-%m-%d %H:%M:%S")
                formatted_time = parsed_dt.strftime("%I:%M %p")
            except Exception:
                formatted_time = dt

        messages.append({
            "role": m["sender"],
            "content": m["content"],
            "timestamp": formatted_time,
            "source_pages": m.get("source_pages") or [],
            "retrieved_chunks": m.get("retrieved_chunks") or [],
        })
    st.session_state.messages = messages

    # Reconstruct vector index from stored chunks if available
    chunks = database.get_document_chunks(conv_id)
    if chunks:
        with st.spinner("⚡ Rebuilding vector index for conversation..."):
            embeddings = create_embeddings(chunks)
            index = build_faiss_index(embeddings)
            st.session_state.chunks = chunks
            st.session_state.index = index
            st.session_state.num_chunks = len(chunks)
            st.session_state.num_pages = len(set(c["page"] for c in chunks))
    else:
        st.session_state.chunks = None
        st.session_state.index = None
        st.session_state.num_chunks = 0
        st.session_state.num_pages = 0


def start_new_chat():
    """Reset session state to start a clean new conversation."""
    st.session_state.active_conv_id = None
    st.session_state.messages = []
    st.session_state.chunks = None
    st.session_state.index = None
    st.session_state.current_file = None
    st.session_state.num_pages = 0
    st.session_state.num_chunks = 0
    st.session_state.pending_question = None


def group_conversations_by_date(conversations):
    """Categorize conversations into Today, Yesterday, and Older."""
    today_list, yesterday_list, older_list = [], [], []
    now = datetime.datetime.now()
    today_date = now.date()
    yesterday_date = today_date - datetime.timedelta(days=1)

    for c in conversations:
        updated_str = c.get("updated_at", "")
        c_date = None
        if updated_str:
            try:
                c_date = datetime.datetime.strptime(updated_str, "%Y-%m-%d %H:%M:%S").date()
            except Exception:
                pass

        if c_date == today_date:
            today_list.append(c)
        elif c_date == yesterday_date:
            yesterday_list.append(c)
        else:
            older_list.append(c)

    return today_list, yesterday_list, older_list


# ──────────────────────────────────────────────
# 5. Sidebar Layout & Navigation
# ──────────────────────────────────────────────

with st.sidebar:
    # 1. StudyMate Header Logo
    st.markdown(render_logo_html("small"), unsafe_allow_html=True)

    # 2. + New Chat Button
    if st.button("➕ New Chat", use_container_width=True, type="primary", key="new_chat_btn"):
        start_new_chat()
        st.rerun()

    st.markdown("<div style='height: 4px;'></div>", unsafe_allow_html=True)

    # 3. Search Chats
    search_term = st.text_input(
        "Search chats",
        placeholder="🔍 Search chats...",
        label_visibility="collapsed",
        key="search_input",
    )

    # 4. Recent Chats Section
    all_convs = database.get_conversations(search_query=search_term)
    today_convs, yesterday_convs, older_convs = group_conversations_by_date(all_convs)

    def render_chat_list_group(group_title, conv_list):
        if not conv_list:
            return
        st.markdown(f'<div class="sidebar-section-title">{group_title}</div>', unsafe_allow_html=True)
        for c in conv_list:
            cid = c["id"]
            title = c["title"] or "Untitled Chat"
            is_active = (cid == st.session_state.active_conv_id)

            col_btn, col_opt = st.columns([0.82, 0.18])
            with col_btn:
                btn_label = f"💬 {title[:18]}..." if len(title) > 18 else f"💬 {title}"
                if st.button(
                    btn_label,
                    key=f"conv_{cid}",
                    use_container_width=True,
                    help=title,
                ):
                    load_conversation(cid)
                    st.rerun()
            with col_opt:
                with st.popover("⋮", help="Options"):
                    new_title_val = st.text_input("Rename Chat", value=title, key=f"rename_in_{cid}")
                    if st.button("Save Title", key=f"save_title_{cid}", use_container_width=True):
                        if new_title_val.strip():
                            database.update_conversation_title(cid, new_title_val.strip())
                            st.rerun()
                    st.markdown("---")
                    if st.button("🗑️ Delete", key=f"del_{cid}", type="primary", use_container_width=True):
                        database.delete_conversation(cid)
                        if st.session_state.active_conv_id == cid:
                            start_new_chat()
                        st.rerun()

    render_chat_list_group("Today", today_convs)
    render_chat_list_group("Yesterday", yesterday_convs)
    render_chat_list_group("Older", older_convs)

    if not all_convs:
        st.markdown("""
        <div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:0.75rem 0;">
            No conversations found.
        </div>
        """, unsafe_allow_html=True)

    st.markdown('<div class="sidebar-section-title">Uploaded Document</div>', unsafe_allow_html=True)

    # 5. PDF Upload Section
    uploaded_file = st.file_uploader(
        "Upload PDF Document",
        type=["pdf"],
        help="Upload textbook or study notes PDF.",
        key="pdf_uploader",
        label_visibility="collapsed",
    )

    if uploaded_file is not None:
        if st.session_state.current_file != uploaded_file.name:
            with st.spinner("📖 Extracting & indexing PDF..."):
                pages = extract_text_from_pdf(uploaded_file)
                if not pages:
                    st.error("Could not extract readable text from this PDF.")
                else:
                    chunks = split_text_into_chunks(pages)
                    embeddings = create_embeddings(chunks)
                    index = build_faiss_index(embeddings)

                    # Create or update active conversation in SQLite
                    if not st.session_state.active_conv_id:
                        conv_id = database.create_conversation(
                            title="New Chat",
                            doc_name=uploaded_file.name,
                        )
                        st.session_state.active_conv_id = conv_id
                    else:
                        database.update_conversation_doc(
                            st.session_state.active_conv_id,
                            uploaded_file.name,
                        )

                    # Save document chunks for persistent retrieval
                    database.save_document_chunks(st.session_state.active_conv_id, chunks)

                    st.session_state.chunks = chunks
                    st.session_state.index = index
                    st.session_state.current_file = uploaded_file.name
                    st.session_state.num_pages = len(pages)
                    st.session_state.num_chunks = len(chunks)
                    st.rerun()

    # Document Status Box in Sidebar
    if st.session_state.current_file and st.session_state.index is not None:
        st.markdown(f"""
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:0.75rem; margin-top:0.4rem;">
            <div style="font-weight:600; font-size:0.825rem; color:var(--text-primary); word-break:break-all;">
                📄 {st.session_state.current_file}
            </div>
            <div style="margin-top:6px; display:flex; align-items:center; justify-content:space-between;">
                <span class="status-badge-success">✓ Indexed</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">{st.session_state.num_pages} pgs</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:0.75rem; margin-top:0.4rem;">
            <span class="status-badge-warning">No document active</span>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px;">
                Upload a PDF above to ask questions.
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")

    # 6. Bottom Settings Panel
    with st.expander("⚙️ Settings"):
        st.markdown("##### **Appearance**")
        theme_opt = st.radio(
            "Theme Mode",
            options=["Light", "Dark", "System"],
            index=["Light", "Dark", "System"].index(st.session_state.theme),
            key="theme_radio",
            label_visibility="collapsed",
        )
        if theme_opt != st.session_state.theme:
            st.session_state.theme = theme_opt
            st.rerun()

        st.markdown("---")
        st.markdown("##### **Preferences**")
        st.session_state.enter_to_send = st.toggle("Enter to send", value=st.session_state.enter_to_send)
        st.session_state.show_sources_default = st.toggle("Expand sources by default", value=st.session_state.show_sources_default)

        st.markdown("---")
        st.markdown("##### **About StudyMate**")
        st.markdown("""
        - **Model:** Google Gemini 3.8 Flash
        - **Vector Index:** FAISS (Flat IP)
        - **Embeddings:** `all-MiniLM-L6-v2`
        - **Text Extractor:** PyPDF
        """)


# ──────────────────────────────────────────────
# 6. Main Top Status Header Bar
# ──────────────────────────────────────────────

if st.session_state.current_file:
    st.markdown(f"""
    <div class="top-status-bar">
        <div class="top-status-title">
            <span>📄</span>
            <span>{st.session_state.current_file}</span>
        </div>
        <div>
            <span class="status-badge-success">✓ Indexed</span>
        </div>
    </div>
    """, unsafe_allow_html=True)


# ──────────────────────────────────────────────
# 7. Welcome Screen (When No Messages Exist)
# ──────────────────────────────────────────────

if not st.session_state.messages:
    st.markdown(render_logo_html("medium"), unsafe_allow_html=True)

    st.markdown("""
    <div class="welcome-hero">
        <div class="welcome-title">StudyMate</div>
        <div class="welcome-subtitle">Your AI Study Assistant</div>
        <div class="welcome-desc">
            Ask questions about your documents using Retrieval-Augmented Generation.
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<h4 style='font-size:0.9rem; font-weight:600; color:var(--text-muted); margin-bottom:0.75rem; text-align:center;'>Suggested Questions</h4>", unsafe_allow_html=True)

    s1, s2 = st.columns(2)
    with s1:
        if st.button("💡 What are the key concepts?", key="sug1", use_container_width=True):
            st.session_state.pending_question = "What are the key concepts?"
            st.rerun()
        if st.button("🔍 Explain this topic simply", key="sug2", use_container_width=True):
            st.session_state.pending_question = "Explain this topic simply"
            st.rerun()
    with s2:
        if st.button("📝 Summarize this document", key="sug3", use_container_width=True):
            st.session_state.pending_question = "Summarize this document"
            st.rerun()
        if st.button("🎯 Give me important exam questions", key="sug4", use_container_width=True):
            st.session_state.pending_question = "Give me important exam questions"
            st.rerun()


# ──────────────────────────────────────────────
# 8. Render Chat Messages
# ──────────────────────────────────────────────

for idx, msg in enumerate(st.session_state.messages):
    timestamp_str = msg.get("timestamp", "")

    if msg["role"] == "user":
        with st.chat_message("user", avatar="👤"):
            st.markdown(f"<div>{html.escape(msg['content'])}</div>", unsafe_allow_html=True)
            if timestamp_str:
                st.markdown(f'<div class="message-timestamp" style="text-align:right; margin-top:4px;">{timestamp_str}</div>', unsafe_allow_html=True)

    elif msg["role"] == "assistant":
        avatar_val = str(LOGO_PATH) if LOGO_PATH.exists() else "🎓"
        with st.chat_message("assistant", avatar=avatar_val):
            # Header with label & timestamp
            st.markdown(f"""
            <div class="assistant-header">
                <span class="assistant-name">StudyMate</span>
                <span class="message-timestamp">{timestamp_str}</span>
            </div>
            """, unsafe_allow_html=True)

            # Markdown answer content
            st.markdown(msg["content"])

            # Sources & Page Badges
            source_pages = msg.get("source_pages", [])
            retrieved_chunks = msg.get("retrieved_chunks", [])

            if source_pages:
                badges_html = "".join([f'<span class="page-badge">📄 Page {p}</span>' for p in source_pages])
                st.markdown(f"""
                <div class="source-bar">
                    <span class="source-label">Sources:</span>
                    {badges_html}
                </div>
                """, unsafe_allow_html=True)

            # Message Action Buttons
            act_col1, act_col2, act_col3, act_col_space = st.columns([0.15, 0.22, 0.25, 0.38])
            with act_col1:
                with st.popover("📋 Copy"):
                    st.code(msg["content"], language=None)
            with act_col2:
                if st.button("🔄 Regenerate", key=f"regen_{idx}"):
                    user_prompts = [m["content"] for m in st.session_state.messages[:idx] if m["role"] == "user"]
                    if user_prompts:
                        st.session_state.pending_question = user_prompts[-1]
                        st.rerun()
            with act_col3:
                show_sources_exp = st.checkbox(
                    "🔍 View Sources",
                    value=st.session_state.show_sources_default,
                    key=f"src_chk_{idx}",
                )

            # Expandable Raw Retrieved Sources
            if show_sources_exp and retrieved_chunks:
                with st.expander("View retrieved sources", expanded=True):
                    for i, chunk in enumerate(retrieved_chunks, 1):
                        score_val = chunk.get("score")
                        score_fmt = f"{score_val:.2f}" if isinstance(score_val, (int, float)) else "N/A"
                        page_num = chunk.get("page", "?")
                        text_content = chunk.get("text", "")

                        st.markdown(f"""
                        <div class="chunk-card">
                            <div class="chunk-meta">
                                <span>📄 Page {page_num}</span>
                                <span>Retrieval score: {score_fmt}</span>
                            </div>
                            <div class="chunk-text">{html.escape(text_content)}</div>
                        </div>
                        """, unsafe_allow_html=True)


# ──────────────────────────────────────────────
# 9. Bottom Chat Input & Question Handling
# ──────────────────────────────────────────────

prompt_input = st.chat_input("Ask anything about your document...")
prompt = prompt_input or st.session_state.pending_question

if prompt:
    st.session_state.pending_question = None

    if st.session_state.index is None or not st.session_state.chunks:
        st.error("⚠️ Please upload a PDF document in the sidebar first!")
    else:
        now_time = datetime.datetime.now().strftime("%I:%M %p")

        # 1. Active conversation check or creation
        if not st.session_state.active_conv_id:
            conv_id = database.create_conversation(
                title=database.generate_title_from_question(prompt),
                doc_name=st.session_state.current_file,
            )
            st.session_state.active_conv_id = conv_id
            if st.session_state.chunks:
                database.save_document_chunks(conv_id, st.session_state.chunks)
        else:
            # Update title on first question if currently "New Chat"
            conv = database.get_conversation(st.session_state.active_conv_id)
            if conv and conv.get("title") == "New Chat":
                new_title = database.generate_title_from_question(prompt)
                database.update_conversation_title(st.session_state.active_conv_id, new_title)

        # 2. Add user question to SQLite DB & Session
        database.add_message(st.session_state.active_conv_id, "user", prompt)
        st.session_state.messages.append({
            "role": "user",
            "content": prompt,
            "timestamp": now_time,
        })

        # 3. RAG Retrieval & Gemini Answer Generation
        with st.spinner("🔍 Searching document and generating answer..."):
            try:
                retrieved = retrieve_relevant_chunks(
                    query=prompt,
                    index=st.session_state.index,
                    chunks=st.session_state.chunks,
                    top_k=4,
                )
                answer = generate_answer(prompt, retrieved)
                source_pages = sorted(list(set(chunk["page"] for chunk in retrieved)))

                # Save assistant response to SQLite DB & Session
                database.add_message(
                    st.session_state.active_conv_id,
                    "assistant",
                    answer,
                    source_pages=source_pages,
                    retrieved_chunks=retrieved,
                )
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": answer,
                    "timestamp": now_time,
                    "source_pages": source_pages,
                    "retrieved_chunks": retrieved,
                })
            except Exception as e:
                err_msg = f"❌ Error generating answer: {e}"
                database.add_message(
                    st.session_state.active_conv_id,
                    "assistant",
                    err_msg,
                )
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": err_msg,
                    "timestamp": now_time,
                    "source_pages": [],
                    "retrieved_chunks": [],
                })

        st.rerun()
