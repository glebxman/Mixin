# Mixin EdTech UZ — инструкция по запуску

## 1. Требования

- **Node.js** ≥ 20
- **pnpm** ≥ 10 (`npm i -g pnpm`)
- **Docker Desktop** (рекомендуется) ИЛИ Python ≥ 3.10 + Postgres ≥ 14 + Redis ≥ 6 локально
- **Git**

## 2. Клонирование и установка

```bash
git clone <repo-url> mixin
cd mixin
pnpm install
```

## 3. Настройка `.env`

```bash
cp .env.example .env
```

Минимально обязательные значения:

```dotenv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-password>
POSTGRES_DB=mixin
DATABASE_URL=postgresql://postgres:<your-password>@localhost:5432/mixin

REDIS_URL=redis://localhost:6379

# Сгенерируйте случайные секреты:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<paste-here>
JWT_REFRESH_SECRET=<paste-here>

# OpenRouter API key (https://openrouter.ai/keys)
OPENROUTER_API_KEY=<your-key>

AI_RATE_LIMIT_DISABLED=true
```

## 4. Инфраструктура через Docker (рекомендуется)

Postgres, Redis и Python AI-сервис поднимаются одной командой:

```bash
docker compose up -d
```

Что запустится:

| Контейнер | Сервис | Порт |
|-----------|--------|------|
| mixin-postgres | PostgreSQL 16 | 5432 |
| mixin-redis | Redis 7 | 6379 |
| mixin-ai | Python AI (FastAPI) | 8000 |

Проверка статуса:

```bash
docker compose ps         # все контейнеры должны быть Up (healthy)
docker compose logs -f    # хвост логов
docker compose logs ai-service -f
```

Остановка:

```bash
docker compose stop                # остановить, данные сохранить
docker compose down                # удалить контейнеры, volumes сохранить
docker compose down -v             # удалить ВСЁ (включая БД!)
```

Пересборка AI-образа после изменения Python-кода:

```bash
docker compose up -d --build ai-service
```

## 5. Альтернатива: запуск AI-сервиса локально (без Docker)

Если хочешь правки Python-кода с hot-reload и не хочешь пересобирать контейнер:

```bash
cd services/ai
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```

Сервис стартует на http://localhost:8000 с автоперезагрузкой при изменении файлов.

> Если уже запущен `docker compose`, сначала останови AI-контейнер: `docker compose stop ai-service`

## 6. Миграции БД и Prisma client

После того как Postgres поднят:

```bash
cd packages/db
npx dotenv -e ../../.env -- npx prisma migrate deploy
npx dotenv -e ../../.env -- npx prisma generate
cd ../..
```

> Если получите ошибку `EPERM` при `prisma generate` — остановите все запущенные API/turbo dev процессы и повторите.

## 7. Запуск Node-сервисов и фронтов

```bash
pnpm dev
```

Это запустит через `turbo`:

| Сервис | Порт | Адрес |
|--------|------|-------|
| API | 3001 | http://localhost:3001 |
| Analytics | 3002 | http://localhost:3002 |
| Integrations | 3003 | http://localhost:3003 |
| Student frontend | 3100 | http://localhost:3100 |
| Parent frontend | 3200 | http://localhost:3200 |
| School frontend | 3300 | http://localhost:3300 |
| Admin frontend | 3400 | http://localhost:3400 |

## 8. Полный пайплайн для свежего клона

```bash
# 1. Установка зависимостей
pnpm install

# 2. Заполнить .env (минимум — POSTGRES_PASSWORD, OPENROUTER_API_KEY, JWT секреты)
cp .env.example .env

# 3. Поднять инфраструктуру в Docker
docker compose up -d

# 4. Применить миграции
cd packages/db && npx dotenv -e ../../.env -- npx prisma migrate deploy && cd ../..

# 5. Запустить фронты и Node-сервисы
pnpm dev
```

Открыть http://localhost:3100 и проверить.

## 9. Полезные команды

```bash
pnpm dev                          # все Node-сервисы и фронты
pnpm build                        # production-сборка
pnpm lint                         # tsc --noEmit во всех пакетах
pnpm db:generate                  # пересоздать Prisma client
pnpm db:migrate                   # применить миграции
pnpm db:push                      # запушить схему без миграции (dev)

docker compose up -d              # инфраструктура
docker compose logs -f ai-service # логи AI
docker compose restart ai-service # перезапустить только AI
docker compose down               # остановить

pnpm --filter @edtech/api dev          # только API
pnpm --filter @edtech/student dev      # только фронт студента
pnpm --filter @edtech/admin dev        # только админка
```

## 10. Частые проблемы

### `502 Bad Gateway` при запросе в AI

- AI-сервис не запущен: проверь `docker compose ps` или Терминал с `python main.py`
- В логах ищи `OPENROUTER_API_KEY не настроен` → добавь ключ в `.env`, перезапусти контейнер

### `429 Too Many Requests` от OpenRouter

- Бесплатные модели имеют жёсткий rate-limit (~10 req/min)
- Подожди 1–2 минуты, или укажи в `.env` платную модель:
  ```
  OPENROUTER_MODEL=google/gemini-2.5-flash
  ```

### `EADDRINUSE: address already in use 0.0.0.0:3001`

- Висит старый процесс Node. Найди и убей:
  ```powershell
  $p = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($p) { Stop-Process -Id $p.OwningProcess -Force }
  ```

### `EPERM: rename query_engine-windows.dll.node`

- API-процесс держит DLL Prisma. Останови `pnpm dev` (Ctrl+C), запусти `prisma generate`, потом снова `pnpm dev`

### Docker контейнер постоянно рестартует

```bash
docker compose logs <service-name>
```

Чаще всего: неверный `.env`, занятый порт на хосте, или нехватка памяти у Docker.

## 11. Production

```bash
pnpm build
NODE_ENV=production pnpm --filter @edtech/api start
```

Не забудь:

- Установить `INTERNAL_SERVICE_TOKEN` (обязательно в production)
- Убрать `AI_RATE_LIMIT_DISABLED=true`
- Настроить HTTPS на API
- Настроить домены `NEXT_PUBLIC_*_URL` / `VITE_*_URL`
- Использовать managed Postgres / Redis вместо docker-compose
