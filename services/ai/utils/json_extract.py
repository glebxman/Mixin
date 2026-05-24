"""
Tolerant JSON extractors for LLM output.

LLMs often wrap JSON in prose, code fences, or trailing commentary. These
helpers extract the first plausible JSON value from a string and return a
safe default on any failure. Used by recommendations / quest generator /
tutor_agent — they all need the same parsing.
"""

from __future__ import annotations

import json
import re
from typing import Any


_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)
_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


def _try_load(raw: str) -> Any | None:
    """Try strict json.loads, then a tolerant pass that strips trailing commas."""
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        try:
            cleaned = re.sub(r",(\s*[}\]])", r"\1", raw)
            return json.loads(cleaned)
        except Exception:
            return None


def extract_json_array(text: str | None) -> list:
    """Returns the first JSON array embedded in `text`, or an empty list."""
    if not text:
        return []
    match = _ARRAY_RE.search(text)
    if not match:
        return []
    parsed = _try_load(match.group(0))
    return parsed if isinstance(parsed, list) else []


def extract_json_object(text: str | None) -> dict:
    """Returns the first JSON object embedded in `text`, or an empty dict."""
    if not text:
        return {}
    match = _OBJECT_RE.search(text)
    if not match:
        return {}
    parsed = _try_load(match.group(0))
    return parsed if isinstance(parsed, dict) else {}
