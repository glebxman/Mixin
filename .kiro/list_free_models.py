"""Берёт реальный список бесплатных моделей с OpenRouter и печатает топ."""
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

key = os.environ.get("OPENROUTER_API_KEY", "")
if not key:
    print("OPENROUTER_API_KEY missing")
    sys.exit(1)

with httpx.Client(timeout=30) as c:
    r = c.get(
        "https://openrouter.ai/api/v1/models",
        headers={"Authorization": f"Bearer {key}"},
    )
    r.raise_for_status()
    data = r.json()

free = []
for m in data.get("data", []):
    pricing = m.get("pricing") or {}
    prompt = float(pricing.get("prompt", "0") or 0)
    completion = float(pricing.get("completion", "0") or 0)
    if prompt == 0 and completion == 0:
        free.append((m.get("id"), m.get("context_length"), m.get("name")))

free.sort(key=lambda x: (-(x[1] or 0), x[0]))
print(f"Total free models: {len(free)}\n")
print(f"{'ID':<60} {'CTX':>9}  NAME")
for mid, ctx, name in free[:40]:
    print(f"{mid:<60} {ctx or 0:>9}  {name}")
