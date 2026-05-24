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

═══ INTERACTIVE QUESTS ═══

When you determine that the student has successfully understood the current topic (usually after 3-5 exchanges and a successful comprehension/quick check), or if the student asks for a practice task/game, you MUST launch an interactive logic quest by embedding a special JSON code block in your message. 

⚠️ CRITICAL RULES FOR QUESTS:
- When the student says anything like "начни квест", "давай квест", "хочу задание", "дай задачу",
  "квест", "quest", "game", "задание", "практика", "kvest", "vazifa" — you MUST IMMEDIATELY
  output a ```quest JSON block. Do NOT describe the quest in plain text. Do NOT ask "what kind of quest".
  Just pick the appropriate type and output the structured block.
- NEVER write a text-based quest (like "Задание 1: На столе лежат карточки..."). This is WRONG.
  The ONLY correct way to give a quest is via the ```quest code block.
- If you write a quest as plain text, the interactive UI will NOT appear and the student
  will not be able to solve it interactively. This is a bug from the student's perspective.
- Write 1-2 sentences of friendly introduction BEFORE the ```quest block, then the block itself.

Choose the type based on the student's level or path:
1. MATCHSTICK PUZZLE:
   Use this for general logic, arithmetic, or younger students. You must invent a new variation of a matchstick equation that is incorrect, and the student needs to move 1 matchstick to make it correct.
   Format:
   ```quest
   {
     "type": "matchstick",
     "task": "Переложите одну спичку так, чтобы равенство стало верным.",
     "equation": "5 - 3 = 8",
     "solution": "5 + 3 = 8",
     "explanation": "Переместите вертикальную спичку из восьмерки в знак минус, чтобы сделать его плюсом.",
     "hint": "Посмотрите на знак минус и на цифру восемь."
   }
   ```
   Note: Available equations can be: "5-3=8" -> "5+3=8", "6+4=4" -> "0+4=4", "5+3=9" -> "5+3=8", "3+5=8" (correct), etc. Ensure the starting equation is mathematically incorrect, but can be made correct by moving exactly one matchstick.

2. SCRATCH BLOCKS CODING:
   Use this if the student is learning programming/IT/computer science. You must define a grid (e.g. 4x4 or 3x3) where a robot 'R' needs to reach a target star 'S'. The grid can have empty spaces 'E' and obstacles 'X'.
   Format:
   ```quest
   {
     "type": "scratch",
     "task": "Помоги роботу дойти до финиша (звездочки). Составь правильный алгоритм.",
     "grid": [
       ["E", "E", "E", "E"],
       ["E", "X", "S", "E"],
       ["E", "R", "E", "E"],
       ["E", "E", "E", "E"]
     ],
     "robotPos": [2, 1],
     "robotDirection": "right",
     "targetPos": [1, 2],
     "hint": "Поверни налево и сделай 1 шаг вперед, затем поверни направо и сделай 1 шаг вперед.",
     "solution": ["turn_left", "move", "turn_right", "move"],
     "explanation": "Робот поворачивает налево (вверх), делает шаг на (1,1), затем поворачивает направо (вправо) и делает шаг на (1,2) к звездочке."
   }
   ```
   Note: The robot direction can be "up", "down", "left", or "right". The solution commands can only be: "move", "turn_left", "turn_right". The path must be clear of obstacles ('X').

You must write a friendly introduction before the quest block, encouraging the student to complete it, and set "quest_ready": true in the MIXIN_META block.

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
- quest_ready: true ONLY after 3-5 successful exchanges with passed quick_checks or when launching the quest block.
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


_QUEST_REQUEST_PATTERNS = re.compile(
    r"(квест|задани[ея]|задач[уа]|практик|игр[уа]|quest|game|vazifa|topshiriq|"
    r"начни квест|давай квест|хочу квест|запусти квест|дай задач|дай квест|"
    r"kvest|boshlash|oʻyin)",
    re.IGNORECASE,
)

_QUEST_FORCE_ADDENDUM = """

⚠️ IMPORTANT OVERRIDE: The student is asking for an interactive quest.
You MUST output a ```quest JSON code block (either "matchstick" or "scratch" type).
Do NOT describe the quest in plain text. The frontend renders the interactive UI
ONLY from the ```quest block. If you write it as text, the student cannot interact with it.
Output 1-2 friendly sentences, then the ```quest block with valid JSON, then the MIXIN_META block.
"""


import random as _random


def _generate_quest_block(grade: int | None) -> str:
    """Sync wrapper — not used in async context, kept for compatibility."""
    return _generate_quest_fallback(grade)


async def _generate_quest_async(grade: int | None) -> str:
    """Async version: call LLM to generate a unique quest."""
    # 50/50 chance for matchstick vs scratch, regardless of grade
    quest_type = _random.choice(["matchstick", "scratch"])

    prompt = _build_quest_generation_prompt(quest_type, grade)

    try:
        raw = await llm_chat(
            student_id="quest-generator",
            message=prompt,
            system_prompt="You are a JSON generator. Output ONLY valid JSON, no markdown, no explanation, no extra text.",
            history=None,
        )
        reply = _as_text(raw.get("reply")).strip()
        quest_json = _extract_json(reply)
        if quest_json and _validate_quest(quest_json, quest_type):
            return "```quest\n" + json.dumps(quest_json, ensure_ascii=False, indent=2) + "\n```"
    except Exception:
        pass

    return _generate_quest_fallback(grade)


def _build_quest_generation_prompt(quest_type: str, grade: int | None) -> str:
    grade_hint = f"for a {grade}th grade student" if grade else "for a school student"

    if quest_type == "matchstick":
        return f"""Generate a unique matchstick puzzle {grade_hint}.
Rules:
- The equation must use single digits (0-9) and one operator (+ or -)
- The starting equation MUST be mathematically INCORRECT
- Moving exactly 1 matchstick must make it correct
- The solution must be a valid equation

Return ONLY this JSON (no markdown, no extra text):
{{
  "type": "matchstick",
  "task": "Переложите одну спичку так, чтобы равенство стало верным.",
  "equation": "<WRONG equation like 5 - 3 = 8>",
  "solution": "<CORRECT equation like 5 + 3 = 8>",
  "explanation": "<How to fix it in Russian>",
  "hint": "<A short hint in Russian>"
}}

Examples of valid puzzles:
- "6 + 4 = 4" → "0 + 4 = 4" (remove stick from 6 to make 0)
- "5 - 3 = 8" → "5 + 3 = 8" (move stick to turn minus into plus)
- "8 - 6 = 1" → "8 - 7 = 1" (move stick from 6 to make 7)

Invent a NEW one different from these examples."""

    else:  # scratch
        size = 3 if (isinstance(grade, int) and grade <= 6) else _random.choice([3, 4])
        steps = _random.randint(2, 4) if size == 3 else _random.randint(3, 5)
        return f"""Generate a unique robot navigation puzzle {grade_hint} on a {size}x{size} grid.
Rules:
- Grid cells: "E" (empty), "X" (obstacle), "R" (robot start), "S" (star/target)
- Exactly one "R" and one "S" on the grid
- Robot commands: "move" (forward), "turn_left", "turn_right"
- The path from R to S must be solvable and avoid X cells
- Solution should be {steps} commands long
- robotDirection: one of "up", "down", "left", "right"
- robotPos and targetPos are [row, col] zero-indexed

Return ONLY this JSON (no markdown, no extra text):
{{
  "type": "scratch",
  "task": "Помоги роботу дойти до звёздочки! Составь алгоритм из команд.",
  "grid": [["E","E","E"],["R","X","E"],["E","E","S"]],
  "robotPos": [1, 0],
  "robotDirection": "right",
  "targetPos": [2, 2],
  "hint": "<A short hint in Russian>",
  "solution": ["move", "turn_right", "move", "move"],
  "explanation": "<Step by step explanation in Russian>"
}}

Make the puzzle interesting but solvable in exactly {steps} moves. Ensure the solution is correct."""


def _extract_json(text: str) -> dict | None:
    """Try to extract a JSON object from LLM response."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    return None


def _validate_quest(data: dict, quest_type: str) -> bool:
    """Basic validation that the quest JSON has required fields."""
    if not isinstance(data, dict):
        return False
    if data.get("type") != quest_type:
        return False

    if quest_type == "matchstick":
        return all(k in data for k in ("equation", "solution", "hint"))
    else:
        return all(k in data for k in ("grid", "robotPos", "targetPos", "solution"))


def _generate_quest_fallback(grade: int | None) -> str:
    """Simple fallback quest if LLM generation fails."""
    quests = [
        {"type": "matchstick", "task": "Переложите одну спичку так, чтобы равенство стало верным.", "equation": "5 - 3 = 8", "solution": "5 + 3 = 8", "explanation": "Переместите спичку из минуса, чтобы сделать плюс.", "hint": "Посмотрите на знак между числами."},
        {"type": "matchstick", "task": "Переложите одну спичку так, чтобы равенство стало верным.", "equation": "6 + 4 = 4", "solution": "0 + 4 = 4", "explanation": "Уберите спичку из 6, чтобы получить 0.", "hint": "Какая цифра похожа на 6 без одной палочки?"},
        {"type": "matchstick", "task": "Переложите одну спичку так, чтобы равенство стало верным.", "equation": "9 - 5 = 5", "solution": "9 - 4 = 5", "explanation": "Переместите спичку из 5, чтобы получить 4.", "hint": "5 и 4 отличаются одной спичкой."},
    ]
    quest = _random.choice(quests)
    return "```quest\n" + json.dumps(quest, ensure_ascii=False, indent=2) + "\n```"


def _is_quest_request(message: str) -> bool:
    """Check if the student's message is asking for a quest/game/task."""
    return bool(_QUEST_REQUEST_PATTERNS.search(message))


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

    # If the student asked for a quest but the AI didn't produce a ```quest block,
    # inject a server-generated quest directly. Don't rely on AI formatting.
    if _is_quest_request(message) and "```quest" not in reply_raw:
        quest_block = await _generate_quest_async(grade)
        # Keep AI's intro text (first paragraph) but replace the rest with the quest
        intro = reply_raw.split("\n\n")[0] if reply_raw.strip() else ""
        if not intro or len(intro) < 10:
            name = student_first_name.strip().split()[0] if student_first_name and student_first_name.strip() else ""
            greeting = f"Привет{', ' + name if name else ''}! " if name else ""
            intro = f"{greeting}Давай проверим твои навыки! 🧩"
        reply_raw = f"{intro}\n\n{quest_block}\n\n<MIXIN_META>\n{{\"topic\": \"quest-game\", \"confidence_delta\": 0, \"quick_check_passed\": null, \"asked_quick_check\": false, \"needs_visual\": false, \"needs_real_image\": false, \"image_prompt\": \"\", \"quest_ready\": true, \"reasoning\": \"student requested a quest, server generated unique quest via LLM\"}}\n</MIXIN_META>"

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
