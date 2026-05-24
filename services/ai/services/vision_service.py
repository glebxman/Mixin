"""
Vision-call для chat-роутера. Принимает фото + текст и возвращает текстовый
ответ модели. Раньше это было inline в routers/chat.py.
"""

import os
from typing import Optional, Dict

import httpx

_OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
_OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
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


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mixin.uz",
        "X-Title": "Mixin EdTech UZ",
    }


async def process_image_with_text(
    prompt: str,
    data_url: str,
    mime_type: str,
    student_context: Optional[Dict] = None,
) -> str:
    """
    Принимает фото в виде data: URL и текстовый prompt; возвращает текстовый
    ответ модели на языке пользователя.

    student_context зарезервирован для будущих параметров (возраст и т.п.).
    """
    del student_context  # accepted for signature parity

    if not _OPENROUTER_API_KEY:
        return "AI-сервис для анализа фото пока не настроен. Добавьте OPENROUTER_API_KEY в .env."

    if (
        not data_url.startswith("data:image/")
        or mime_type.lower() not in _SUPPORTED_IMAGE_MIME_TYPES
    ):
        return "Не получилось прочитать фото. Поддерживаются JPG, PNG, WEBP, GIF, HEIC и HEIF."

    text_prompt = prompt.strip() or "Проанализируй фото и помоги ученику с заданием."
    messages = [
        {
            "role": "system",
            "content": (
                "Ты Mixin Nano, AI-наставник для школьников Узбекистана. "
                "Проанализируй изображение: если это задача, реши пошагово; "
                "если это текст, объясни содержание; если это схема, разберись в ней. "
                "Отвечай на языке пользователя, понятно и без упоминания названия внешней модели."
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
                f"{_OPENROUTER_BASE_URL}/chat/completions",
                headers=_headers(),
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
            return str(reply).strip() or "Не получилось получить ответ по фото."
    except Exception as exc:
        return (
            "Я получил фото, но vision-модель сейчас не ответила. "
            f"Попробуй отправить фото ещё раз или опиши задание текстом. Ошибка: {exc}"
        )
