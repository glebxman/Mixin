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

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
AI_IMAGE_GENERATION_ENABLED = os.getenv("AI_IMAGE_GENERATION_ENABLED", "true").lower() == "true"
AI_IMAGE_MAX_DATA_URL_LEN = int(os.getenv("AI_IMAGE_MAX_DATA_URL_LEN", "2500000"))
VISUALIZATION_MARKER_RE = re.compile(r"<!--\s*VISUALIZE_IMAGE\s*-->", re.IGNORECASE)

PRIMARY_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")
FALLBACK_MODELS = [
    "openrouter/free",
    "minimax/minimax-m2.5:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

MAX_RETRIES = 3
BASE_RETRY_DELAY = 5
HTTP_TIMEOUT_SECONDS = 90.0

DEFAULT_SYSTEM_PROMPT = """
Ты Mixin Nano, AI-модель от компании Mixin.
Если пользователь спрашивает, кто ты, какая ты модель или кто тебя создал, отвечай ясно:
"Я Mixin Nano, AI-модель от компании Mixin."
Не называй себя Gemini, Claude, ChatGPT, OpenAI, Google, Anthropic, LLaMA, Meta или моделью другой компании.
Ты дружелюбный AI-наставник для школьников Узбекистана.
Отвечай понятно, структурно, с примерами и на языке пользователя.
Используй LaTeX для формул: $...$ для inline, $$...$$ для блочных.
""".strip()


# ─── Helpers ─────────────────────────────────────────────────────────────


def _as_text(value: object) -> str:
    return value if isinstance(value, str) else ""


def _extract_user_message(message: str | None) -> str:
    message = _as_text(message)
    marker = "Сообщение ученика:\n"
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
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mixin.uz",
        "X-Title": "Mixin EdTech UZ",
    }


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


async def _post_with_retry(
    messages: list[dict[str, str]],
    *,
    stream: bool,
    model: str | None = None,
    extra_payload: dict | None = None,
) -> httpx.Response:
    """
    Единая retry-логика для chat completions:
      - перебирает модели из _models_to_try,
      - для каждой делает до MAX_RETRIES попыток при 429,
      - при stream=True возвращает streaming-ответ (caller отвечает за close()).

    Поднимает последнюю ошибку, если все попытки провалились.
    """
    models_to_try = _models_to_try(model)
    last_exc: Exception | None = None
    client = httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS)

    try:
        for model_index, current_model in enumerate(models_to_try):
            payload: dict = {
                "model": current_model,
                "messages": messages,
                "max_tokens": 2048,
                "temperature": 0.7,
                "stream": stream,
            }
            if extra_payload:
                payload.update(extra_payload)

            for attempt in range(MAX_RETRIES):
                try:
                    if stream:
                        request = client.build_request(
                            "POST",
                            f"{OPENROUTER_BASE_URL}/chat/completions",
                            json=payload,
                            headers=_headers(),
                        )
                        response = await client.send(request, stream=True)
                    else:
                        response = await client.post(
                            f"{OPENROUTER_BASE_URL}/chat/completions",
                            json=payload,
                            headers=_headers(),
                        )

                    if response.status_code == 429:
                        if stream:
                            await response.aclose()
                        if model_index < len(models_to_try) - 1:
                            print(f"[ai] 429 from {current_model}, trying next fallback...")
                            break
                        wait = max(_parse_retry_after(response), BASE_RETRY_DELAY * (attempt + 1))
                        print(
                            f"[ai] 429 from {current_model}, retry in {wait}s "
                            f"(attempt {attempt + 1}/{MAX_RETRIES})"
                        )
                        await asyncio.sleep(wait)
                        continue

                    if not stream:
                        response.raise_for_status()
                    return response

                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code == 429:
                        if model_index < len(models_to_try) - 1:
                            break
                        wait = max(
                            _parse_retry_after(exc.response),
                            BASE_RETRY_DELAY * (attempt + 1),
                        )
                        await asyncio.sleep(wait)
                        continue
                    last_exc = exc
                    break
                except Exception as exc:
                    last_exc = exc
                    break

        # Все модели исчерпаны — пробрасываем
        if not stream:
            await client.aclose()
        else:
            await client.aclose()
        raise last_exc or RuntimeError("All models rate-limited or unavailable")
    except Exception:
        if not client.is_closed:
            await client.aclose()
        raise


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
        "Создай одну учебную визуализацию для школьника. "
        "Стиль: чистая современная образовательная иллюстрация, простая схема, крупные элементы, "
        "понятные подписи на русском языке, без логотипов, без персональных данных, без реалистичных лиц. "
        "Картинка должна помогать понять тему, а не быть декоративной.\n\n"
        f"Запрос ученика:\n{message[:1000]}\n\n"
        f"Краткое содержание ответа наставника:\n{reply[:1200]}"
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
            "alt": f"Учебная визуализация {index + 1}",
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
                f"{OPENROUTER_BASE_URL}/chat/completions",
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


async def chat(
    student_id: str,
    message: str,
    system_prompt: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> dict:
    """Отправляет сообщение и возвращает ответ (non-streaming)."""
    if not OPENROUTER_API_KEY:
        return {
            "reply": "Ключ AI-сервиса не настроен. Добавьте OPENROUTER_API_KEY в .env.",
            "tokens_used": 0,
        }

    messages = _build_messages(system_prompt, history, message)

    try:
        response = await _post_with_retry(messages, stream=False)
        data = response.json()

        choice = data.get("choices", [{}])[0]
        reply = _as_text(choice.get("message", {}).get("content"))
        clean_reply = reply.strip() or "Пустой ответ от модели."
        clean_reply, wants_visualization = _extract_visualization_decision(clean_reply)

        usage = data.get("usage", {})
        completion_tokens = usage.get("completion_tokens")
        if isinstance(completion_tokens, int) and completion_tokens > 0:
            tokens_used = completion_tokens
        else:
            tokens_used = max(5, int(len(clean_reply) / 3.5))

        return {
            "reply": clean_reply,
            "tokens_used": tokens_used,
            "images": [],
            "should_generate_image": wants_visualization
            and _can_generate_visualization(
                _extract_user_message(message),
                clean_reply,
            ),
        }

    except Exception as exc:
        return {
            "reply": f"Не удалось получить ответ от Mixin Nano. Ошибка: {exc}",
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
