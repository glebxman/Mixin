# API Аналитики

## Обзор

API для получения детальной аналитики прогресса ученика с AI-анализом сильных/слабых сторон и персонализированными рекомендациями.

## Базовый URL

```
http://localhost:8000/api/analytics
```

## Endpoints

### Получить аналитику ученика

**POST** `/student`

Анализирует прогресс ученика на основе профиля, AI-сессий и прогресса по предметам.

**Request Body:**
```json
{
  "studentId": "student_123",
  "studentProfile": {
    "grade": 9,
    "age": 15,
    "interests": ["программирование", "математика"],
    "favoriteSubjects": ["информатика", "физика"],
    "careerDirection": "IT / Программирование",
    "level": 12,
    "xp": 3450,
    "streakDays": 7
  },
  "subjectProgress": [
    {
      "subject": { "name": "Математика" },
      "score": 85
    },
    {
      "subject": { "name": "Физика" },
      "score": 72
    }
  ],
  "aiSessions": [
    {
      "id": "session_1",
      "messages": [
        { "role": "user", "content": "Помоги с алгеброй" },
        { "role": "assistant", "content": "Конечно! Что именно?" }
      ],
      "createdAt": "2026-05-17T12:00:00Z"
    }
  ],
  "questProgress": [
    {
      "id": "quest_1",
      "status": "COMPLETED"
    }
  ]
}
```

**Response:**
```json
{
  "overallProgress": 75,
  "level": 12,
  "xp": 3450,
  "xpToNextLevel": 500,
  "streakDays": 7,
  "totalStudyTime": 240,
  "subjectScores": [
    {
      "subject": "Математика",
      "score": 85,
      "trend": "up"
    },
    {
      "subject": "Физика",
      "score": 72,
      "trend": "up"
    },
    {
      "subject": "Информатика",
      "score": 80,
      "trend": "stable"
    }
  ],
  "strengths": [
    "Математика: высокий уровень",
    "Информатика: высокий уровень",
    "Программирование"
  ],
  "weaknesses": [
    "Химия: требует внимания",
    "География: требует внимания"
  ],
  "recommendations": [
    {
      "title": "Подтяните химию",
      "description": "Уделите 30 минут в день для улучшения понимания материала. Текущий уровень: 65%",
      "priority": "medium"
    },
    {
      "title": "Практикуйтесь регулярно",
      "description": "Решайте задачи каждый день для закрепления материала",
      "priority": "medium"
    }
  ],
  "weeklyActivity": [
    { "day": "Пн", "minutes": 45 },
    { "day": "Вт", "minutes": 60 },
    { "day": "Ср", "minutes": 30 },
    { "day": "Чт", "minutes": 75 },
    { "day": "Пт", "minutes": 50 },
    { "day": "Сб", "minutes": 90 },
    { "day": "Вс", "minutes": 40 }
  ],
  "completedQuests": 23,
  "totalQuests": 50
}
```

## Модели данных

### StudentProfile
```typescript
{
  grade: number;              // Класс (1-11)
  age?: number;               // Возраст
  interests: string[];        // Интересы
  favoriteSubjects: string[]; // Любимые предметы
  careerDirection?: string;   // Направление карьеры
  level?: number;             // Уровень геймификации
  xp?: number;                // Опыт
  streakDays?: number;        // Дни подряд
}
```

### SubjectProgress
```typescript
{
  subject: {
    name: string;             // Название предмета
  };
  score: number;              // Оценка (0-100)
}
```

### AiSession
```typescript
{
  id: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  createdAt: string;          // ISO 8601
}
```

### QuestProgress
```typescript
{
  id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}
```

## Логика расчётов

### Общий прогресс
Среднее арифметическое оценок по всем предметам.

### Время обучения
- ~2 минуты на каждое сообщение в AI-сессиях
- ~5 минут на каждую AI-сессию

### Тренды предметов
- `up` — оценка ≥ 85%
- `down` — оценка < 65%
- `stable` — между 65% и 85%

### Сильные стороны
- Предметы с оценкой ≥ 80%
- Интересы из профиля

### Слабые стороны
- Предметы с оценкой < 65%

### Рекомендации
- Автоматически генерируются для слабых предметов
- Приоритет `high` для оценок < 60%
- Приоритет `medium` для оценок 60-70%

### Активность за неделю
Рассчитывается на основе AI-сессий за последние 7 дней.

## Примеры использования

### JavaScript/TypeScript
```typescript
const analytics = await fetch('http://localhost:8000/api/analytics/student', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    studentId: 'student_123',
    studentProfile: {
      grade: 9,
      interests: ['программирование'],
      favoriteSubjects: ['информатика'],
      level: 12,
      xp: 3450,
      streakDays: 7
    },
    aiSessions: chats.map(chat => ({
      id: chat.id,
      messages: chat.messages,
      createdAt: new Date().toISOString()
    }))
  })
}).then(r => r.json());

console.log(analytics.overallProgress); // 75
console.log(analytics.strengths);       // ["Математика: высокий уровень", ...]
```

### Python
```python
import requests

response = requests.post(
    "http://localhost:8000/api/analytics/student",
    json={
        "studentId": "student_123",
        "studentProfile": {
            "grade": 9,
            "interests": ["программирование"],
            "favoriteSubjects": ["информатика"],
            "level": 12,
            "xp": 3450,
            "streakDays": 7
        },
        "aiSessions": []
    }
)

analytics = response.json()
print(f"Прогресс: {analytics['overallProgress']}%")
```

## Интеграция с фронтендом

Страница аналитики автоматически загружает данные при открытии:

```typescript
// apps/student/src/main.tsx - AnalyticsPage
useEffect(() => {
  async function fetchAnalytics() {
    const profile = getStudentProfile();
    const chats = JSON.parse(localStorage.getItem('mixin_student_ai_chats') || '[]');
    
    const response = await fetch('http://localhost:8000/api/analytics/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: getStudentId(),
        studentProfile: profile,
        aiSessions: chats.map(chat => ({
          id: chat.id,
          messages: chat.messages,
          createdAt: new Date().toISOString()
        }))
      })
    });
    
    const data = await response.json();
    setAnalytics(data);
  }
  
  fetchAnalytics();
}, []);
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
- Некорректный формат данных
- Отсутствие обязательных полей

## Зависимости

- Google Gemini API (для AI-анализа)
- Python 3.10+
- FastAPI
- Pydantic

## Переменные окружения

```env
GOOGLE_AI_API_KEY=your_api_key
```
