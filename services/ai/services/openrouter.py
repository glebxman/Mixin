"""
Shared OpenRouter client primitives.

All HTTP calls to OpenRouter from this service must go through this module
so that headers (Authorization, Referer, X-Title) and the base URL are
defined exactly once. Callers should import HEADERS-helper / URL from here
instead of reading env vars directly.
"""

from __future__ import annotations

import os

# Single source of truth for OpenRouter env. Mirrors config.py but kept
# here so that legacy modules that historically bypassed config.py can be
# migrated incrementally without import cycles.
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = os.getenv(
    "OPENROUTER_BASE_URL",
    "https://openrouter.ai/api/v1",
)

CHAT_COMPLETIONS_URL: str = f"{OPENROUTER_BASE_URL}/chat/completions"

_REFERER = "https://mixin.uz"
_TITLE = "Mixin EdTech UZ"


def headers() -> dict[str, str]:
    """Standard OpenRouter request headers (Authorization + identification)."""
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": _REFERER,
        "X-Title": _TITLE,
    }


def is_configured() -> bool:
    """True if OPENROUTER_API_KEY is set; useful for early returns in callers."""
    return bool(OPENROUTER_API_KEY)
