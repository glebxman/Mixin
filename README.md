# Mixin EdTech UZ

Образовательная AI-платформа для школьников Узбекистана.  
Монорепо: **pnpm + Turbo**, фронты на **Vite + React 19**, бэкенд на **Fastify**, AI-сервис на **FastAPI (Python)**.

---

## Структура проекта

```
mixin/
├── apps/
│   ├── student/        # :3100 — чат с AI, аналитика, квесты, профиль
│   ├── parent/         # :3200 — дети, рекомендации
│   ├── school/         # :3300 — дашборд школы, ученики
│   └── admin/          # :3400 — управление пользователями, платформа
├── services/
│   ├── api/            # :3001 — Fastify API gateway
│   ├── ai/             # :8000 — FastAPI + OpenRouter (RAG, чат, аналитика)
│   ├── analytics/      # :3002 — ClickHouse (заглушка)
│   └── integrations/   # :3003 — Kundalik.uz / Payme (заглушка)
├── packages/
│   ├── api-client/     # типизированный HTTP-клиент для фронтов
│   ├── config/         # URL, cookies, лимиты
│   ├── db/             # Prisma schema + migrations + seed
│   ├── i18n/           # ru / uz / en локали
│   ├── types/          # Zod-схемы и shared types
│   └── ui/             # дизайн-система
├── data/textbooks/     # PDF/TXT учебники для RAG-индексации
├── infra/nginx/        # nginx конфиги для production
└── docker-compose.yml  # инфраструктура для разработки
```

---

## Требования

| Инструмент | Версия |
|------------|--------|
| Node.js    | ≥ 20   |
| pnpm       | ≥ 10   |
| Docker     | ≥ 24   |
| Python     | ≥ 3.10 (только если запускаешь AI без Docker) |
| Git        | любая  |

Установить pnpm:
```bash
npm install -g pnpm
```

---

## Быстрый старт (локальная разработка)

### 1. Клонирование и зависимости

```bash
git clone <repo-url> mixin
cd mixin
pnpm install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Минимально обязательные значения в `.env`:

```dotenv
# База данных
POSTGRES_PASSWORD=yourpassword
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5433/mixin

# JWT — сгенерируй случайные строки:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>

# OpenRouter API (https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-...

# Для разработки можно отключить rate-limit
AI_RATE_LIMIT_DISABLED=true
```

> **Важно:** Postgres в docker-compose пробрасывается на порт **5433** (не 5432), чтобы не конфликтовать с локальным Postgres.

### 3. Запуск инфраструктуры

```bash
docker compose up -d
```

Поднимает:

| Контейнер      | Сервис          | Порт  |
|----------------|-----------------|-------|
| mixin-postgres | PostgreSQL 16   | 5433  |
| mixin-redis    | Redis 7         | 6379  |
| mixin-qdrant   | Qdrant (RAG)    | 6333  |
| mixin-ai       | Python FastAPI  | 8000  |

Проверка:
```bash
docker compose ps          # все должны быть Up (healthy)
docker compose logs -f     # общий лог
docker compose logs -f ai-service  # лог AI
```

### 4. Миграции базы данных

```bash
pnpm db:migrate
pnpm db:generate
```

Или вручную:
```bash
cd packages/db
npx dotenv -e ../../.env -- npx prisma migrate deploy
npx dotenv -e ../../.env -- npx prisma generate
cd ../..
```

### 5. Запуск всех сервисов

```bash
pnpm dev
```

Открывай:

| Приложение       | URL                       |
|------------------|---------------------------|
| Студент          | http://localhost:3100     |
| Родитель         | http://localhost:3200     |
| Школа            | http://localhost:3300     |
| Админ            | http://localhost:3400     |
| API              | http://localhost:3001     |
| AI сервис        | http://localhost:8000     |
| Qdrant Dashboard | http://localhost:6333/dashboard |

### 6. Демо-аккаунты

```
STUDENT      → student@demo.uz  / password123
PARENT       → parent@demo.uz   / password123
SCHOOL_ADMIN → school@demo.uz   / password123
SUPER_ADMIN  → admin@demo.uz    / password123
```

---

## RAG — индексация учебников

Положи PDF/TXT файлы в `data/textbooks/`, затем:

```bash
# Убедись что Qdrant запущен
docker compose up -d qdrant

# Индексация (только новые файлы)
cd services/ai
python scripts/process_textbooks.py --skip-existing

# Проверить что проиндексировалось
python scripts/process_textbooks.py --dry-run
```

---

## Полезные команды

```bash
# Разработка
pnpm dev                              # все сервисы и фронты
pnpm --filter @edtech/api dev         # только API
pnpm --filter @edtech/student dev     # только фронт студента
pnpm --filter @edtech/admin dev       # только админка

# Сборка
pnpm build                            # production-сборка всего

# Линтинг и форматирование
pnpm lint
pnpm format

# База данных
pnpm db:generate                      # пересоздать Prisma client
pnpm db:migrate                       # применить миграции
pnpm db:push                          # запушить схему без миграции (dev)

# Docker
docker compose up -d                  # запустить инфраструктуру
docker compose stop                   # остановить (данные сохранятся)
docker compose down                   # удалить контейнеры
docker compose down -v                # удалить контейнеры + volumes (БД!)
docker compose up -d --build ai-service  # пересобрать AI после изменений
docker compose logs -f ai-service     # логи AI
docker compose restart ai-service     # перезапустить AI
```

---

## Запуск AI-сервиса локально (без Docker)

Если нужен hot-reload при разработке Python-кода:

```bash
# Остановить Docker-контейнер AI
docker compose stop ai-service

cd services/ai
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows

pip install -r requirements.txt
python main.py
```

---

## Частые проблемы

### `502 Bad Gateway` при запросе к AI
- Проверь `docker compose ps` — контейнер `mixin-ai` должен быть `Up (healthy)`
- Проверь логи: `docker compose logs ai-service`
- Убедись что `OPENROUTER_API_KEY` задан в `.env`

### `429 Too Many Requests` от OpenRouter
- Бесплатные модели имеют лимит ~10 req/min
- Подожди 1–2 минуты или укажи платную модель в `.env`:
  ```dotenv
  OPENROUTER_MODEL=google/gemini-2.5-flash
  ```

### `EADDRINUSE: address already in use :3001`
- Висит старый Node-процесс. Убей его:
  ```bash
  # Linux/macOS
  lsof -ti:3001 | xargs kill -9
  # Windows PowerShell
  Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

### `EPERM: rename query_engine-windows.dll.node`
- Prisma держит DLL. Останови `pnpm dev`, запусти `pnpm db:generate`, потом снова `pnpm dev`

### Docker-контейнер постоянно рестартует
```bash
docker compose logs <service-name>
```
Чаще всего: неверный `.env`, занятый порт, нехватка памяти у Docker.

---

## Production

Подробная инструкция по деплою на Linux-сервер с Docker, Nginx и SSL:  
👉 **[DEPLOY.md](./DEPLOY.md)**
