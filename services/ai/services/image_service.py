"""
Image Generation Service — генерация изображений через OpenRouter.

OpenRouter поддерживает image-output через Chat Completions API с
параметром modalities: ["image", "text"]. Default model is documented in
`services/ai/config.py` (`IMAGE_MODEL`), and is the canonical source of
truth for image-model selection.
"""

import logging
import httpx
from typing import Optional

from config import IMAGE_MODEL
from .openrouter import (
    CHAT_COMPLETIONS_URL,
    headers as openrouter_headers,
    is_configured as openrouter_is_configured,
)

logger = logging.getLogger("image_service")
logging.basicConfig(level=logging.INFO)


class GeneratedImage:
    def __init__(self, data_url: str, prompt: str, model: str) -> None:
        self.data_url = data_url
        self.prompt = prompt
        self.model = model

    def to_dict(self) -> dict:
        return {"dataUrl": self.data_url, "prompt": self.prompt, "model": self.model}


def _refine_prompt(prompt: str, student_age: Optional[int]) -> str:
    age_hint = (
        f" Student is {student_age} years old, illustration must be age-appropriate."
        if student_age
        else ""
    )
    return (
        f"Educational illustration for a school textbook: {prompt}. "
        f"Clean, clear, labeled diagram or realistic but simplified visual. "
        f"White background, professional style, no text overlays in random language."
        f"{age_hint}"
    )


async def generate_image(
    prompt: str,
    student_age: Optional[int] = None,
) -> GeneratedImage:
    """
    Генерирует изображение и возвращает data: URL (base64).
    При ошибке поднимает RuntimeError с понятным текстом для пользователя.
    """
    if not openrouter_is_configured():
        raise RuntimeError("OPENROUTER_API_KEY не настроен")
    if not prompt or not prompt.strip():
        raise ValueError("Пустой prompt")

    refined = _refine_prompt(prompt.strip()[:500], student_age)
    logger.info("Generating image with model=%s prompt=%r", IMAGE_MODEL, refined[:120])

    payload = {
        "model": IMAGE_MODEL,
        "messages": [{"role": "user", "content": refined}],
        "modalities": ["image", "text"],
        "stream": False,
    }

    try:
        timeout = httpx.Timeout(75.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                CHAT_COMPLETIONS_URL,
                json=payload,
                headers=openrouter_headers(),
            )
    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "Генерация изображения занимает слишком много времени. "
            "Попробуйте ещё раз или выберите более быструю image-модель."
        ) from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"Сеть недоступна: {exc}") from exc

    # 429 — rate-limit. Выкидываем понятное сообщение.
    if response.status_code == 429:
        raise RuntimeError("Image model rate-limited. Try again later.")

    if response.status_code >= 400:
        body_text = response.text[:1000]
        logger.error(
            "OpenRouter error: status=%s body=%s", response.status_code, body_text
        )
        try:
            err_json = response.json()
            err = err_json.get("error", {})
            msg = err.get("message") or body_text
        except Exception:
            msg = body_text

        # Частые причины — модель не существует, не поддерживает image, нет credits
        if response.status_code == 404 or "not found" in msg.lower():
            raise RuntimeError(
                f"Модель '{IMAGE_MODEL}' не найдена на OpenRouter. "
                f"Проверьте конфигурацию image-модели в .env."
            )
        if "credit" in msg.lower() or "balance" in msg.lower():
            raise RuntimeError(f"Нет кредитов на OpenRouter: {msg}")
        if response.status_code == 402:
            raise RuntimeError(f"Платная модель без credits: {msg}")
        raise RuntimeError(f"OpenRouter {response.status_code}: {msg}")

    data = response.json()
    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message", {})

    # Вариант 1: message.images[]  (стандарт OpenRouter)
    images = message.get("images") or []
    if images and isinstance(images, list):
        first = images[0]
        if isinstance(first, dict):
            url = (
                first.get("image_url", {}).get("url")
                if isinstance(first.get("image_url"), dict)
                else first.get("url")
            )
            if url:
                logger.info("Image generated successfully (images[] format)")
                return GeneratedImage(url, refined, IMAGE_MODEL)

    # Вариант 2: message.content
    content = message.get("content")
    if isinstance(content, str) and content.startswith("data:image"):
        return GeneratedImage(content, refined, IMAGE_MODEL)
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "image_url":
                    url = part.get("image_url", {}).get("url")
                    if url:
                        return GeneratedImage(url, refined, IMAGE_MODEL)
                if part.get("type") == "image":
                    b64 = part.get("data") or part.get("image", {}).get("data")
                    mime = part.get("mime_type", "image/png")
                    if b64:
                        return GeneratedImage(
                            f"data:{mime};base64,{b64}", refined, IMAGE_MODEL
                        )

    # Если дошли сюда — модель ответила, но не вернула картинку.
    logger.error(
        "No image in response. message keys=%s, content_preview=%r",
        list(message.keys()),
        (str(content)[:200] if content else None),
    )
    raise RuntimeError(
        f"Модель '{IMAGE_MODEL}' не вернула изображение. "
        f"Возможно, она не поддерживает modalities=image. "
        f"Попробуйте другую поддерживаемую image-модель."
    )
