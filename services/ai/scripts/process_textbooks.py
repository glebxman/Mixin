"""
Indexes textbooks (PDF / DOCX / TXT / MD) into Qdrant for RAG.

Usage:
  python scripts/process_textbooks.py
  python scripts/process_textbooks.py --subject математика
  python scripts/process_textbooks.py --grade 9
  python scripts/process_textbooks.py --skip-existing
  python scripts/process_textbooks.py --dry-run

Backends (controlled by EMBEDDING_BACKEND env var):
  local   — sentence-transformers, runs offline, no API cost.
            Default model: intfloat/multilingual-e5-base (768d).
  google  — text-embedding-004 via google-generativeai.
            Requires GOOGLE_AI_API_KEY.

Schema: see services/ai/scripts/README.md.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence

# Make the AI service root importable when running as a script
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv
    from qdrant_client import QdrantClient
    from qdrant_client.models import (
        Distance,
        FieldCondition,
        Filter,
        MatchValue,
        PointStruct,
        VectorParams,
    )
    from tqdm import tqdm
except ImportError as exc:  # pragma: no cover - import-time guard
    print(f"❌ Missing dependency: {exc}")
    print("   Install: pip install -r services/ai/requirements.txt")
    sys.exit(1)

# Load .env from the workspace root (services/ai/scripts/.. /.. /.env)
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent.parent / ".env")

# ─── Config ──────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).parent.parent.parent.parent
TEXTBOOKS_DIR = ROOT_DIR / "data" / "textbooks"

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY") or None
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "textbooks")

EMBEDDING_BACKEND = os.getenv("EMBEDDING_BACKEND", "local").strip().lower()
EMBEDDING_MODEL_LOCAL = os.getenv(
    "EMBEDDING_MODEL_LOCAL", "intfloat/multilingual-e5-base"
)
EMBEDDING_VECTOR_SIZE = int(os.getenv("EMBEDDING_VECTOR_SIZE", "768"))

# Higher chunk size keeps more context per vector. 500 tokens (~700 words)
# is a good trade-off between recall and answer specificity.
CHUNK_TOKENS = int(os.getenv("RAG_CHUNK_TOKENS", "500"))
CHUNK_OVERLAP_TOKENS = int(os.getenv("RAG_CHUNK_OVERLAP", "60"))

# Batch sizes — tuned for both backends. Local model is GPU/CPU-bound,
# remote API is rate-limited and slow per-call; batching helps both.
EMBED_BATCH_LOCAL = int(os.getenv("RAG_EMBED_BATCH_LOCAL", "32"))
EMBED_BATCH_GOOGLE = int(os.getenv("RAG_EMBED_BATCH_GOOGLE", "100"))
QDRANT_UPSERT_BATCH = int(os.getenv("RAG_UPSERT_BATCH", "256"))

# Folder name → canonical subject id used in Qdrant payload.
SUBJECT_MAPPING = {
    "математика": "math",
    "физика": "physics",
    "химия": "chemistry",
    "биология": "biology",
    "информатика": "computer_science",
    "история": "history",
    "география": "geography",
    "литература": "literature",
    "русский-язык": "russian",
    "узбекский-язык": "uzbek",
    "английский-язык": "english",
}

# Stable namespace for content-derived UUIDs. Same input → same id,
# so re-running the script overwrites old vectors instead of duplicating.
ID_NAMESPACE = uuid.UUID("8a4f6b0a-6cdb-4e1a-9c6c-2a9a0d1f0a01")

GRADE_FROM_PATH_RE = re.compile(r"(\d+)[-_]?(класс|sinf|klass)", re.IGNORECASE)
SUPPORTED_EXT = {".pdf", ".docx", ".txt", ".md"}


# ─── Embedding backends ──────────────────────────────────────────────


class EmbeddingBackend:
    """Common interface; subclasses implement actual encoding."""

    name: str
    vector_size: int

    def encode(self, texts: Sequence[str]) -> List[List[float]]:
        raise NotImplementedError


class LocalSentenceTransformer(EmbeddingBackend):
    """Local CPU/GPU embeddings via sentence-transformers.

    The model is downloaded on first use (cached under ~/.cache/huggingface).
    For multilingual-e5-* the official guidance is to prefix passages with
    "passage: " and queries with "query: " — this script always indexes
    passages.
    """

    name = "local"

    def __init__(self, model_id: str, expected_dim: int) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise SystemExit(
                "Local embedding backend requires sentence-transformers. "
                "Install: pip install sentence-transformers"
            ) from exc

        print(f"🔧 Loading local embedding model: {model_id} (one-time download if missing)")
        self._model = SentenceTransformer(model_id)
        self._is_e5 = "e5" in model_id.lower()
        actual_dim = int(self._model.get_sentence_embedding_dimension())
        if actual_dim != expected_dim:
            print(
                f"⚠️  EMBEDDING_VECTOR_SIZE={expected_dim} but model returns {actual_dim}. "
                f"Updating runtime size to {actual_dim}."
            )
        self.vector_size = actual_dim

    def encode(self, texts: Sequence[str]) -> List[List[float]]:
        prepped = [f"passage: {t}" if self._is_e5 else t for t in texts]
        vectors = self._model.encode(
            prepped,
            batch_size=EMBED_BATCH_LOCAL,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return [v.tolist() for v in vectors]


class GoogleEmbedding(EmbeddingBackend):
    """Gemini text-embedding-004 — 768 dim, multilingual."""

    name = "google"
    vector_size = 768

    def __init__(self) -> None:
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            raise SystemExit("GOOGLE_AI_API_KEY must be set when EMBEDDING_BACKEND=google")
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise SystemExit(
                "Google embedding backend requires google-generativeai. "
                "Install: pip install google-generativeai"
            ) from exc
        genai.configure(api_key=api_key)
        self._genai = genai

    def encode(self, texts: Sequence[str]) -> List[List[float]]:
        # google-generativeai accepts a list under `content`.
        result = self._genai.embed_content(
            model="models/text-embedding-004",
            content=list(texts),
            task_type="retrieval_document",
        )
        emb = result.get("embedding")
        # Single string returns flat vector; list returns list of vectors.
        if not emb:
            return []
        if isinstance(emb[0], (int, float)):
            return [list(emb)]
        return [list(v) for v in emb]


def make_backend() -> EmbeddingBackend:
    if EMBEDDING_BACKEND == "local":
        return LocalSentenceTransformer(EMBEDDING_MODEL_LOCAL, EMBEDDING_VECTOR_SIZE)
    if EMBEDDING_BACKEND == "google":
        return GoogleEmbedding()
    raise SystemExit(
        f"Unknown EMBEDDING_BACKEND='{EMBEDDING_BACKEND}'. Use 'local' or 'google'."
    )


# ─── Text extraction ─────────────────────────────────────────────────


def extract_pdf(path: Path) -> str:
    """Extract text from PDF. Tries pdfplumber first, falls back to PyPDF2."""
    try:
        import pdfplumber

        out: List[str] = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                txt = page.extract_text() or ""
                if txt:
                    out.append(txt)
        text = "\n".join(out).strip()
        if text:
            return text
    except Exception as exc:
        print(f"   ⚠️  pdfplumber failed ({exc}); trying PyPDF2")

    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(str(path))
        return "\n".join((page.extract_text() or "") for page in reader.pages).strip()
    except Exception as exc:
        print(f"   ❌ PyPDF2 also failed: {exc}")
        return ""


def extract_docx(path: Path) -> str:
    try:
        from docx import Document

        return "\n".join(p.text for p in Document(str(path)).paragraphs).strip()
    except Exception as exc:
        print(f"   ❌ DOCX read failed: {exc}")
        return ""


def extract_text(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".pdf":
        return extract_pdf(path)
    if ext == ".docx":
        return extract_docx(path)
    if ext in {".txt", ".md"}:
        try:
            return path.read_text(encoding="utf-8", errors="ignore").strip()
        except Exception as exc:
            print(f"   ❌ TXT read failed: {exc}")
            return ""
    return ""


# ─── Chunking ────────────────────────────────────────────────────────


_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n{2,}")


def split_into_chunks(
    text: str, chunk_tokens: int = CHUNK_TOKENS, overlap_tokens: int = CHUNK_OVERLAP_TOKENS
) -> List[str]:
    """Sentence-aware splitter approximating chunk size by word count.

    Adds an ``overlap_tokens``-sized tail from the previous chunk so that
    paragraph boundaries don't drop context for the next chunk.
    """
    if not text.strip():
        return []

    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]
    chunks: List[str] = []
    buf: List[str] = []
    buf_len = 0

    for sentence in sentences:
        sent_len = len(sentence.split())
        if buf and buf_len + sent_len > chunk_tokens:
            chunks.append(" ".join(buf))
            # overlap tail
            tail: List[str] = []
            tail_len = 0
            for s in reversed(buf):
                w = len(s.split())
                if tail_len + w > overlap_tokens:
                    break
                tail.insert(0, s)
                tail_len += w
            buf = tail + [sentence]
            buf_len = sum(len(s.split()) for s in buf)
        else:
            buf.append(sentence)
            buf_len += sent_len

    if buf:
        chunks.append(" ".join(buf))

    return chunks


# ─── Metadata ────────────────────────────────────────────────────────


@dataclass(frozen=True)
class FileMeta:
    subject: str
    language: str
    grade: Optional[int]
    filename: str


def parse_meta(path: Path) -> FileMeta:
    parts = path.parts
    subject = "unknown"
    language = "ru"
    grade: Optional[int] = None

    for part in parts:
        if part in SUBJECT_MAPPING:
            subject = SUBJECT_MAPPING[part]
        if part in {"ru", "uz"}:
            language = part
        m = GRADE_FROM_PATH_RE.search(part)
        if m and grade is None:
            grade = int(m.group(1))

    if grade is None:
        m = GRADE_FROM_PATH_RE.search(path.stem)
        if m:
            grade = int(m.group(1))

    return FileMeta(subject=subject, language=language, grade=grade, filename=path.name)


# ─── Qdrant helpers ──────────────────────────────────────────────────


def ensure_collection(client: QdrantClient, vector_size: int) -> None:
    collections = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME in collections:
        info = client.get_collection(COLLECTION_NAME)
        existing_size = info.config.params.vectors.size  # type: ignore[union-attr]
        if existing_size != vector_size:
            raise SystemExit(
                f"Collection '{COLLECTION_NAME}' already exists with vector_size={existing_size}, "
                f"but the configured backend produces {vector_size}-dim vectors. "
                f"Run scripts/clear_textbooks_index.py first or set EMBEDDING_VECTOR_SIZE accordingly."
            )
        return
    print(f"📦 Creating collection '{COLLECTION_NAME}' (size={vector_size}, distance=COSINE)")
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )


def file_already_indexed(client: QdrantClient, filename: str) -> bool:
    try:
        result = client.count(
            collection_name=COLLECTION_NAME,
            count_filter=Filter(
                must=[FieldCondition(key="filename", match=MatchValue(value=filename))]
            ),
            exact=False,
        )
        return result.count > 0
    except Exception:
        return False


def make_point_id(filename: str, chunk_index: int) -> str:
    return str(uuid.uuid5(ID_NAMESPACE, f"{filename}:{chunk_index}"))


# ─── Pipeline ────────────────────────────────────────────────────────


def iter_textbook_files(
    root: Path, subject_filter: Optional[str], grade_filter: Optional[int]
) -> Iterable[Path]:
    if not root.exists():
        return
    for subject_dir in sorted(root.iterdir()):
        if not subject_dir.is_dir() or subject_dir.name.startswith("."):
            continue
        if subject_filter and subject_dir.name != subject_filter:
            continue
        for lang_dir in sorted(subject_dir.iterdir()):
            if not lang_dir.is_dir() or lang_dir.name not in {"ru", "uz"}:
                continue
            for path in sorted(lang_dir.rglob("*")):
                if not path.is_file() or path.suffix.lower() not in SUPPORTED_EXT:
                    continue
                if path.name == ".gitkeep":
                    continue
                if grade_filter is not None:
                    meta = parse_meta(path)
                    if meta.grade != grade_filter:
                        continue
                yield path


def batched(seq: List, n: int) -> Iterable[List]:
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def process_one_file(
    path: Path,
    *,
    backend: EmbeddingBackend,
    client: QdrantClient,
    skip_existing: bool,
    dry_run: bool,
) -> int:
    meta = parse_meta(path)
    rel = path.relative_to(ROOT_DIR)

    if skip_existing and not dry_run and file_already_indexed(client, meta.filename):
        print(f"⏭   skip (already indexed): {rel}")
        return 0

    print(f"\n📖 {rel}")
    text = extract_text(path)
    if not text:
        print("   ⚠️  empty / unreadable")
        return 0

    chunks = split_into_chunks(text)
    print(
        f"   chars={len(text):,}  chunks={len(chunks)}  "
        f"subject={meta.subject}  lang={meta.language}  grade={meta.grade}"
    )
    if not chunks:
        return 0
    if dry_run:
        return len(chunks)

    embed_batch = (
        EMBED_BATCH_LOCAL if backend.name == "local" else EMBED_BATCH_GOOGLE
    )

    indexed = 0
    pending: List[PointStruct] = []
    progress = tqdm(total=len(chunks), desc="   embedding", leave=False, unit="chunk")
    try:
        for batch_start in range(0, len(chunks), embed_batch):
            batch_chunks = chunks[batch_start : batch_start + embed_batch]
            try:
                vectors = backend.encode(batch_chunks)
            except Exception as exc:
                print(f"   ❌ embedding batch failed: {exc}")
                progress.update(len(batch_chunks))
                continue

            for offset, (chunk, vec) in enumerate(zip(batch_chunks, vectors)):
                idx = batch_start + offset
                pending.append(
                    PointStruct(
                        id=make_point_id(meta.filename, idx),
                        vector=vec,
                        payload={
                            "subject": meta.subject,
                            "language": meta.language,
                            "grade": meta.grade,
                            "filename": meta.filename,
                            "text": chunk,
                            "chunk_index": idx,
                            "total_chunks": len(chunks),
                        },
                    )
                )

            progress.update(len(batch_chunks))

            while len(pending) >= QDRANT_UPSERT_BATCH:
                head = pending[:QDRANT_UPSERT_BATCH]
                pending = pending[QDRANT_UPSERT_BATCH:]
                client.upsert(collection_name=COLLECTION_NAME, points=head, wait=False)
                indexed += len(head)
    finally:
        progress.close()

    if pending:
        client.upsert(collection_name=COLLECTION_NAME, points=pending, wait=True)
        indexed += len(pending)

    print(f"   ✅ upserted {indexed} vectors")
    return indexed


def main() -> int:
    parser = argparse.ArgumentParser(description="Index textbooks into Qdrant for RAG.")
    parser.add_argument("--subject", type=str, default=None, help="Filter by folder name (e.g. 'математика')")
    parser.add_argument("--grade", type=int, default=None, help="Filter by grade number (1-11)")
    parser.add_argument("--skip-existing", action="store_true", help="Skip files already in the index (matched by filename payload)")
    parser.add_argument("--dry-run", action="store_true", help="Extract and chunk but do not embed or upsert")
    args = parser.parse_args()

    if not TEXTBOOKS_DIR.exists():
        print(f"❌ Textbooks directory not found: {TEXTBOOKS_DIR}")
        return 1

    files = list(iter_textbook_files(TEXTBOOKS_DIR, args.subject, args.grade))
    if not files:
        print("ℹ️  No matching textbook files found.")
        return 0

    print(f"📚 Found {len(files)} textbook files")
    print(f"🔌 Qdrant: {QDRANT_URL}  (collection={COLLECTION_NAME})")
    print(f"🧠 Embedding backend: {EMBEDDING_BACKEND}")

    backend = make_backend() if not args.dry_run else None
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    if backend is not None:
        ensure_collection(client, backend.vector_size)

    total_chunks = 0
    total_files = 0
    for path in files:
        try:
            chunks = process_one_file(
                path,
                backend=backend or _NullBackend(),
                client=client,
                skip_existing=args.skip_existing,
                dry_run=args.dry_run,
            )
            total_chunks += chunks
            total_files += 1
        except KeyboardInterrupt:
            print("\n⏸  Interrupted by user")
            break
        except Exception as exc:
            print(f"   ❌ failed: {exc}")
            continue

    print("\n" + "=" * 60)
    if args.dry_run:
        print(f"🧪 Dry run complete. Would index {total_chunks} chunks from {total_files} files.")
    else:
        print(f"✅ Done. Files processed: {total_files}, vectors upserted: {total_chunks}")
    print("=" * 60)
    return 0


class _NullBackend(EmbeddingBackend):
    """No-op backend for --dry-run; never called."""

    name = "dry"
    vector_size = 0

    def encode(self, texts: Sequence[str]) -> List[List[float]]:
        return [[] for _ in texts]


if __name__ == "__main__":
    sys.exit(main())
