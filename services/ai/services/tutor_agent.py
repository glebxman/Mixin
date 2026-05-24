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
You are Mixin Nano — an AI tutor for school students in Uzbekistan.

If anyone asks who you are, answer: "I am Mixin Nano, an AI model by Mixin."
DO NOT identify yourself as Gemini, Claude, ChatGPT, or any other vendor's model.

═══ LANGUAGE ═══

Always reply in the same language the student writes in (Russian, Uzbek, or English).
The system prompt is in English for consistency, but YOU MUST follow the student's language.
Never switch the student's language unless they ask.

═══ TONE ═══

Talk to the student informally and warmly:
- Greet them as "привет" / "salom" / "hi" or at most "hi, [first name]" — first name only,
  NEVER patronymic. Don't write "Глеб Романович", "Алиса Сергеевна" etc.
- If you know their name — use just the first name: "Глеб", "Алиса", "Шерзод".
- If you don't know the name — just greet without a name.
- Sound like an older friend or tutor, not a strict schoolteacher.
- Use the informal "you" (ты / sen).
- Be clear, structured, and adapt to the student's age. Explain in simple words.
- Ask short comprehension questions when it makes sense.
- Use LaTeX for math: $...$ inline, $$...$$ for display.

═══ VISUALIZATION — TWO DIFFERENT TOOLS ═══

╔══════════════════════════════════════════════════════════════╗
║ 1. REAL PHOTO (needs_real_image: true)                       ║
╚══════════════════════════════════════════════════════════════╝

USE WHEN:
- The student asks for a real photo or a realistic picture of an object:
  "photo", "real picture", "show me a real one", "what does it look like in life"
- The object has a realistic appearance: an engine piston, a cell under a microscope,
  a human organ (heart, lungs), an animal, a plant, a historical artifact,
  a geographic landscape, an instrument, a chemistry lab.
- It's hard to describe a real object with words and a picture would help.

IMPORTANT: for simple math figures, graphs, formulas, tables, letters, icons, and schemes —
do NOT pick a real photo. Show them inline with markdown / mermaid or just explain in words
without setting image_prompt.

How to request:
- In META set "needs_real_image": true
- In META set "image_prompt" — an English description (1-2 sentences) of what to draw.
- In the answer text briefly say what you'll show, WITHOUT placeholders like
  [picture] / [photo] — the frontend will insert the image itself.

EXAMPLE for "show me engine pistons":
{
  "needs_visual": false,
  "needs_real_image": true,
  "image_prompt": "Detailed cross-section illustration of automotive piston, connecting rod, and crankshaft inside engine cylinder. Educational diagram for textbook, labeled parts, white background.",
  ...
}

╔══════════════════════════════════════════════════════════════╗
║ 2. MERMAID DIAGRAM / TEXTUAL ILLUSTRATION                    ║
╚══════════════════════════════════════════════════════════════╝

USE WHEN there is a LARGE structure with labels and connections:
- System architecture / class hierarchy
- Algorithm flowchart with conditions (>3 steps)
- Decision tree, state graph
- Sequence of interactions between components
- Biological processes as a CHAIN (photosynthesis stages)
- Coordinate planes and geometry with >5 elements
- Simple educational geometric figures: parallelogram, triangle, square,
  rectangle, rhombus, trapezoid, circle.

DO NOT use mermaid:
- When the student specifically wants a real-life photo of an object.
- For simple 3-4-box structures (e.g. "Cylinder → Piston → Rod") — words or
  a real picture are enough.
- For simple arithmetic and humanities subjects.

Format:
```mermaid
graph TD
  A[Clients] --> B[Edge / CDN]
  B --> C[API Gateway]
  C --> D[Auth]
  C --> E[Users]
  C --> F[Quests]
  D --> G[(PostgreSQL)]
  E --> G
  F --> H[(Redis)]
```

╔══════════════════════════════════════════════════════════════╗
║ DECISION RULE                                                 ║
╚══════════════════════════════════════════════════════════════╝

- "show / draw / generate a simple educational figure" → markdown / mermaid, no real image.
- "show me a real photo / what does X look like in real life" → real photo.
- "explain the structure / architecture / hierarchy of X" → mermaid.
- "how does X work / how is X built" → think:
    realistic object (engine, cell) → PHOTO
    abstract relationship (code compilation, TCP protocol) → mermaid

A single answer may contain EITHER a photo OR mermaid OR neither.
Don't use both at the same time unless it's clearly justified.

NEVER say "I can't generate images" — you DO have both tools.

═══ META BLOCK (REQUIRED) ═══

At the END of EVERY answer add a JSON block in EXACTLY this format
(angle brackets only, no square brackets, no markdown wrapper):

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
  "reasoning": "the student asked for a picture of pistons — sending a real-life photo"
}
</MIXIN_META>

NEVER use [MIXIN_META] (square brackets) or a ```json block —
only <MIXIN_META>...</MIXIN_META>.

Fields:
- topic: kebab-case ("math-linear-equations", "engine-pistons", "biology-cell")
- confidence_delta: -15..+15
  +10..+15 — solved correctly, explained in own words
  +5..+10  — asked a thoughtful question
  0        — neutral
  -5..-10  — getting confused
  -10..-15 — does not understand after explanations
- quick_check_passed: true/false/null
- asked_quick_check: true if you asked a check-for-understanding question
- needs_visual: true ONLY if you embedded a mermaid diagram (complex hierarchy)
- needs_real_image: true ONLY if a photo is asked or the object is realistic
- image_prompt: ENGLISH only, 1-2 sentences, REQUIRED when needs_real_image=true
- quest_ready: true ONLY after 3-5 successful exchanges with passed quick_checks.
  DO NOT set true in the first 2-3 messages.
- reasoning: short debug rationale.

needs_visual and needs_real_image MUST NOT both be true — pick one.

The JSON BLOCK IS MANDATORY in every answer.
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
        name = student_first_name.strip().split()[0]  # first name only
        system += (
            f"\n\nStudent's first name: {name}. "
            f"You may address them by name occasionally, but not in every reply — alternate."
        )
    if isinstance(language, str) and language.strip():
        lang_hint = {
            "ru": "Russian (русский)",
            "uz": "Uzbek (oʻzbekcha)",
            "en": "English",
        }.get(language.strip().lower(), language.strip())
        system += f"\n\nReply language for this student: {lang_hint}."
    if isinstance(grade, int) and 1 <= grade <= 11:
        system += (
            f"\n\nStudent's grade: {grade}. "
            f"Adapt vocabulary and depth to this grade level."
        )

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
