"""Standalone smoke-test for rag_service.retrieve_context against live Qdrant."""
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "services" / "ai"))

from dotenv import load_dotenv  # type: ignore
load_dotenv(ROOT / ".env")

from services.rag_service import retrieve_context, format_context_block  # type: ignore

queries = [
    ("Что такое натуральные числа?", "ru", 5),
    ("Что такое дробь?", "ru", 5),
    ("Tabiiy sonlar nima?", "uz", 5),
]

for q, lang, grade in queries:
    print(f"\n=== query={q!r}  language={lang}  grade={grade} ===")
    hits = retrieve_context(q, language=lang, grade=grade)
    if not hits:
        print("  (no hits)")
        continue
    for i, h in enumerate(hits, 1):
        print(f"  [{i}] score={h.score:.3f}  {h.filename}  ({h.subject}, {h.language}, grade={h.grade})")
        preview = h.text[:160].replace("\n", " ")
        print(f"      {preview}...")
