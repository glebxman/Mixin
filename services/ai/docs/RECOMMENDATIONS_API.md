# API Персонализированных Рекомендаций

## Обзор

API предоставляет персонализированные рекомендации для учеников на основе их профиля, интересов и прогресса.

## Базовый URL

```
http://localhost:8000/api/recommendations
```

## Endpoints

### 1. Рекомендации по темам

**POST** `/topics`

Получить персонализированные темы для изучения.

**Request Body:**
```json
{
  "grade": 9,
  "age": 15,
  "interests": ["программирование", "математика"],
  "favoriteSubjects": ["информатика", "физика"],
  "careerDirection": "IT / Программирование",
  "language": "ru"
}
```

**Response:**
```json
[
  {
    "subject": "информатика",
    "topic": "Алгоритмы сортировки",
    "reason": "Фундаментальная тема для программирования, соответствует вашим интересам",
    "difficulty": "medium",
    "priority": 5
  },
  {
    "subject": "математика",
    "topic": "Логарифмы и их свойства",
    "reason": "Необходимо для анализа сложности алгоритмов",
    "difficulty": "medium",
    "priority": 4
  }
]
```

### 2. Релевантные материалы

**POST** `/materials`

Найти материалы из учебников по конкретной теме.

**Query Parameters:**
- `topic` (string) - Тема для поиска
- `subject` (string) - Предмет
- `grade` (int) - Класс
- `language` (string) - Язык (ru/uz), default: "ru"
- `limit` (int) - Количество результатов, default: 3

**Example:**
```
POST /materials?topic=алгоритмы&subject=информатика&grade=9&language=ru&limit=3
```

**Response:**
```json
{
  "materials": [
    {
      "text": "Алгоритм — это точная последовательность действий...",
      "subject": "computer_science",
      "filename": "Информатика_9класс.pdf",
      "score": 0.92
    }
  ]
}
```

### 3. План обучения

**POST** `/study-plan`

Сгенерировать персональный план обучения на неделю.

**Request Body:**
```json
{
  "grade": 9,
  "interests": ["программирование"],
  "favoriteSubjects": ["информатика", "математика"],
  "careerDirection": "IT / Программирование",
  "weak_subjects": ["физика", "химия"],
  "days_per_week": 5
}
```

**Response:**
```json
{
  "weekly_plan": [
    {
      "day": 1,
      "subjects": [
        {
          "subject": "физика",
          "topic": "Механика. Повторение основ",
          "duration_minutes": 45,
          "type": "theory",
          "priority": "high"
        },
        {
          "subject": "информатика",
          "topic": "Практика: написание алгоритмов",
          "duration_minutes": 60,
          "type": "practice",
          "priority": "medium"
        }
      ]
    }
  ],
  "tips": [
    "Начинайте день со слабых предметов, когда концентрация максимальна",
    "Делайте перерывы каждые 45 минут"
  ],
  "goals": [
    "Улучшить понимание физики на 20%",
    "Решить 10 задач по алгоритмам"
  ]
}
```

### 4. Рекомендации квестов

**POST** `/quests`

Получить рекомендации по образовательным квестам.

**Request Body:**
```json
{
  "grade": 9,
  "interests": ["программирование", "математика"],
  "careerDirection": "IT / Программирование",
  "completed_quests": ["quest_001", "quest_002"],
  "limit": 3
}
```

**Response:**
```json
[
  {
    "title": "Создай свой первый сайт",
    "subject": "информатика",
    "description": "Изучи HTML, CSS и создай личную веб-страницу",
    "difficulty": "medium",
    "estimated_time": "120",
    "xp_reward": 150,
    "skills": ["HTML", "CSS", "веб-дизайн"],
    "reason": "Практическое применение программирования, соответствует IT-направлению"
  },
  {
    "title": "Математический детектив",
    "subject": "математика",
    "description": "Реши серию логических задач и раскрой математическую тайну",
    "difficulty": "hard",
    "estimated_time": "90",
    "xp_reward": 200,
    "skills": ["логика", "анализ", "решение задач"],
    "reason": "Развивает аналитическое мышление, важное для программиста"
  }
]
```

### 5. Анализ стиля обучения

**POST** `/learning-style`

Проанализировать предпочитаемый стиль обучения ученика.

**Request Body:**
```json
{
  "grade": 9,
  "interests": ["программирование", "технологии"],
  "favoriteSubjects": ["информатика", "математика"],
  "quiz_results": null
}
```

**Response:**
```json
{
  "learning_type": "kinesthetic",
  "optimal_session_duration": 45,
  "preferred_content": ["практика", "видео", "интерактивные задания"],
  "memory_techniques": [
    "Практическое применение знаний",
    "Создание проектов",
    "Метод интервальных повторений"
  ],
  "recommendations": [
    "Больше практических заданий и проектов",
    "Используйте видео-уроки для новых тем",
    "Применяйте знания сразу после изучения",
    "Делайте короткие перерывы каждые 45 минут"
  ]
}
```

### 6. Карьерные рекомендации (Legacy)

**POST** `/career`

Получить рекомендации по профессиям и университетам.

**Request Body:**
```json
{
  "grade": 9,
  "interests": ["программирование"],
  "favoriteSubjects": ["информатика", "математика"],
  "careerDirection": "IT / Программирование"
}
```

**Response:**
```json
[]
```

*Примечание: Этот endpoint будет реализован позже с базой данных университетов*

## Типы данных

### StudentProfile
```typescript
{
  grade: number;           // Класс (1-11)
  age?: number;            // Возраст
  interests: string[];     // Интересы
  favoriteSubjects: string[]; // Любимые предметы
  careerDirection?: string;   // Направление карьеры
  language: string;        // Язык (ru/uz)
}
```

### Difficulty Levels
- `easy` - Лёгкий
- `medium` - Средний
- `hard` - Сложный

### Priority Levels
- `1-2` - Низкий приоритет
- `3` - Средний приоритет
- `4-5` - Высокий приоритет

### Quest Types
- `theory` - Теория
- `practice` - Практика
- `quest` - Квест/проект

## Примеры использования

### Python
```python
import requests

profile = {
    "grade": 9,
    "interests": ["программирование", "математика"],
    "favoriteSubjects": ["информатика", "физика"],
    "careerDirection": "IT / Программирование"
}

# Получить рекомендации по темам
response = requests.post(
    "http://localhost:8000/api/recommendations/topics",
    json=profile
)
topics = response.json()

# Получить план обучения
response = requests.post(
    "http://localhost:8000/api/recommendations/study-plan",
    json={**profile, "weak_subjects": ["химия"]}
)
plan = response.json()
```

### JavaScript/TypeScript
```typescript
const profile = {
  grade: 9,
  interests: ["программирование", "математика"],
  favoriteSubjects: ["информатика", "физика"],
  careerDirection: "IT / Программирование"
};

// Получить рекомендации по темам
const topics = await fetch('http://localhost:8000/api/recommendations/topics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profile)
}).then(r => r.json());

// Получить квесты
const quests = await fetch('http://localhost:8000/api/recommendations/quests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...profile, limit: 5 })
}).then(r => r.json());
```

## Ошибки

### 500 Internal Server Error
```json
{
  "detail": "Error message"
}
```

Возможные причины:
- Ошибка подключения к Gemini API
- Ошибка подключения к Qdrant
- Некорректный формат данных

## Лимиты

- Рекомендации по темам: до 10 за запрос
- Материалы: до 10 за запрос
- Квесты: до 10 за запрос
- План обучения: 1-7 дней

## Зависимости

- Google Gemini API (для генерации рекомендаций)
- Qdrant (для поиска материалов из учебников)

## Переменные окружения

```env
GOOGLE_AI_API_KEY=your_api_key
QDRANT_URL=http://localhost:6333
```
