# Mixin EdTech UZ — архитектура

Образовательная AI-платформа для школьников Узбекистана. Монорепо на pnpm + Turbo.

## Структура

```
mixin/
├── apps/                  # Vite + React 19 + Tailwind v4 SPA
│   ├── student/           # 3100 — чат, аналитика, квесты, профиль
│   ├── parent/            # 3200 — дети, рекомендации
│   ├── school/            # 3300 — дашборд, ученики, аналитика, настройки
│   └── admin/             # 3400 — пользователи, обзор платформы
├── services/
│   ├── api/               # 3001 — Fastify, основной gateway
│   ├── ai/                # 8000 — FastAPI + Gemini, доступен только api
│   ├── analytics/         # 3002 — Fastify + ClickHouse (заглушка)
│   └── integrations/      # 3003 — Kundalik.uz/Payme cron (заглушка)
├── packages/
│   ├── api-client/        # типизированный axios для всех фронтов
│   ├── config/            # URL, cookies, лимиты
│   ├── db/                # Prisma client + schema + seed
│   ├── types/             # Zod-схемы и shared types
│   └── ui/                # дизайн-система (ChatGPT-style)
└── infra/docker/          # postgres, redis, qdrant, clickhouse
```

## Безопасность

- **HttpOnly cookies** для access/refresh JWT, токены в body не возвращаются.
- **CSRF double-submit pattern** на всех мутирующих запросах (`/api/auth/csrf` отдаёт токен).
- **Helmet + CSP** в Fastify.
- **Per-IP rate-limit** 5/min на login и register, 100/min глобальный.
- **Zod валидация** всех body и UUID в params.
- **`requireRole`** на каждом sensitive-эндпоинте.
- **AI-сервис** изолирован `INTERNAL_SERVICE_TOKEN`, фронт ходит только через api gateway.
- **AI-история берётся из БД** по `sessionId`, фронт её не передаёт (защита от prompt injection).
- **rehype-sanitize** для AI-markdown на фронте (защита от XSS).
- **Lua-скрипт** для атомарного rate-limit по подпискам в Redis.

## Демо-аккаунты

```
STUDENT      → student@demo.uz / password123
PARENT       → parent@demo.uz  / password123
SCHOOL_ADMIN → school@demo.uz  / password123
SUPER_ADMIN  → admin@demo.uz   / password123
```

## Локальный запуск

```bash
pnpm install
pnpm --filter @edtech/db run push
pnpm --filter @edtech/db run seed
pnpm dev          # все фронты + api через turbo
```

AI-сервис (Python) запускается отдельно:
```bash
cd services/ai && python main.py
```

## Roadmap

- Sprint A: refresh-token rotation, real-time CSP report
- Sprint B: Kundalik.uz sync, Payme/Uzum платежи
- Sprint C: i18n ru/uz/uz-Cyrl
- Sprint D: тесты (Vitest, pytest), CI, Sentry
