# База данных Mixin

## Обзор

База данных построена на **PostgreSQL** с использованием **Prisma ORM**. Схема поддерживает все основные функции образовательной платформы.

## Структура

### 👤 Пользователи и профили

#### `User`
Базовая модель пользователя с ролями:
- `STUDENT` — ученик
- `PARENT` — родитель
- `SCHOOL_ADMIN` — администратор школы
- `SUPER_ADMIN` — суперадминистратор

#### `Profile`
Общий профиль (имя, фамилия, аватар, язык)

#### `StudentProfile` ⭐
Расширенный профиль ученика с данными онбординга:
- `grade` — класс (1-11)
- `age` — возраст
- `schoolName` — название школы (текстовое поле)
- `schoolId` — связь с моделью School (опционально)
- `interests` — интересы (массив строк)
- `favoriteSubjects` — любимые предметы (массив строк)
- `careerDirection` — направление карьеры
- `targetProfession` — целевая профессия
- `kundalikId` — ID в Kundalik.uz для интеграции
- `xp` — опыт (геймификация)
- `level` — уровень
- `streakDays` — дни подряд активности
- `onboardingComplete` — флаг завершения онбординга

#### `ParentProfile`
Профиль родителя со связями с детьми через `ParentStudentLink`

### 🏫 Школы

#### `School`
Модель школы:
- `name`, `city`, `region` — локация
- `focus` — направления школы (IT, медицина, общее образование)

#### `SchoolSubjectWeight`
Вес предмета для конкретной школы (например, IT-школа → математика вес 2.0)

### 📚 Предметы и темы

#### `Subject`
Школьные предметы (математика, физика, биология и т.д.)

#### `Topic`
Темы внутри предмета с привязкой к классу

#### `SubjectProgress`
Прогресс ученика по предмету:
- `score` — оценка (0-100)
- `weakTopics` — слабые темы
- `lastSyncedAt` — последняя синхронизация с Kundalik.uz

### 🎮 Квесты (геймификация)

#### `Quest`
Образовательные квесты с уровнями сложности:
- `EASY`, `MEDIUM`, `HARD`
- `xpReward` — награда опытом
- `content` — JSON с заданиями

#### `QuestProgress`
Прогресс прохождения квеста:
- `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`

### 🤖 AI-сессии

#### `AiSession`
История чатов с AI:
- `messages` — JSON массив сообщений
- `tokensUsed` — использованные токены
- `subjectId` — привязка к предмету (опционально)

### 🏆 Достижения

#### `Achievement`
Система достижений

#### `StudentAchievement`
Связь ученика с заработанными достижениями

### 💼 Карьерные рекомендации

#### `CareerRecommendation`
AI-рекомендации по профессии и университету:
- `profession` — профессия
- `university` — университет
- `matchScore` — процент совпадения (0-1)
- `reasoning` — обоснование

### 🔔 Уведомления

#### `Notification`
Типы:
- `ACHIEVEMENT` — достижения
- `REMINDER` — напоминания
- `SYSTEM` — системные
- `PARENT_REPORT` — отчёты для родителей

### 💳 Подписки и платежи

#### `Payment`
Интеграция с Payme и Uzum Pay

## Миграции

### Создание новой миграции

```bash
cd packages/db
npx prisma migrate dev --name migration_name
```

### Применение миграций

```bash
npx prisma migrate deploy
```

### Генерация Prisma Client

```bash
npx prisma generate
```

## Индексы

Оптимизированные индексы для:
- Поиска по email, роли
- Фильтрации по классу, школе
- Запросов прогресса и квестов
- AI-сессий по дате

## Связи

```
User (1) ──→ (1) StudentProfile
StudentProfile (N) ──→ (1) School
StudentProfile (1) ──→ (N) SubjectProgress
StudentProfile (1) ──→ (N) QuestProgress
StudentProfile (1) ──→ (N) AiSession
StudentProfile (1) ──→ (N) CareerRecommendation
ParentProfile (N) ──→ (N) StudentProfile (через ParentStudentLink)
```

## Использование

```typescript
import { prisma } from '@edtech/db';

// Создание профиля ученика после онбординга
const profile = await prisma.studentProfile.create({
  data: {
    userId: user.id,
    grade: 'G9',
    age: 15,
    interests: ['программирование', 'математика'],
    favoriteSubjects: ['информатика', 'физика'],
    careerDirection: 'IT / Программирование',
    schoolName: 'Школа №1, Ташкент',
    onboardingComplete: true,
  },
});

// Получение профиля с прогрессом
const student = await prisma.studentProfile.findUnique({
  where: { userId },
  include: {
    subjectProgress: true,
    questProgress: true,
    recommendations: true,
  },
});
```

## Переменные окружения

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mixin
```

## Следующие шаги

1. ✅ Схема создана
2. ⏳ Миграции (требуется настройка DATABASE_URL)
3. ⏳ Seed данных (предметы, темы, квесты)
4. ⏳ API endpoints для работы с профилями
