import importlib
import sys

print(f"python: {sys.version.split()[0]}")
for mod in [
    "qdrant_client",
    "pdfplumber",
    "PyPDF2",
    "docx",
    "tqdm",
    "dotenv",
    "sentence_transformers",
    "torch",
]:
    try:
        m = importlib.import_module(mod)
        v = getattr(m, "__version__", "?")
        print(f"  OK  {mod:25s} {v}")
    except Exception as exc:
        print(f"  MISS {mod:25s} {exc}")
