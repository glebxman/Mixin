"""End-to-end smoke test:
   POST /api/chat/ to mixin-ai with a 5th-grade math question
   and confirm a non-error reply, RAG context picks up.

Run from host. Requires the AI container to be up and INTERNAL_SERVICE_TOKEN
in .env to match what the container loaded.
"""
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

token = os.environ.get("INTERNAL_SERVICE_TOKEN", "")
if not token:
    print("INTERNAL_SERVICE_TOKEN missing in .env")
    sys.exit(1)

payload = {
    "student_id": "smoke-test-student",
    "session_id": None,
    "message": "привет чт отакое дроби?",
    "history": [],
    "student_first_name": "Шерзод",
    "student_language": "ru",
    "student_grade": 5,
}

with httpx.Client(timeout=300) as c:
    r = c.post(
        "http://localhost:8000/api/chat/",
        headers={"X-Internal-Token": token},
        json=payload,
    )
    print(f"status={r.status_code}")
    if r.status_code != 200:
        print(r.text[:2000])
        sys.exit(2)
    data = r.json()
    print(f"reply length: {len(data.get('reply', ''))}")
    print()
    print(data.get("reply", "")[:800])
    print()
    print(f"actions: {data.get('actions')}")
    print(f"state:   {data.get('state')}")
