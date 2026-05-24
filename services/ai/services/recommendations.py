"""
Personalized recommendations service for students.

Reuses the shared LLM client (`llm_service.chat`) so retry/fallback,
empty-content handling, and the OpenRouter model fleet are managed in one
place. JSON extraction is shared via `utils.json_extract`.
"""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

from .llm_service import chat as llm_chat
from utils.json_extract import extract_json_array, extract_json_object


def _call_llm_sync(prompt: str) -> str:
    """Run the async chat helper from sync code (this service is sync)."""
    try:
        result = asyncio.run(
            llm_chat(student_id="recommendations", message=prompt, system_prompt=None)
        )
    except RuntimeError:
        # Fallback for when called from inside an active event loop
        # (very rare here, but keeps this helper safe).
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                llm_chat(student_id="recommendations", message=prompt, system_prompt=None)
            )
        finally:
            loop.close()
    reply = result.get("reply") if isinstance(result, dict) else None
    return reply if isinstance(reply, str) else ""


class RecommendationService:
    """Recommendation service driven by the student profile."""

    def get_personalized_topics(
        self, student_profile: Dict, limit: int = 5
    ) -> List[Dict]:
        grade = student_profile.get("grade", 9)
        interests = student_profile.get("interests", [])
        favorite_subjects = student_profile.get("favoriteSubjects", [])
        career_direction = student_profile.get("careerDirection", "")

        prompt = f"""
Ты — образовательный AI для школьников Узбекистана.

Профиль:
- Класс: {grade}
- Интересы: {', '.join(interests) if interests else 'не указаны'}
- Любимые предметы: {', '.join(favorite_subjects) if favorite_subjects else 'не указаны'}
- Направление: {career_direction if career_direction else 'не определено'}

Порекомендуй {limit} тем. Формат JSON:
[{{"subject":"","topic":"","reason":"","difficulty":"easy/medium/hard","priority":1-5}}]

Верни ТОЛЬКО JSON массив.
"""
        text = _call_llm_sync(prompt)
        result = extract_json_array(text)
        if result:
            return result[:limit]

        return [
            {
                "subject": "математика",
                "topic": "Повторение основ",
                "reason": "Укрепление базы",
                "difficulty": "medium",
                "priority": 3,
            },
            {
                "subject": "информатика",
                "topic": "Алгоритмы",
                "reason": "Важно для IT",
                "difficulty": "medium",
                "priority": 4,
            },
        ][:limit]

    def get_study_plan(
        self,
        student_profile: Dict,
        weak_subjects: Optional[List[str]] = None,
        days_per_week: int = 5,
    ) -> Dict:
        grade = student_profile.get("grade", 9)
        interests = student_profile.get("interests", [])
        career_direction = student_profile.get("careerDirection", "")
        weak_str = ", ".join(weak_subjects) if weak_subjects else "не указаны"

        prompt = f"""
Создай план обучения для ученика {grade} класса на неделю ({days_per_week} дней).
Интересы: {', '.join(interests)}. Слабые предметы: {weak_str}. Направление: {career_direction}.
JSON: {{"weekly_plan":[{{"day":1,"subjects":[{{"subject":"","topic":"","duration_minutes":45,"type":"theory/practice/quest","priority":"high/medium/low"}}]}}],"tips":[""],"goals":[""]}}
Верни ТОЛЬКО JSON.
"""
        text = _call_llm_sync(prompt)
        result = extract_json_object(text)
        return result or {"weekly_plan": [], "tips": [], "goals": []}

    def get_next_quest_recommendations(
        self,
        student_profile: Dict,
        completed_quests: Optional[List[str]] = None,
        limit: int = 3,
    ) -> List[Dict]:
        del completed_quests  # reserved for future filtering
        grade = student_profile.get("grade", 9)
        interests = student_profile.get("interests", [])
        career_direction = student_profile.get("careerDirection", "")

        prompt = f"""
Порекомендуй {limit} квестов для ученика {grade} класса.
Интересы: {', '.join(interests)}. Направление: {career_direction}.
JSON: [{{"title":"","subject":"","description":"","difficulty":"easy/medium/hard","estimated_time":30,"xp_reward":50-200,"skills":[""],"reason":""}}]
Верни ТОЛЬКО JSON массив.
"""
        text = _call_llm_sync(prompt)
        result = extract_json_array(text)
        return result[:limit] if result else []

    def analyze_learning_style(
        self, student_profile: Dict, quiz_results: Optional[Dict] = None
    ) -> Dict:
        del quiz_results  # reserved for future use
        interests = student_profile.get("interests", [])
        favorite_subjects = student_profile.get("favoriteSubjects", [])

        prompt = f"""
Проанализируй стиль обучения.
Интересы: {', '.join(interests)}. Предметы: {', '.join(favorite_subjects)}.
JSON: {{"learning_type":"visual/auditory/kinesthetic/mixed","optimal_session_duration":30-60,"preferred_content":["видео","текст","практика"],"memory_techniques":[""],"recommendations":[""]}}
Верни ТОЛЬКО JSON.
"""
        text = _call_llm_sync(prompt)
        return extract_json_object(text) or {}
