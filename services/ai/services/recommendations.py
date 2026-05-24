"""
Сервис персонализированных рекомендаций для учеников.
Использует OpenRouter (OpenAI-совместимый API).
"""

import os
import json
import re
from typing import List, Dict
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mixin.uz",
        "X-Title": "Mixin EdTech UZ",
    }


def _call_llm(prompt: str) -> str:
    """Синхронный вызов LLM через OpenRouter."""
    if not OPENROUTER_API_KEY:
        return ""

    try:
        response = httpx.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1500,
                "temperature": 0.7,
            },
            headers=_headers(),
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        print(f"[recommendations] LLM call failed: {e}")
        return ""


def _extract_json_array(text: str) -> list:
    """Извлекает JSON-массив из ответа LLM."""
    try:
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except (json.JSONDecodeError, AttributeError):
        pass
    return []


def _extract_json_object(text: str) -> dict:
    """Извлекает JSON-объект из ответа LLM."""
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except (json.JSONDecodeError, AttributeError):
        pass
    return {}


class RecommendationService:
    """Сервис рекомендаций на основе профиля ученика"""

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
        text = _call_llm(prompt)
        result = _extract_json_array(text)
        if result:
            return result[:limit]

        return [
            {"subject": "математика", "topic": "Повторение основ", "reason": "Укрепление базы", "difficulty": "medium", "priority": 3},
            {"subject": "информатика", "topic": "Алгоритмы", "reason": "Важно для IT", "difficulty": "medium", "priority": 4},
        ][:limit]

    def get_study_plan(
        self, student_profile: Dict, weak_subjects: List[str] = None, days_per_week: int = 5
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
        text = _call_llm(prompt)
        result = _extract_json_object(text)
        return result or {"weekly_plan": [], "tips": [], "goals": []}

    def get_next_quest_recommendations(
        self, student_profile: Dict, completed_quests: List[str] = None, limit: int = 3
    ) -> List[Dict]:
        grade = student_profile.get("grade", 9)
        interests = student_profile.get("interests", [])
        career_direction = student_profile.get("careerDirection", "")

        prompt = f"""
Порекомендуй {limit} квестов для ученика {grade} класса.
Интересы: {', '.join(interests)}. Направление: {career_direction}.
JSON: [{{"title":"","subject":"","description":"","difficulty":"easy/medium/hard","estimated_time":30,"xp_reward":50-200,"skills":[""],"reason":""}}]
Верни ТОЛЬКО JSON массив.
"""
        text = _call_llm(prompt)
        result = _extract_json_array(text)
        return result[:limit] if result else []

    def analyze_learning_style(self, student_profile: Dict, quiz_results: Dict = None) -> Dict:
        interests = student_profile.get("interests", [])
        favorite_subjects = student_profile.get("favoriteSubjects", [])

        prompt = f"""
Проанализируй стиль обучения.
Интересы: {', '.join(interests)}. Предметы: {', '.join(favorite_subjects)}.
JSON: {{"learning_type":"visual/auditory/kinesthetic/mixed","optimal_session_duration":30-60,"preferred_content":["видео","текст","практика"],"memory_techniques":[""],"recommendations":[""]}}
Верни ТОЛЬКО JSON.
"""
        text = _call_llm(prompt)
        return _extract_json_object(text) or {}
