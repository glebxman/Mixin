"""
RAG: ищет релевантные куски учебников в Qdrant и возвращает их как контекст
для LLM. Подключается в tutor_agent перед вызовом модели.

Поведение:
  - Если переменная RAG_ENABLED=false (или пакеты недоступны / Qdrant
    недоступен / коллекция пуста), retrieve_context() возвращает [] —
    чат продолжает работать без контекста, без падений.
  - Embedding-модель совпадает с той, что используется для индексации
    в scripts/process_textbooks.py (по умолчанию intfloat/multilingual-e5-base).
    Иначе вектора будут несравнимы.
  - Для multilingual-e5-* используем префикс "query: " для запроса
    (соответствует "passage: " при индексации).
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger("rag_service")

RAG_ENABLED = os.getenv("RAG_ENABLED", "true").strip().lower() != "false"
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY") or None
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "textbooks")
EMBEDDING_MODEL_LOCAL = os.getenv(
    "EMBEDDING_MODEL_LOCAL", "intfloat/multilingual-e5-base"
)
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "3"))
RAG_MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", "0.5"))
RAG_MAX_CHARS_PER_HIT = int(os.getenv("RAG_MAX_CHARS_PER_HIT", "500"))


@dataclass
class RetrievedHit:
    text: str
    score: float
    subject: str
    language: str
    grade: Optional[int]
    filename: str


# Lazy singletons — инициализируем по первому вызову, чтобы не
# блокировать старт сервиса (загрузка модели — ~5 сек, но всё-таки).
_model = None
_qdrant = None
_init_lock = threading.Lock()
_init_failed = False


def _init() -> bool:
    """Инициализирует модель и Qdrant-клиент. Возвращает True при успехе."""
    global _model, _qdrant, _init_failed
    if _init_failed:
        return False
    if _model is not None and _qdrant is not None:
        return True
    with _init_lock:
        if _init_failed:
            return False
        if _model is not None and _qdrant is not None:
            return True
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore
            from qdrant_client import QdrantClient  # type: ignore

            logger.info(
                "[rag] loading embedding model %s (one-time download if missing)",
                EMBEDDING_MODEL_LOCAL,
            )
            _model = SentenceTransformer(EMBEDDING_MODEL_LOCAL)
            _qdrant = QdrantClient(
                url=QDRANT_URL,
                api_key=QDRANT_API_KEY,
                check_compatibility=False,
            )
            # Проверяем коллекцию — без неё RAG не имеет смысла.
            collections = {c.name for c in _qdrant.get_collections().collections}
            if COLLECTION_NAME not in collections:
                logger.warning(
                    "[rag] collection %s not found in Qdrant; RAG disabled until indexing",
                    COLLECTION_NAME,
                )
                _init_failed = True
                return False
            logger.info("[rag] ready (collection=%s)", COLLECTION_NAME)
            return True
        except Exception as exc:
            logger.warning("[rag] init failed, RAG disabled: %s", exc)
            _init_failed = True
            return False


def _build_filter(
    *,
    language: Optional[str],
    grade: Optional[int],
    subject: Optional[str],
):
    """Собирает Qdrant Filter с непустыми ограничениями."""
    from qdrant_client.models import FieldCondition, Filter, MatchValue  # type: ignore

    must = []
    if language:
        must.append(FieldCondition(key="language", match=MatchValue(value=language)))
    if grade is not None:
        must.append(FieldCondition(key="grade", match=MatchValue(value=int(grade))))
    if subject:
        must.append(FieldCondition(key="subject", match=MatchValue(value=subject)))
    return Filter(must=must) if must else None


def _is_e5_model(model_id: str) -> bool:
    return "e5" in model_id.lower()


def retrieve_context(
    query: str,
    *,
    language: Optional[str] = None,
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    top_k: int = RAG_TOP_K,
    min_score: float = RAG_MIN_SCORE,
) -> List[RetrievedHit]:
    """Возвращает релевантные куски учебников. Никогда не падает —
    при ошибке/отключённом RAG возвращает []."""
    if not RAG_ENABLED or not query or not query.strip():
        return []
    if not _init():
        return []

    try:
        prepped = f"query: {query}" if _is_e5_model(EMBEDDING_MODEL_LOCAL) else query
        vector = _model.encode(  # type: ignore[union-attr]
            prepped, normalize_embeddings=True, show_progress_bar=False
        ).tolist()

        # Сначала пробуем со всеми фильтрами; если ничего не нашлось,
        # снимаем grade-фильтр (часто учебник для 5 класса актуален и для 4),
        # потом subject — чтобы не возвращать пустоту, когда мета не совпадает.
        attempts = [
            _build_filter(language=language, grade=grade, subject=subject),
            _build_filter(language=language, grade=None, subject=subject),
            _build_filter(language=language, grade=None, subject=None),
        ]

        results = []
        for flt in attempts:
            response = _qdrant.query_points(  # type: ignore[union-attr]
                collection_name=COLLECTION_NAME,
                query=vector,
                query_filter=flt,
                limit=top_k,
                score_threshold=min_score,
                with_payload=True,
            )
            results = response.points
            if results:
                break

        hits: List[RetrievedHit] = []
        for r in results:
            payload = r.payload or {}
            text = str(payload.get("text") or "").strip()
            if not text:
                continue
            if len(text) > RAG_MAX_CHARS_PER_HIT:
                text = text[:RAG_MAX_CHARS_PER_HIT].rstrip() + "…"
            hits.append(
                RetrievedHit(
                    text=text,
                    score=float(r.score or 0.0),
                    subject=str(payload.get("subject") or "unknown"),
                    language=str(payload.get("language") or "ru"),
                    grade=payload.get("grade") if isinstance(payload.get("grade"), int) else None,
                    filename=str(payload.get("filename") or ""),
                )
            )
        return hits
    except Exception as exc:
        logger.warning("[rag] retrieval failed: %s", exc)
        return []


def format_context_block(hits: List[RetrievedHit]) -> str:
    """Compact context block to be appended to the system prompt."""
    if not hits:
        return ""
    lines = ["═══ TEXTBOOK CONTEXT ═══"]
    lines.append(
        "Below are excerpts from school textbooks relevant to the student's question. "
        "Use them as a grounding for your explanation and reference them when useful. "
        "If the excerpts don't actually answer the question, just answer normally — "
        "do NOT invent textbook references."
    )
    for i, hit in enumerate(hits, start=1):
        meta = []
        if hit.subject and hit.subject != "unknown":
            meta.append(hit.subject)
        if hit.grade:
            meta.append(f"grade {hit.grade}")
        if hit.language:
            meta.append(hit.language)
        meta.append(f"score={hit.score:.2f}")
        header = f"[{i}] {hit.filename}  ({', '.join(meta)})"
        lines.append("")
        lines.append(header)
        lines.append(hit.text)
    lines.append("═══════════════════════════")
    return "\n".join(lines)
