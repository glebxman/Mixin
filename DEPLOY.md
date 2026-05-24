# Деплой Mixin EdTech UZ на Linux-сервер

Инструкция для деплоя на **Ubuntu 22.04 / 24.04** с уже установленными **Docker** и **PM2**.  
Домен: **mixin.uz** (и поддомены).

---

## Архитектура на сервере

```
Интернет
    │
    ▼
Nginx (системный, порты 80/443)
    │
    ├── mixin.uz          → Student SPA  (Docker :3100)
    ├── parent.mixin.uz   → Parent SPA   (Docker :3200)
    ├── school.mixin.uz   → School SPA   (Docker :3300)
    ├── admin.mixin.uz    → Admin SPA    (Docker :3400)
    ├── api.mixin.uz      → API (PM2     :3001)
    └── ai.mixin.uz       → AI service  (Docker :8000)  [внутренний, опционально]

Docker Compose (инфраструктура):
    ├── PostgreSQL  :5433
    ├── Redis       :6379
    ├── Qdrant      :6333
    └── AI service  :8000
```

> **API запускается через PM2** (Node.js), а не в Docker — это даёт удобный мониторинг, авторестарт и логи через `pm2 logs`.  
> **Фронты** собираются в Docker-образы (nginx:alpine) и запускаются как контейнеры.

---

## Шаг 1 — Подготовка сервера

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Установить Node.js 20 (если не установлен)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установить pnpm
npm install -g pnpm

# Установить PM2 (если не установлен)
npm install -g pm2

# Проверить Docker
docker --version
docker compose version
```

---

## Шаг 2 — Клонирование проекта

```bash
# Рекомендуется хранить в /var/www или /opt
sudo mkdir -p /var/www/mixin
sudo chown $USER:$USER /var/www/mixin

git clone <repo-url> /var/www/mixin
cd /var/www/mixin
```

---

## Шаг 3 — Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Обязательно заполнить для production:

```dotenv
# ─── Database ────────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<STRONG_PASSWORD>
POSTGRES_DB=mixin
DATABASE_URL=postgresql://postgres:<STRONG_PASSWORD>@localhost:5433/mixin

# ─── Redis ───────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── JWT (генерируй: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ─── AI ──────────────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
AI_RATE_LIMIT_DISABLED=false

# ─── Internal token (API → AI) ───────────────────────────────
INTERNAL_SERVICE_TOKEN=<64-char-hex>

# ─── Google OAuth ────────────────────────────────────────────
GOOGLE_OAUTH_CLIENT_ID=<your-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-client-secret>
GOOGLE_OAUTH_REDIRECT_URI=https://api.mixin.uz/api/auth/google/callback
API_PUBLIC_URL=https://api.mixin.uz

# ─── Qdrant ──────────────────────────────────────────────────
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=textbooks

# ─── Node environment ────────────────────────────────────────
NODE_ENV=production
API_PORT=3001
AI_SERVICE_URL=http://localhost:8000

# ─── Public URLs (используются при сборке фронтов) ───────────
VITE_API_URL=https://api.mixin.uz
VITE_STUDENT_URL=https://mixin.uz
VITE_PARENT_URL=https://parent.mixin.uz
VITE_SCHOOL_URL=https://school.mixin.uz
VITE_ADMIN_URL=https://admin.mixin.uz
```

---

## Шаг 4 — Запуск инфраструктуры (Docker)

```bash
cd /var/www/mixin

# Поднять Postgres, Redis, Qdrant и AI-сервис
docker compose up -d

# Проверить что всё запустилось
docker compose ps
```

Все контейнеры должны показывать `Up (healthy)`. Если AI-сервис долго стартует — он скачивает модель `multilingual-e5-base` (~500 MB), подожди 2–3 минуты:

```bash
docker compose logs -f ai-service
```

---

## Шаг 5 — Установка зависимостей и миграции

```bash
cd /var/www/mixin

# Установить Node-зависимости
pnpm install --frozen-lockfile

# Применить миграции БД
pnpm db:migrate
pnpm db:generate
```

---

## Шаг 6 — Сборка фронтов

```bash
cd /var/www/mixin
pnpm build
```

Это соберёт все фронты (student, parent, school, admin) и API.  
Артефакты окажутся в `apps/*/dist/` и `services/api/dist/`.

---

## Шаг 7 — Запуск API через PM2

Создай конфиг PM2:

```bash
cat > /var/www/mixin/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: "mixin-api",
      script: "./services/api/dist/server.js",
      cwd: "/var/www/mixin",
      instances: 1,
      exec_mode: "fork",
      env_file: "/var/www/mixin/.env",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "/var/log/pm2/mixin-api-error.log",
      out_file: "/var/log/pm2/mixin-api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
EOF
```

Создай директорию для логов и запусти:

```bash
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

pm2 start /var/www/mixin/ecosystem.config.cjs
pm2 save
pm2 startup   # выполни команду которую выведет эта команда (sudo ...)
```

Проверка:
```bash
pm2 status
pm2 logs mixin-api --lines 50
```

---

## Шаг 8 — Запуск фронтов в Docker

Фронты собраны в Docker-образы (nginx:alpine). Создай отдельный compose-файл для production:

```bash
cat > /var/www/mixin/docker-compose.prod.yml << 'EOF'
services:
  student:
    build:
      context: .
      dockerfile: apps/student/Dockerfile
    container_name: mixin-student
    restart: unless-stopped
    ports:
      - "3100:80"

  parent:
    build:
      context: .
      dockerfile: apps/parent/Dockerfile
    container_name: mixin-parent
    restart: unless-stopped
    ports:
      - "3200:80"

  school:
    build:
      context: .
      dockerfile: apps/school/Dockerfile
    container_name: mixin-school
    restart: unless-stopped
    ports:
      - "3300:80"

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    container_name: mixin-admin
    restart: unless-stopped
    ports:
      - "3400:80"
EOF
```

Собери и запусти:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

> **Примечание:** Сборка займёт 5–10 минут (4 образа). При повторном деплое только изменившиеся слои пересобираются.

---

## Шаг 9 — Настройка Nginx

### 9.1 Создай конфиги для каждого поддомена

```bash
sudo nano /etc/nginx/sites-available/mixin
```

Вставь:

```nginx
# ─── mixin.uz — Student SPA ──────────────────────────────────
server {
    listen 80;
    server_name mixin.uz www.mixin.uz;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ─── parent.mixin.uz — Parent SPA ────────────────────────────
server {
    listen 80;
    server_name parent.mixin.uz;

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ─── school.mixin.uz — School SPA ────────────────────────────
server {
    listen 80;
    server_name school.mixin.uz;

    location / {
        proxy_pass http://127.0.0.1:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ─── admin.mixin.uz — Admin SPA ──────────────────────────────
server {
    listen 80;
    server_name admin.mixin.uz;

    location / {
        proxy_pass http://127.0.0.1:3400;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ─── api.mixin.uz — Fastify API ──────────────────────────────
server {
    listen 80;
    server_name api.mixin.uz;

    # Увеличенный таймаут для AI-запросов (могут идти 30–60 сек)
    proxy_read_timeout 120s;
    proxy_connect_timeout 10s;
    proxy_send_timeout 120s;

    # Лимит размера тела (для загрузки изображений)
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket поддержка (если нужна)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 9.2 Активируй конфиг

```bash
sudo ln -s /etc/nginx/sites-available/mixin /etc/nginx/sites-enabled/mixin

# Проверь синтаксис
sudo nginx -t

# Перезагрузи Nginx
sudo systemctl reload nginx
```

---

## Шаг 10 — DNS записи

В панели управления доменом **mixin.uz** добавь A-записи, указывающие на IP твоего сервера:

| Тип | Имя          | Значение       | TTL  |
|-----|--------------|----------------|------|
| A   | @            | `<SERVER_IP>`  | 3600 |
| A   | www          | `<SERVER_IP>`  | 3600 |
| A   | parent       | `<SERVER_IP>`  | 3600 |
| A   | school       | `<SERVER_IP>`  | 3600 |
| A   | admin        | `<SERVER_IP>`  | 3600 |
| A   | api          | `<SERVER_IP>`  | 3600 |

> Изменения DNS распространяются от нескольких минут до 24 часов. Проверить:
> ```bash
> dig mixin.uz +short
> dig api.mixin.uz +short
> ```

---

## Шаг 11 — SSL-сертификат через Certbot

Дождись пока DNS-записи распространятся, затем:

```bash
# Получить сертификаты для всех доменов одной командой
sudo certbot --nginx \
  -d mixin.uz \
  -d www.mixin.uz \
  -d parent.mixin.uz \
  -d school.mixin.uz \
  -d admin.mixin.uz \
  -d api.mixin.uz \
  --email admin@mixin.uz \
  --agree-tos \
  --no-eff-email
```

Certbot автоматически:
- Получит сертификаты от Let's Encrypt
- Обновит конфиги Nginx (добавит `listen 443 ssl` и редирект с HTTP на HTTPS)
- Настроит авторенёвал через systemd timer

Проверь авторенёвал:
```bash
sudo certbot renew --dry-run
```

После получения сертификатов проверь что Nginx перезагрузился:
```bash
sudo systemctl status nginx
curl -I https://mixin.uz
```

---

## Шаг 12 — Проверка деплоя

```bash
# Статус всех сервисов
pm2 status
docker compose ps
docker compose -f docker-compose.prod.yml ps

# Проверить API
curl https://api.mixin.uz/health

# Проверить AI
curl http://localhost:8000/health

# Логи API
pm2 logs mixin-api --lines 100

# Логи AI
docker compose logs -f ai-service
```

Открой в браузере:
- https://mixin.uz — студент
- https://parent.mixin.uz — родитель
- https://admin.mixin.uz — админ
- https://api.mixin.uz/docs — Swagger документация API

---

## Обновление проекта (повторный деплой)

```bash
cd /var/www/mixin

# 1. Получить изменения
git pull origin main

# 2. Обновить зависимости
pnpm install --frozen-lockfile

# 3. Применить новые миграции (если есть)
pnpm db:migrate

# 4. Пересобрать
pnpm build

# 5. Перезапустить API
pm2 restart mixin-api

# 6. Пересобрать и перезапустить фронты (только если изменились)
docker compose -f docker-compose.prod.yml up -d --build

# 7. Пересобрать AI (только если изменился Python-код)
docker compose up -d --build ai-service
```

---

## Мониторинг

### PM2

```bash
pm2 status                    # статус всех процессов
pm2 monit                     # интерактивный мониторинг CPU/RAM
pm2 logs mixin-api            # хвост логов
pm2 logs mixin-api --lines 200  # последние 200 строк
pm2 restart mixin-api         # перезапустить
pm2 reload mixin-api          # zero-downtime reload
```

### Docker

```bash
docker compose ps                        # статус контейнеров
docker compose logs -f ai-service        # логи AI
docker compose logs -f postgres          # логи Postgres
docker stats                             # CPU/RAM всех контейнеров
```

### Nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
sudo nginx -t                            # проверить конфиг
sudo systemctl reload nginx              # применить изменения конфига
```

### Диск

```bash
df -h                          # свободное место
docker system df               # место занятое Docker
docker system prune -f         # очистить неиспользуемые образы/кэш
```

---

## Резервное копирование

### Postgres

```bash
# Создать дамп
docker exec mixin-postgres pg_dump -U postgres mixin > /backup/mixin-$(date +%Y%m%d).sql

# Восстановить
docker exec -i mixin-postgres psql -U postgres mixin < /backup/mixin-20250101.sql
```

### Qdrant (RAG-индекс)

Данные хранятся в Docker volume `qdrant_data`. Для бэкапа:

```bash
docker run --rm \
  -v mixin_qdrant_data:/data \
  -v /backup:/backup \
  alpine tar czf /backup/qdrant-$(date +%Y%m%d).tar.gz /data
```

---

## Переменные окружения — полный список

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_ACCESS_SECRET` | ✅ | Секрет для access-токенов (64+ символов) |
| `JWT_REFRESH_SECRET` | ✅ | Секрет для refresh-токенов (64+ символов) |
| `OPENROUTER_API_KEY` | ✅ | Ключ OpenRouter для AI |
| `INTERNAL_SERVICE_TOKEN` | ✅ | Токен для API→AI запросов (64+ символов) |
| `GOOGLE_OAUTH_CLIENT_ID` | если нужен Google OAuth | |
| `GOOGLE_OAUTH_CLIENT_SECRET` | если нужен Google OAuth | |
| `GOOGLE_OAUTH_REDIRECT_URI` | если нужен Google OAuth | `https://api.mixin.uz/api/auth/google/callback` |
| `NODE_ENV` | ✅ | `production` |
| `AI_RATE_LIMIT_DISABLED` | — | `false` в production |
| `QDRANT_URL` | — | `http://localhost:6333` |
| `VITE_API_URL` | ✅ | `https://api.mixin.uz` (для сборки фронтов) |

---

## Частые проблемы на сервере

### Certbot: `Could not bind to IPv4 or IPv6`
Nginx занял порт 80. Certbot нужен свободный порт для проверки:
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d mixin.uz ...
sudo systemctl start nginx
```
Или используй `--nginx` плагин (он сам управляет Nginx).

### `502 Bad Gateway` после деплоя
- API не запущен: `pm2 status` → `pm2 start ecosystem.config.cjs`
- Фронт-контейнер упал: `docker compose -f docker-compose.prod.yml ps`
- Неверный порт в nginx конфиге

### Фронт открывается, но API не отвечает (CORS)
- Убедись что `VITE_API_URL=https://api.mixin.uz` был задан **до сборки** фронтов
- Пересобери: `pnpm build && docker compose -f docker-compose.prod.yml up -d --build`

### `EACCES: permission denied` при запуске PM2
```bash
sudo chown -R $USER:$USER /var/www/mixin
```

### Docker: `no space left on device`
```bash
docker system prune -af --volumes   # ОСТОРОЖНО: удалит все неиспользуемые volumes
# Или только кэш сборки:
docker builder prune -f
```

### Сертификат не обновляется автоматически
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```
