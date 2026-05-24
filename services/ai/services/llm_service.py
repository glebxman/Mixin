"""
AI-сервис: обёртка над OpenRouter (OpenAI-совместимый API).
Поддерживает retry при 429 и fallback на альтернативную модель.

Структура:
  - _models_to_try: упорядоченный список моделей (primary + fallbacks).
  - _post_with_retry: единая retry-логика (используется и в chat, и в stream).
  - chat / stream_chat: тонкие обёртки над общей логикой.
  - _generate_visualization: отдельный путь для image-моделей.
"""

import os
import asyncio
import json
import re
from collections.abc import AsyncIterator
import httpx

from config import IMAGE_MODEL
from .openrouter import (
    CHAT_COMPLETIONS_URL,
    OPENROUTER_API_KEY,
    headers as openrouter_headers,
    is_configured as openrouter_is_configured,
)

AI_IMAGE_GENERATION_ENABLED = os.getenv("AI_IMAGE_GENERATION_ENABLED", "true").lower() == "true"
AI_IMAGE_MAX_DATA_URL_LEN = int(os.getenv("AI_IMAGE_MAX_DATA_URL_LEN", "2500000"))
VISUALIZATION_MARKER_RE = re.compile(r"<!--\s*VISUALIZE_IMAGE\s*-->", re.IGNORECASE)

PRIMARY_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-4-maverick")
FALLBACK_MODELS = [
    "minimax/minimax-m2.5:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v4-flash:free"
]

MAX_RETRIES = 1
BASE_RETRY_DELAY = 5
HTTP_TIMEOUT_SECONDS = 90.0

DEFAULT_SYSTEM_PROMPT = """
You are Mixin Nano, an AI model made by Mixin.
If the user asks who you are, what model you are, or who created you, answer clearly:
"I am Mixin Nano, an AI model by Mixin."
Never identify yourself as Gemini, Claude, ChatGPT, OpenAI, Google, Anthropic, LLaMA, Meta or
a model from any other company.

You are a friendly AI tutor for school students in Uzbekistan.
Always reply in the same language the student writes in (Russian, Uzbek, or English).
Explain things clearly and step by step, with concrete examples.
Use LaTeX for math: $...$ for inline, $$...$$ for display equations.
""".strip()


# ─── Helpers ─────────────────────────────────────────────────────────────


def _as_text(value: object) -> str:
    return value if isinstance(value, str) else ""


def _extract_user_message(message: str | None) -> str:
    message = _as_text(message)
    marker_en = "Student message:\n"
    marker_ru = "Сообщение ученика:\n"
    for marker in (marker_en, marker_ru):
        if marker in message:
            return message.rsplit(marker, 1)[-1].strip()
    return message.strip()


def _build_messages(
    system_prompt: str | None,
    history: list[dict[str, str]] | None,
    message: str,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt or DEFAULT_SYSTEM_PROMPT}
    ]
    for item in (history or [])[-24:]:
        role = item.get("role", "")
        content = _as_text(item.get("content")).strip()
        if not content:
            continue
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": _as_text(message)})
    return messages


def _extract_visualization_decision(reply: str | None) -> tuple[str, bool]:
    reply = _as_text(reply)
    should_generate = bool(VISUALIZATION_MARKER_RE.search(reply))
    clean_reply = VISUALIZATION_MARKER_RE.sub("", reply).strip()
    return clean_reply, should_generate


def _headers() -> dict[str, str]:
    """Backward-compat shim; new code should import from openrouter directly."""
    return openrouter_headers()


def _models_to_try(model: str | None = None) -> list[str]:
    models: list[str] = []
    seen: set[str] = set()
    for candidate in [model or PRIMARY_MODEL, *FALLBACK_MODELS]:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        models.append(candidate)
    return models


def _parse_retry_after(response: httpx.Response) -> float:
    """Извлекает Retry-After из header или body."""
    header_val = response.headers.get("retry-after", "")
    if header_val:
        try:
            return float(header_val)
        except ValueError:
            pass

    try:
        body = response.json()
        metadata = body.get("error", {}).get("metadata", {})
        raw = metadata.get("retry_after_seconds_raw")
        if raw:
            return float(raw)
    except Exception:
        pass

    return BASE_RETRY_DELAY


# ─── Single retry pipeline ───────────────────────────────────────────────


async def _call_one_model(
    messages: list[dict[str, str]],
    *,
    model: str,
    stream: bool,
    extra_payload: dict | None = None,
) -> httpx.Response:
    """
    POST /chat/completions для одной конкретной модели с retry при 429.
    Поднимает последнее исключение, если все попытки провалились.

    При stream=True возвращает streaming-ответ; caller обязан вызвать .aclose().
    """
    payload: dict = {
        "model": model,
        "messages": messages,
        "max_tokens": 2048,
        "temperature": 0.7,
        "stream": stream,
    }
    if extra_payload:
        payload.update(extra_payload)

    last_exc: Exception | None = None
    client = httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS)
    try:
        for attempt in range(MAX_RETRIES):
            try:
                if stream:
                    request = client.build_request(
                        "POST",
                        CHAT_COMPLETIONS_URL,
                        json=payload,
                        headers=_headers(),
                    )
                    response = await client.send(request, stream=True)
                else:
                    response = await client.post(
                        CHAT_COMPLETIONS_URL,
                        json=payload,
                        headers=_headers(),
                    )

                if response.status_code == 429:
                    if stream:
                        await response.aclose()
                    wait = max(_parse_retry_after(response), BASE_RETRY_DELAY * (attempt + 1))
                    if attempt < MAX_RETRIES - 1:
                        print(
                            f"[ai] 429 from {model}, retry in {wait}s "
                            f"(attempt {attempt + 1}/{MAX_RETRIES})"
                        )
                        await asyncio.sleep(wait)
                        continue
                    last_exc = httpx.HTTPStatusError(
                        f"429 after {MAX_RETRIES} retries", request=None, response=response
                    )
                    break

                if not stream:
                    response.raise_for_status()
                return response

            except httpx.HTTPStatusError as exc:
                last_exc = exc
                break
            except Exception as exc:
                last_exc = exc
                break

        # Все попытки провалились для этой модели
        if not client.is_closed:
            await client.aclose()
        raise last_exc or RuntimeError(f"All retries exhausted for {model}")
    except Exception:
        if not client.is_closed:
            await client.aclose()
        raise


async def _post_with_retry(
    messages: list[dict[str, str]],
    *,
    stream: bool,
    model: str | None = None,
    extra_payload: dict | None = None,
) -> httpx.Response:
    """
    Совместимость со старым API: перебирает модели из _models_to_try
    и возвращает первый успешный non-streaming ответ. Используется только
    для visualization payload и stream_chat (chat() имеет свою логику).
    """
    models_to_try = _models_to_try(model)
    last_exc: Exception | None = None
    for current_model in models_to_try:
        try:
            return await _call_one_model(
                messages, model=current_model, stream=stream, extra_payload=extra_payload
            )
        except Exception as exc:
            last_exc = exc
            print(f"[ai] {current_model} failed: {exc}; trying next fallback...")
            continue
    raise last_exc or RuntimeError("All models rate-limited or unavailable")


# ─── Visualization (image) ───────────────────────────────────────────────


def _can_generate_visualization(message: str | None, reply: str | None) -> bool:
    if not AI_IMAGE_GENERATION_ENABLED or not OPENROUTER_API_KEY:
        return False
    message = _as_text(message)
    reply = _as_text(reply)
    if not message.strip() or not reply.strip():
        return False
    if "<!--quest:" in reply.lower():
        return False
    return True


def _build_visualization_prompt(message: str, reply: str) -> str:
    return (
        "Create a single educational visualization for a school student. "
        "Style: clean, modern educational illustration, simple diagram, large clear elements, "
        "readable labels in the same language as the student's question, no logos, no personal data, "
        "no realistic faces. The image must help understand the topic, not be decorative.\n\n"
        f"Student question:\n{message[:1000]}\n\n"
        f"Tutor answer summary:\n{reply[:1200]}"
    )


def _extract_generated_images(data: dict) -> list[dict[str, str]]:
    choice = data.get("choices", [{}])[0]
    message = choice.get("message", {})
    result: list[dict[str, str]] = []
    for index, item in enumerate(message.get("images") or []):
        image_url = item.get("image_url") or item.get("imageUrl") or {}
        url = image_url.get("url") if isinstance(image_url, dict) else None
        if not isinstance(url, str):
            continue
        if not url.startswith("data:image/") and not url.startswith("https://"):
            continue
        if len(url) > AI_IMAGE_MAX_DATA_URL_LEN:
            continue
        result.append({
            "url": url,
            "alt": f"Educational visualization {index + 1}",
        })
    return result[:1]


async def _generate_visualization(message: str, reply: str) -> list[dict[str, str]]:
    if not _can_generate_visualization(message, reply):
        return []

    payload = {
        "model": IMAGE_MODEL,
        "messages": [
            {"role": "user", "content": _build_visualization_prompt(message, reply)}
        ],
        "modalities": ["image", "text"],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = await client.post(
                CHAT_COMPLETIONS_URL,
                json=payload,
                headers=_headers(),
            )
            response.raise_for_status()
            return _extract_generated_images(response.json())
    except Exception as exc:
        print(f"[ai-image] visualization generation skipped: {exc}")
        return []


def should_generate_visualization(message: str, reply: str) -> bool:
    clean_reply, should_generate = _extract_visualization_decision(reply)
    return should_generate and _can_generate_visualization(
        _extract_user_message(message),
        clean_reply,
    )


async def generate_visualization(message: str, reply: str) -> list[dict[str, str]]:
    return await _generate_visualization(_extract_user_message(message), reply)


# ─── Public API: chat & stream_chat ──────────────────────────────────────


def _extract_chat_text(data: dict) -> tuple[str, int]:
    """Достаёт текст и tokens_used из non-streaming chat completion response."""
    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message", {}) or {}
    reply = _as_text(message.get("content")).strip()
    usage = data.get("usage") or {}
    completion_tokens = usage.get("completion_tokens")
    if isinstance(completion_tokens, int) and completion_tokens > 0:
        tokens_used = completion_tokens
    else:
        tokens_used = max(5, int(len(reply) / 3.5))
    return reply, tokens_used


async def chat(
    student_id: str,
    message: str,
    system_prompt: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> dict:
    """
    Отправляет сообщение и возвращает ответ (non-streaming).

    Перебирает модели из _models_to_try при:
      - HTTP 429 (rate limit)
      - любой ошибке HTTP / сетевом сбое
      - 200 OK с пустым content (бесплатные модели OpenRouter иногда так делают)
    """
    if not OPENROUTER_API_KEY:
        return {
            "reply": "Ключ AI-сервиса не настроен. Добавьте OPENROUTER_API_KEY в .env.",
            "tokens_used": 0,
            "images": [],
            "should_generate_image": False,
        }

    messages = _build_messages(system_prompt, history, message)
    models_to_try = _models_to_try()

    last_error: str | None = None
    for current_model in models_to_try:
        try:
            response = await _call_one_model(messages, model=current_model, stream=False)
            data = response.json()
        except Exception as exc:
            last_error = f"{current_model}: {exc}"
            print(f"[ai] {current_model} failed: {exc}; trying next fallback...")
            continue

        reply, tokens_used = _extract_chat_text(data)
        if not reply:
            last_error = f"{current_model}: empty content"
            print(f"[ai] {current_model} returned empty content; trying next fallback...")
            continue

        clean_reply, wants_visualization = _extract_visualization_decision(reply)
        return {
            "reply": clean_reply or reply,
            "tokens_used": tokens_used,
            "images": [],
            "should_generate_image": wants_visualization
            and _can_generate_visualization(
                _extract_user_message(message),
                clean_reply or reply,
            ),
        }

    print(f"[ai] all models exhausted; last error: {last_error}")
    return {
        "reply": "Все модели сейчас перегружены или недоступны. Попробуйте через минуту.",
        "tokens_used": 0,
        "images": [],
        "should_generate_image": False,
    }


async def stream_chat(
    student_id: str,
    message: str,
    system_prompt: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> AsyncIterator[str]:
    """Stream-версия через SSE: yield-ит контент-чанки. При ошибках — yield сообщения."""
    if not OPENROUTER_API_KEY:
        yield "Ключ AI-сервиса не настроен."
        return

    messages = _build_messages(system_prompt, history, message)

    try:
        response = await _post_with_retry(messages, stream=True)
    except httpx.HTTPStatusError as exc:
        yield f"\nОшибка: HTTP {exc.response.status_code}"
        return
    except Exception as exc:
        yield f"\nОшибка стриминга: {exc}"
        return

    try:
        async for line in response.aiter_lines():
            if not line.startswith("data: "):
                continue
            data_str = line[6:]
            if data_str.strip() == "[DONE]":
                return
            try:
                chunk = json.loads(data_str)
                delta = chunk.get("choices", [{}])[0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    yield content
            except (json.JSONDecodeError, IndexError, KeyError):
                continue
    finally:
        await response.aclose()
