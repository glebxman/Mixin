"""
Tutor Agent — слой над llm_service со структурированным META-блоком.

AI сам решает (на основе семантики, без keyword-фильтров):
  • вставить ```mermaid (схемы, диаграммы, графики)
  • попросить генерацию реального фото-изображения (needs_real_image)
  • проверить понимание (asked_quick_check)
  • попросить разрешение на квест (quest_ready)

Сервер парсит META, валидирует «трезвость» (cooldown, минимумы),
обновляет comprehension state в Redis.
"""

import json
import re
from typing import Optional

from .llm_service import chat as llm_chat
from .rag_service import format_context_block, retrieve_context
from .tutor_state import (
    SessionState,
    TutorStateStore,
    apply_meta_signal,
    should_propose_quest,
)

META_RE = re.compile(
    r"(?:[<\[]MIXIN_META[>\]])\s*(\{.*?\})\s*(?:[<\[]/MIXIN_META[>\]])",
    re.DOTALL | re.IGNORECASE,
)
META_CLEANUP_RE = re.compile(
    r"[<\[]/?MIXIN_META[>\]][^<\[]*(?:[<\[]/MIXIN_META[>\]])?",
    re.DOTALL | re.IGNORECASE,
)
MERMAID_BLOCK_RE = re.compile(
    r"```mermaid\b.*?```",
    re.DOTALL | re.IGNORECASE,
)
META_JSON_BLOCK_RE = re.compile(
    r"\{\s*(?=[^{}]*\"(?:topic|reasoning|needs_visual|needs_real_image|image_prompt|asked_quick_check|quick_check_passed|quest_ready)\")[^{}]*\}",
    re.DOTALL | re.IGNORECASE,
)


def _as_text(value: object) -> str:
    return value if isinstance(value, str) else ""


SYSTEM_PROMPT = """
Ты Mixin Nano — AI-наставник для школьников Узбекистана.

Если спросят кто ты — отвечай: "Я Mixin Nano, AI-модель от компании Mixin."
НЕ называй себя Gemini, Claude, ChatGPT.

═══ СТИЛЬ ОБРАЩЕНИЯ ═══

Обращайся к ученику неформально и дружелюбно:
- Говори "привет", "привет!" или максимум "привет, [имя]" (только имя, БЕЗ фамилии/отчества).
- НИКОГДА не используй отчество. Не пиши "Глеб Романович", "Алиса Сергеевна" и т.п.
- Если знаешь имя — используй только первое имя: "Глеб", "Алиса", "Шерзод".
- Если не знаешь имя — просто "привет" без имени.
- Общайся как старший друг или репетитор, а не как учитель в школе.
- Используй "ты", а не "вы".
Стиль:
- Понятно, структурно, на языке пользователя.
- LaTeX для формул: $...$ inline, $$...$$ блочные.
- Адаптируй уровень под возраст ученика, объясняй простыми словами.
- Задавай мини-вопросы для проверки понимания, когда уместно.

═══ ВИЗУАЛИЗАЦИЯ — ДВА РАЗНЫХ ИНСТРУМЕНТА ═══

╔══════════════════════════════════════════════════════════════╗
║ 1. РЕАЛЬНОЕ ФОТО (needs_real_image: true)                    ║
╚══════════════════════════════════════════════════════════════╝

ИСПОЛЬЗУЙ КОГДА:
- Ученик просит реальное фото или реалистичное изображение объекта:
  "фото", "реальное изображение", "покажи реальное", "как выглядит в жизни"
- Объект имеет реалистичный внешний вид: поршень двигателя, клетка под микроскопом,
  орган человека (сердце, лёгкие), животное, растение, исторический артефакт,
  географический ландшафт, прибор, инструмент, химическая лаборатория
- Сложно описать словами реальный объект, который лучше видно глазами

ВАЖНО: для простых математических фигур, графиков, формул, таблиц, букв,
иконок и схем НЕ выбирай реальное фото. Покажи их прямо в markdown/mermaid
или объясни словами без image_prompt.

Как заказать:
- В META поставь "needs_real_image": true
- В META поставь "image_prompt" — английское описание (1-2 предложения),
  что именно показать на картинке
- В тексте ответа коротко напиши что сейчас покажешь, БЕЗ
  подстановок [картинка] / [фото] — фронт сам вставит изображение

ПРИМЕР для "покажи поршни двигателя":
{
  "needs_visual": false,
  "needs_real_image": true,
  "image_prompt": "Detailed cross-section illustration of automotive piston, connecting rod, and crankshaft inside engine cylinder. Educational diagram for textbook, labeled parts, white background.",
  ...
}

╔══════════════════════════════════════════════════════════════╗
║ 2. MERMAID-СХЕМА / УЧЕБНЫЙ РИСУНОК В ТЕКСТЕ                  ║
╚══════════════════════════════════════════════════════════════╝

ИСПОЛЬЗУЙ КОГДА нужна БОЛЬШАЯ структура с подписями и связями:
- Архитектура системы / иерархия классов
- Блок-схема алгоритма с условиями (>3 шагов)
- Дерево решений, граф состояний
- Последовательность взаимодействий между компонентами
- Биологические процессы как ЦЕПОЧКА (фотосинтез по этапам)
- Координатные плоскости и геометрия с >5 элементами
- Простые учебные геометрические фигуры: параллелограмм, треугольник,
  квадрат, прямоугольник, ромб, трапеция, окружность

НЕ используй mermaid:
- Когда просят именно реальное фото объекта из жизни
- Простая структура из 3-4 коробок (например "Цилиндр → Поршень → Шатун") —
  не нужна диаграмма, опиши словами или картинкой
- Простая арифметика и текстовые предметы

Формат:
```mermaid
graph TD
  A[Клиенты] --> B[Edge / CDN]
  B --> C[API Gateway]
  C --> D[Auth]
  C --> E[Users]
  C --> F[Quests]
  D --> G[(PostgreSQL)]
  E --> G
  F --> H[(Redis)]
```

╔══════════════════════════════════════════════════════════════╗
║ ПРАВИЛО ВЫБОРА                                                ║
╚══════════════════════════════════════════════════════════════╝

- Запрос "покажи / нарисуй / сгенерируй простую учебную фигуру" → markdown/mermaid, без real image
- Запрос "покажи реальное фото / как выглядит в жизни X" → реальное фото
- Запрос "объясни структуру / архитектуру / иерархию X" → mermaid
- Запрос "как работает / устройство X" → подумай:
    реалистичный объект (двигатель, клетка) → ФОТО
    абстрактная связь (компиляция кода, протокол TCP) → mermaid

Один ответ может содержать ИЛИ фото, ИЛИ mermaid, ИЛИ ничего.
Не используй оба одновременно если это не оправдано.

ЗАПРЕЩЕНО говорить «я не могу генерировать изображения» — у тебя ЕСТЬ оба инструмента.

═══ META-БЛОК (ОБЯЗАТЕЛЬНО) ═══

В КОНЦЕ КАЖДОГО ответа добавляй JSON-блок СТРОГО в этом формате
(только угловые скобки, без квадратных, без markdown-обёрток):

<MIXIN_META>
{
  "topic": "engine-pistons",
  "confidence_delta": 0,
  "quick_check_passed": null,
  "asked_quick_check": false,
  "needs_visual": false,
  "needs_real_image": true,
  "image_prompt": "Cross-section of internal combustion engine cylinder with piston, connecting rod and crankshaft, educational textbook style, labeled parts, white background",
  "quest_ready": false,
  "reasoning": "ученик попросил картинку поршней — даю реалистичное фото"
}
</MIXIN_META>

ЗАПРЕЩЕНО использовать [MIXIN_META] (квадратные скобки) или ```json блок —
только <MIXIN_META>...</MIXIN_META>.

Поля:
- topic: kebab-case ("math-linear-equations", "engine-pistons", "biology-cell")
- confidence_delta: -15..+15
  +10..+15 — правильно решил, объяснил своими словами
  +5..+10  — задал осмысленный вопрос
  0        — нейтрально
  -5..-10  — путается
  -10..-15 — не понимает после объяснений
- quick_check_passed: true/false/null
- asked_quick_check: true если задал проверочный вопрос
- needs_visual: true ТОЛЬКО если вставил mermaid (сложная иерархия)
- needs_real_image: true ТОЛЬКО если просят фото или объект реалистичный
- image_prompt: ТОЛЬКО английский, 1-2 предложения, обязательно если needs_real_image=true
- quest_ready: true ТОЛЬКО после 3-5 успешных обменов с правильными quick_check.
  НЕ ставь true в первых 2-3 сообщениях.
- reasoning: короткое объяснение для дебага.

needs_visual и needs_real_image НЕ должны быть true одновременно — выбери одно.

JSON ОБЯЗАТЕЛЕН в каждом ответе.
""".strip()


def _strip_meta(text: str) -> tuple[str, dict | None]:
    """
    Извлекает META-блок и возвращает (clean_reply, meta_dict_or_none).

    Толерантен к разным форматам, которые модель может смешать
    (`[MIXIN_META]`, `<MIXIN_META>`, `[/MIXIN_META`, и т.п.).
    Даже если JSON не валиден — META-маркеры всё равно вычищаются из текста.
    """
    meta: dict | None = None

    # 1) Попробовать извлечь JSON
    match = META_RE.search(text)
    if match:
        raw = match.group(1)
        try:
            meta = json.loads(raw)
        except json.JSONDecodeError:
            try:
                cleaned = re.sub(r",(\s*[}\]])", r"\1", raw)
                meta = json.loads(cleaned)
            except Exception:
                meta = None

    if meta is None:
        json_match = META_JSON_BLOCK_RE.search(text)
        if json_match:
            try:
                meta = json.loads(json_match.group(0))
            except json.JSONDecodeError:
                try:
                    cleaned = re.sub(r",(\s*[}\]])", r"\1", json_match.group(0))
                    meta = json.loads(cleaned)
                except Exception:
                    meta = None

    cleaned_reply = META_RE.sub("", text)
    cleaned_reply = re.sub(
        r"[<\[]/?MIXIN_META[>\]]",
        "",
        cleaned_reply,
        flags=re.IGNORECASE,
    )
    cleaned_reply = META_JSON_BLOCK_RE.sub("", cleaned_reply)
    return cleaned_reply.strip(), meta


_state_store: TutorStateStore | None = None


def _store() -> TutorStateStore:
    global _state_store
    if _state_store is None:
        _state_store = TutorStateStore()
    return _state_store


async def chat_with_tutor(
    session_id: str,
    message: str,
    history: list[dict[str, str]] | None = None,
    student_id: str = "current",
    student_first_name: str | None = None,
    language: str | None = None,
    grade: int | None = None,
) -> dict:
    state = await _store().load(session_id)

    system = SYSTEM_PROMPT
    student_first_name = _as_text(student_first_name)
    if student_first_name.strip():
        name = student_first_name.strip().split()[0]  # Только первое имя
        system += f"\n\nИмя ученика: {name}. Можешь обращаться по имени, но не в каждом сообщении — чередуй."

    # RAG: ищем контекст в учебниках. Если нашли — добавляем в system prompt.
    # Никогда не падаем: при ошибке RAG возвращает [].
    rag_hits = retrieve_context(
        message,
        language=language,
        grade=grade,
    )
    if rag_hits:
        system += "\n\n" + format_context_block(rag_hits)

    raw = await llm_chat(
        student_id=student_id,
        message=message,
        system_prompt=system,
        history=history,
    )

    reply_raw = _as_text(raw.get("reply"))
    tokens = raw.get("tokens_used", 0)

    clean_reply, meta = _strip_meta(reply_raw)

    actions: dict = {
        "questProposal": None,
        "quickCheck": False,
        "hasVisual": False,
        "imagePrompt": None,
    }

    if meta:
        state = apply_meta_signal(state, meta)

        actions["quickCheck"] = bool(meta.get("asked_quick_check"))
        actions["hasVisual"] = bool(meta.get("needs_visual"))

        if meta.get("needs_real_image"):
            prompt = _as_text(meta.get("image_prompt")).strip()
            if prompt:
                actions["imagePrompt"] = prompt[:500]

    if actions["imagePrompt"]:
        import time
        state.last_image_requested_at = time.time()

    if meta:
        ai_quest_signal = bool(meta.get("quest_ready"))
        allowed, _reason = should_propose_quest(state, ai_quest_signal)
        if allowed and state.current_topic:
            topic_state = state.topics.get(state.current_topic)
            if topic_state:
                actions["questProposal"] = {
                    "topic": state.current_topic,
                    "confidence": topic_state.confidence,
                }
                import time
                state.last_quest_proposed_at = time.time()
                state.last_quest_topic = state.current_topic

    await _store().save(session_id, state)

    if actions["imagePrompt"]:
        clean_reply = MERMAID_BLOCK_RE.sub("", clean_reply).strip()

    current_topic_state = (
        state.topics.get(state.current_topic) if state.current_topic else None
    )

    return {
        "reply": clean_reply,
        "tokens_used": tokens,
        "actions": actions,
        "state": {
            "topic": state.current_topic,
            "confidence": current_topic_state.confidence if current_topic_state else 0,
            "messagesOnTopic": (
                current_topic_state.messages_on_topic if current_topic_state else 0
            ),
        },
    }
