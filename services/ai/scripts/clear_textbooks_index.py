"""
Drops the Qdrant collection used for textbook RAG. Use it before re-indexing
with a different embedding model (e.g. switching from local 768d to 1024d).

Usage:
  python scripts/clear_textbooks_index.py
  python scripts/clear_textbooks_index.py --yes   # skip prompt
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv
    from qdrant_client import QdrantClient
except ImportError as exc:  # pragma: no cover
    print(f"❌ Missing dependency: {exc}")
    print("   Install: pip install -r services/ai/requirements.txt")
    sys.exit(1)

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent.parent / ".env")

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY") or None
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "textbooks")


def main() -> int:
    parser = argparse.ArgumentParser(description="Delete the textbook RAG collection from Qdrant.")
    parser.add_argument("--yes", action="store_true", help="Do not prompt for confirmation")
    args = parser.parse_args()

    if not args.yes:
        confirm = input(
            f"⚠️  Delete Qdrant collection '{COLLECTION_NAME}' at {QDRANT_URL}? (yes/no): "
        )
        if confirm.strip().lower() != "yes":
            print("Cancelled.")
            return 1

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    try:
        collections = {c.name for c in client.get_collections().collections}
        if COLLECTION_NAME not in collections:
            print(f"ℹ️  Collection '{COLLECTION_NAME}' does not exist.")
            return 0
        print(f"🗑   Deleting collection '{COLLECTION_NAME}'...")
        client.delete_collection(collection_name=COLLECTION_NAME)
        print("✅ Deleted.")
        return 0
    except Exception as exc:
        print(f"❌ Failed to delete collection: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
