"""
Сервис генерации образовательных квестов
Создаёт персонализированные квесты для разных возрастных групп
"""

import os
import json
import re
from typing import List, Dict, Optional
from enum import Enum


class QuestDifficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class QuestType(str, Enum):
    QUIZ = "QUIZ"              # Викторина
    PUZZLE = "PUZZLE"          # Головоломка
    PROJECT = "PROJECT"        # Проект
    CHALLENGE = "CHALLENGE"    # Челлендж
    STORY = "STORY"            # Сюжетный квест


class AgeGroup(str, Enum):
    ELEMENTARY = "elementary"  # 1-4 классы
    MIDDLE = "middle"          # 5-8 классы
    HIGH = "high"              # 9-11 классы


class QuestGeneratorService:
    """Сервис для генерации образовательных квестов"""
    
    def __init__(self):
        self.genai_api_key = os.getenv("GOOGLE_AI_API_KEY")
        self.model = None
        
        if self.genai_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.genai_api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
            except Exception as e:
                print(f"Warning: Could not initialize Gemini: {e}")
                self.model = None
    
    def generate_quest(
        self,
        subject: str,
        topic: str,
        grade: int,
        difficulty: QuestDifficulty = QuestDifficulty.MEDIUM,
        quest_type: QuestType = QuestType.QUIZ,
        language: str = "ru"
    ) -> Dict:
        """
        Генерирует образовательный квест
        
        Args:
            subject: Предмет
            topic: Тема
            grade: Класс (1-11)
            difficulty: Сложность
            quest_type: Тип квеста
            language: Язык (ru/uz)
        
        Returns:
            Квест с заданиями
        """
        age_group = self._get_age_group(grade)
        
        if not self.model:
            return self._get_fallback_quest(subject, topic, grade, difficulty, quest_type)
        
        prompt = self._build_quest_prompt(
            subject, topic, grade, age_group, difficulty, quest_type, language
        )
        
        try:
            response = self.model.generate_content(prompt)
            quest_data = self._parse_quest_response(response.text)
            
            quest_data['subject'] = subject
            quest_data['topic'] = topic
            quest_data['grade'] = grade
            quest_data['difficulty'] = difficulty.value
            quest_data['type'] = quest_type.value
            quest_data['language'] = language
            
            return quest_data
        except Exception as e:
            print(f"Ошибка генерации квеста: {e}")
            return self._get_fallback_quest(subject, topic, grade, difficulty, quest_type)
    
    def _get_age_group(self, grade: int) -> AgeGroup:
        """Определяет возрастную группу по классу"""
        if grade <= 4:
            return AgeGroup.ELEMENTARY
        elif grade <= 8:
            return AgeGroup.MIDDLE
        else:
            return AgeGroup.HIGH
    
    def _build_quest_prompt(
        self,
        subject: str,
        topic: str,
        grade: int,
        age_group: AgeGroup,
        difficulty: QuestDifficulty,
        quest_type: QuestType,
        language: str
    ) -> str:
        """Создаёт промпт для генерации квеста"""
        
        age_descriptions = {
            AgeGroup.ELEMENTARY: "младшие школьники (1-4 класс), квест должен быть мини-игрой с сюжетом, логикой, палочками, маршрутом, тайником или героями, а не обычным тестом",
            AgeGroup.MIDDLE: "средние классы (5-8 класс), используй игровые кейсы, расследования, логические цепочки, сортировку шагов, поиск ошибки",
            AgeGroup.HIGH: "старшие классы (9-11 класс), используй реальные кейсы, симуляции, расследование ошибок, проектную работу, критическое мышление"
        }
        
        type_descriptions = {
            QuestType.QUIZ: "игровая проверка без сухого теста: выбор хода, поиск ключа, короткая разгадка, порядок действий",
            QuestType.PUZZLE: "головоломка или логическая мини-игра с пошаговым решением",
            QuestType.PROJECT: "мини-проект с этапами выполнения и критериями оценки",
            QuestType.CHALLENGE: "челлендж с практическим заданием",
            QuestType.STORY: "сюжетный квест с историей и выборами"
        }
        
        lang_instruction = "на русском языке" if language == "ru" else "на узбекском языке"
        
        return f"""Создай образовательный квест {lang_instruction}.

Параметры:
- Предмет: {subject}
- Тема: {topic}
- Класс: {grade}
- Возрастная группа: {age_descriptions[age_group]}
- Сложность: {difficulty.value}
- Тип квеста: {type_descriptions[quest_type]}

Требования:
1. Квест должен быть увлекательной мини-игрой, а не списком тестовых вопросов
2. Соответствовать возрасту и программе {grade} класса
3. Иметь чёткую структуру с заданиями-действиями
4. Включать систему баллов/оценки
5. Быть завершаемым за 15-30 минут
6. Для 1-4 класса запрещены сухие формулировки "выберите правильный ответ", "что такое", "сколько будет" без игрового сюжета
7. Для 1-4 класса минимум 80% заданий должны быть puzzle, open_answer или practical в формате игры

Формат ответа (JSON):
{{
  "title": "Название квеста",
  "description": "Описание и цель квеста",
  "story": "Сюжет/контекст (если применимо)",
  "estimatedTime": 20,
  "xpReward": 100,
  "tasks": [
    {{
      "id": 1,
      "type": "multiple_choice|open_answer|puzzle|practical",
      "question": "Игровое действие или загадка",
      "options": ["ход 1", "ход 2", "ход 3", "ход 4"],
      "correctAnswer": "правильный ответ или индекс",
      "explanation": "Объяснение правильного ответа",
      "points": 10,
      "hint": "Подсказка (опционально)"
    }}
  ],
  "skills": ["навык 1", "навык 2"],
  "successCriteria": {{
    "bronze": 60,
    "silver": 80,
    "gold": 95
  }}
}}

Верни только JSON, без дополнительного текста."""
        
    def _parse_quest_response(self, response_text: str) -> Dict:
        """Парсит ответ AI и извлекает JSON"""
        try:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            return {}
        except Exception as e:
            print(f"Ошибка парсинга ответа: {e}")
            return {}
    
    def _get_fallback_quest(
        self,
        subject: str,
        topic: str,
        grade: int,
        difficulty: QuestDifficulty,
        quest_type: QuestType
    ) -> Dict:
        """Возвращает базовый квест если AI недоступен"""
        return {
            "title": f"Квест: {topic}",
            "description": f"Проверь свои знания по теме '{topic}'",
            "story": f"Исследуй увлекательный мир {subject}!",
            "estimatedTime": 20,
            "xpReward": 100,
            "subject": subject,
            "topic": topic,
            "grade": grade,
            "difficulty": difficulty.value,
            "type": quest_type.value,
            "tasks": [
                {
                    "id": 1,
                    "type": "multiple_choice",
                    "question": f"Основной вопрос по теме {topic}",
                    "options": ["Вариант А", "Вариант Б", "Вариант В", "Вариант Г"],
                    "correctAnswer": 0,
                    "explanation": "Это правильный ответ, потому что...",
                    "points": 25,
                    "hint": "Подумай о базовых концепциях"
                },
                {
                    "id": 2,
                    "type": "true_false",
                    "question": "Утверждение по теме",
                    "correctAnswer": True,
                    "explanation": "Объяснение",
                    "points": 25
                },
                {
                    "id": 3,
                    "type": "open_answer",
                    "question": "Опиши своими словами...",
                    "correctAnswer": "Примерный ответ",
                    "explanation": "Ключевые моменты ответа",
                    "points": 50
                }
            ],
            "skills": ["критическое мышление", "анализ", "применение знаний"],
            "successCriteria": {
                "bronze": 60,
                "silver": 80,
                "gold": 95
            },
            "language": "ru"
        }
    
    def get_recommended_quests(
        self,
        student_profile: Dict,
        limit: int = 5
    ) -> List[Dict]:
        """
        Получает рекомендованные квесты для ученика
        
        Args:
            student_profile: Профиль ученика
            limit: Количество квестов
        
        Returns:
            Список рекомендованных квестов
        """
        grade = student_profile.get('grade', 9)
        interests = student_profile.get('interests', [])
        favorite_subjects = student_profile.get('favoriteSubjects', [])
        
        quests = []
        
        for subject in favorite_subjects[:2]:
            quest = self.generate_quest(
                subject=subject,
                topic=f"Основы {subject}",
                grade=grade,
                difficulty=QuestDifficulty.MEDIUM,
                quest_type=QuestType.QUIZ
            )
            quests.append(quest)
        
        for interest in interests[:2]:
            quest = self.generate_quest(
                subject="общее развитие",
                topic=interest,
                grade=grade,
                difficulty=QuestDifficulty.EASY,
                quest_type=QuestType.CHALLENGE
            )
            quests.append(quest)
        
        return quests[:limit]
