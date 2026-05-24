"""
AI service configuration — single source of truth for environment-derived
constants used across services/ai.

This module is intentionally side-effect-free: it only reads environment
variables and exposes them as module-level constants. Bootstrap-time
validation of required secrets lives in
``services/ai/bootstrap/required_secrets.py`` (see task B.2) and must not
be performed here.

All OpenRouter env reads should go through this module so that defaults
and variable names are not duplicated across the codebase.
"""

import os


OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = os.getenv(
    "OPENROUTER_BASE_URL",
    "https://openrouter.ai/api/v1",
)

OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openrouter/free")
OPENROUTER_VISION_MODEL: str = os.getenv(
    "OPENROUTER_VISION_MODEL",
    OPENROUTER_MODEL,
)

# Canonical source of truth for the image-generation model identifier used
# by the AI service. Both ``services/ai/services/image_service.py`` and
# ``services/ai/services/llm_service.py`` (visualization payload) MUST
# import ``IMAGE_MODEL`` from this module rather than reading
# ``OPENROUTER_IMAGE_MODEL`` directly. The default is the only known
# free-tier image-output model on OpenRouter that supports the
# ``modalities=["image", "text"]`` chat-completions contract.
IMAGE_MODEL: str = os.getenv(
    "OPENROUTER_IMAGE_MODEL",
    "google/gemini-2.5-flash-image-preview:free",
)

INTERNAL_SERVICE_TOKEN: str = os.getenv("INTERNAL_SERVICE_TOKEN", "")

NODE_ENV: str = os.getenv("NODE_ENV", "development")
IS_PRODUCTION: bool = NODE_ENV == "production"


# AI per-plan daily message thresholds. Validation lives in
# ``services/ai/bootstrap/required_secrets.py``; here we only read the
# already-validated values into typed constants.
AI_RATE_LIMIT_DISABLED: bool = os.getenv("AI_RATE_LIMIT_DISABLED", "false").strip().lower() == "true"
AI_FREE_MESSAGES_PER_DAY: int = int(os.getenv("AI_FREE_MESSAGES_PER_DAY", "50"))
AI_BASIC_MESSAGES_PER_DAY: int = int(os.getenv("AI_BASIC_MESSAGES_PER_DAY", "200"))
AI_PREMIUM_MESSAGES_PER_DAY: int = int(os.getenv("AI_PREMIUM_MESSAGES_PER_DAY", "2000"))
