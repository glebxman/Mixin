"""
Vision-call for the chat router. Takes a photo + text and returns a textual
answer from the model. Was inlined in routers/chat.py before extraction.
"""

import os
from typing import Optional, Dict

import httpx

from .openrouter import (
    CHAT_COMPLETIONS_URL,
    headers as openrouter_headers,
    is_configured as openrouter_is_configured,
)

_VISION_MODEL = os.getenv(
    "OPENROUTER_VISION_MODEL",
    os.getenv("OPENROUTER_MODEL", "openrouter/free"),
)
_SUPPORTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
}

_HTTP_TIMEOUT = 90.0


async def process_image_with_text(
    prompt: str,
    data_url: str,
    mime_type: str,
    student_context: Optional[Dict] = None,
) -> str:
    """
    Accepts a photo as a data: URL plus a text prompt; returns a text answer
    in the student's language.

    student_context is reserved for future parameters (age, etc.).
    """
    del student_context  # accepted for signature parity

    if not openrouter_is_configured():
        return "AI photo analysis is not configured. Add OPENROUTER_API_KEY to .env."

    if (
        not data_url.startswith("data:image/")
        or mime_type.lower() not in _SUPPORTED_IMAGE_MIME_TYPES
    ):
        return "Could not read the photo. Supported formats: JPG, PNG, WEBP, GIF, HEIC, HEIF."

    text_prompt = prompt.strip() or "Analyze the photo and help the student with the task."
    messages = [
        {
            "role": "system",
            "content": (
                "You are Mixin Nano, an AI tutor for school students in Uzbekistan. "
                "Analyze the image: if it's a problem, solve it step by step; "
                "if it's a text, explain its content; if it's a diagram, work through it. "
                "Always reply in the same language the student writes in. "
                "Do not mention any external model name."
            ),
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": text_prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        },
    ]

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.post(
                CHAT_COMPLETIONS_URL,
                headers=openrouter_headers(),
                json={
                    "model": _VISION_MODEL,
                    "messages": messages,
                    "max_tokens": 1600,
                    "temperature": 0.4,
                },
            )
            response.raise_for_status()
            data = response.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return str(reply).strip() or "Could not get an answer from the photo."
    except Exception as exc:
        return (
            "I received the photo, but the vision model didn't respond. "
            f"Please send the photo again or describe the task in text. Error: {exc}"
        )
