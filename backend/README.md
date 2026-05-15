# LAMA Backend — платформа управления Telegram-каналами

FastAPI-приложение, обслуживающее: публикации с расписанием, рекламный кабинет с метриками, модерацию каналов и групп, ботов (welcome / auto-replies / triggers / recurring messages), бэкап постов, инвайт-ссылки, форум-темы, captcha, антифлуд и антиспам.

## Стек

- **Python 3.11** + **FastAPI** — асинхронный веб-фреймворк
- **PostgreSQL 16** + **SQLAlchemy 2.0** (async) + **Alembic** — БД, ORM, миграции
- **Celery** (`high / moderation / default / low / autodelete` очереди) + **Redis** — фоновые задачи, rate-limit, кэш
- **aiogram 3.x** — Telegram Bot API
- **Pydantic v2** — валидация и сериализация
- **httpx / BeautifulSoup** — скрапинг t.me/{chan}/{id}?embed=1 для метрик публикаций
- **OpenPyXL** — экспорт xlsx в рекламном кабинете
- **boto3 + Pillow** — S3-хранилище и ресайз изображений
- **pytest + pytest-asyncio + asgi-lifespan + aiosqlite** — тесты (in-memory sqlite + ASGI-клиент)

## Структура проекта

```
backend/
├── main.py                       # FastAPI app, lifespan, регистрация роутеров
├── config.py                     # env-переменные (DATABASE_URL, TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, ...)
├── database.py                   # AsyncSessionLocal, get_db, Celery-фабрика сессий
│
├── models/                       # SQLAlchemy-модели (один файл — один домен таблиц)
│   ├── auth.py                   # User, TelegramAccount, UserSession
│   ├── publications.py           # Publication, Tag, TelegramMessage, PublicationSeries
│   ├── channels.py               # ChannelGroup + все настройки модерации + BackedUpPost
│   ├── bots.py                   # Bot, BotCommand, Trigger, AutoReply, RecurringMessage
│   ├── ad_revenues.py            # AdRevenue (рекламный кабинет)
│   ├── inbox.py                  # InboxEvent (события из чатов/каналов)
│   ├── direct.py                 # DirectChat (DM с ботами)
│   └── landing.py                # Лендинги
│
├── schemas/                      # Pydantic-схемы (по доменам, реэкспорт через __init__)
│   ├── publications/             # enums, ai, templates, series, publishing, ...
│   ├── channels/                 # channel, backup, moderation, antispam, flood, ...
│   ├── bots/
│   ├── ad_revenues/
│   └── inbox/
│
├── services/                     # Бизнес-логика (use-case'ы по доменам)
│   ├── ad_revenues/              # Рекламный кабинет (доходы/расходы, ПДП-метрики, экспорт)
│   ├── publications/             # README → детали      📄
│   ├── channel/                  # README → детали      📄
│   ├── bot/                      # README → детали      📄
│   ├── inbox/                    # События из каналов, триггеры, реакции
│   ├── direct/                   # Прямые сообщения (DM)
│   ├── webhook/                  # Установка/снятие Telegram webhook
│   ├── bot_provider.py           # Резолв бота по token / channel / bot_id
│   ├── telegram_client.py        # RateLimitedBot — обёртка aiogram с rate-limit
│   ├── rate_limiter.py           # Redis-based лимитер
│   ├── storage.py                # S3 + локальный fallback
│   ├── upload_service.py         # Загрузка медиа (с ресайзом картинок)
│   ├── link_preview.py           # Скрапинг превью ссылок
│   └── knowledge_base.py         # БЗ для AI-ответов (RAG)
│
├── routes/                       # FastAPI-эндпоинты (тонкие, делегируют в services)
│   ├── auth/                     # /auth/* — email + Telegram OAuth
│   ├── publications/             # /publications/* — 8 файлов (publications, templates, tags, series, publishing, calendar, ai, sharing)
│   ├── channels/                 # /channels/* — 16 файлов (CRUD + 14 настроек)
│   ├── bots/                     # /bots/* — 8 файлов
│   ├── ad_revenues/              # /ad-revenues/*
│   ├── inbox/
│   ├── direct/
│   ├── webhook/                  # /webhook/{bot_token} — приём апдейтов от TG
│   ├── upload.py / media_upload.py / link_preview.py / landing.py / knowledge_base.py
│
├── celery/
│   ├── app.py                    # celery_app + конфиг очередей и beat-расписания
│   └── tasks.py                  # publish_publication, delete_publication_messages, process_backup_job, ...
│
├── alembic/                      # Миграции БД
├── tests/                        # См. TESTING.md
│   ├── ad_revenues/              # 67 тестов
│   ├── publications/             # 89 тестов
│   ├── channel/                  # 78 тестов
│   └── bot/                      # 82 теста
│
├── Dockerfile
├── requirements.txt
└── README.md                     # ← этот файл
```

## Доменные README

Внутри каждого крупного сервиса лежит свой README с детальной картой:

| Домен | README | О чём |
|---|---|---|
| Публикации | [services/publications/README.md](services/publications/README.md) | Posts, calendar, AI, series, templates, tags, sharing, publishing pipeline |
| Каналы | [services/channel/README.md](services/channel/README.md) | CRUD + 17 подпапок настроек: backup, moderation, antispam, flood, captcha, invite-links, info-messages, forum-topics, ... |
| Боты | [services/bot/README.md](services/bot/README.md) | CRUD, welcome, auto-replies, triggers (включая `fire / schedule / actions`), recurring messages, moderation-команды, captcha |
| Рекламный кабинет | [services/ad_revenues/README.md](services/ad_revenues/README.md) | Доходы/расходы, дельты подписчиков (ПДП), retention, экспорт xlsx/csv |

## Запуск

### Через Docker (рекомендовано)

```bash
cp .env.example .env  # если такого файла нет — создай вручную, см. ниже список переменных
docker compose up -d
```

Поднимутся: `lama-postgres` + `lama-redis` + `lama-backend` (FastAPI) + 2× `celery-worker` + `lama-celery-beat` + `celery-autodelete` + `lama-frontend`.

API: `http://localhost:8000` · Swagger: `http://localhost:8000/docs` · Frontend: `http://localhost:3000`

### Без Docker (для разработки одного компонента)

```bash
pip install -r backend/requirements.txt
# поднять postgres и redis локально
alembic -c backend/alembic.ini upgrade head
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Отдельно — celery-воркер:

```bash
celery -A backend.celery.app.celery_app worker --loglevel=info -P solo -Q high,moderation,default,low
celery -A backend.celery.app.celery_app beat --loglevel=info
```

## Переменные окружения

Минимум для запуска:

```env
DATABASE_URL=postgresql+asyncpg://lama:lama@postgres:5432/lama
REDIS_URL=redis://redis:6379/0
TELEGRAM_BOT_TOKEN=<токен мастер-бота, через @BotFather>
OPENAI_API_KEY=<опционально, для AI-генерации>
```

Опционально (S3-хранилище медиа):

```env
USE_CLOUD_STORAGE=true
S3_ENDPOINT_URL=https://storage.yandexcloud.net
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET_NAME=...
S3_REGION=ru-central1
CDN_URL=https://cdn.example.com
```

## Тесты

```bash
docker exec -it lama-backend python -m pytest backend/tests -v --tb=short
```

Сейчас: **316+ тестов в 4 доменах (`ad_revenues / publications / channel / bot`) за ~15 секунд**. Подробности — что покрыто, что нет, как добавлять — в [TESTING.md](TESTING.md).

## Архитектурные конвенции

### Use-case'ы (services/<domain>/features/)

Один файл — один класс с публичным `async def execute(...)`. Состояние не держим — только конструктор `__init__(self, db)` и методы. **Никаких `commit`** внутри use-case'а — коммитит роут / celery-task / тест.

### Lookup-хелперы

В каждой подпапке features/ есть `lookup.py` с `get_X` (возвращает Optional) и `find_X_or_404` (бросает HTTPException). Не дублировать запросы к БД — переиспользовать.

### Owner-проверки

Все use-case'ы для пользовательских сущностей принимают `owner_id` и фильтруют по нему. 404 если не найдено или принадлежит другому юзеру.

### Routes (FastAPI)

Тонкие — только маппинг HTTP ↔ use-case. На каждом эндпоинте `summary=`, на каждом `Query/Path/Body` параметре `description=` — для нормального Swagger.

### Telegram-интеграция

Только через `RateLimitedBot` из `services/telegram_client.py`. Резолв бота для канала — `services/bot_provider.resolve_for_channel / resolve_by_token / resolve_for_bot_id`. Обработка ошибок: `TelegramBadRequest / TelegramForbiddenError / TelegramRetryAfter` ловить явно.

### Celery-задачи

Лежат в `backend/celery/tasks.py`. Из use-case'ов вызываются **ленивым импортом внутри метода** — чтобы тесты не тянули celery при импорте сервиса.

### Schemas

Pydantic. Один домен — один пакет в `schemas/<domain>/` с реэкспортом через `__init__.py` для обратной совместимости (`from backend.schemas.publications import X` продолжает работать после разбиения).

## Как добавить новую фичу

1. Определи домен. Если фича про публикации — `services/publications/features/<subdomain>/`. Если про канал — `services/channel/features/<subdomain>/`. Если совсем новое — отдельный пакет.
2. Создай файл `<verb>_<noun>.py` с одним классом + `execute(...)`. Не commit'ить.
3. Если фича роутается — добавь эндпоинт в `routes/<domain>/<file>.py` с `summary=` и `description=`.
4. Если новый роутер — зарегистрируй его в `routes/<domain>/__init__.py` и в `main.py`.
5. Pydantic-схемы — в `schemas/<domain>/<topic>.py`, реэкспорт в `__init__.py`.
6. Тесты — `backend/tests/<domain>/test_<feature>.py` по примеру существующих.
7. Если фича дёргает Telegram / celery / redis — обязательно мок в тесте.

## Что НЕ делать

- Не вызывать `commit` внутри use-case'ов.
- Не хранить token бота в логах / уведомлениях.
- Не использовать приватные функции (`def _foo`) без необходимости — это часто признак неправильно нарезанного модуля.
- Не писать «дикие» SQL-запросы без `selectinload` для relationships — будут N+1.
- Не дёргать `bot.set_webhook` / `bot.delete_webhook` руками вне `CreateBot` / `DeleteBot` — webhook должен быть синхронизирован с БД.
- Не повторно реализовывать `get_channel` / `get_bot` / `find_publication_or_404` — пользоваться существующими хелперами в `utils/query_utils.py` или `features/<subdomain>/lookup.py`.

## Документация API

`http://localhost:8000/docs` — Swagger UI с актуальным списком эндпоинтов и schemas. Каждый эндпоинт имеет `summary=` и описания параметров.

## Endpoints верхнего уровня

| Префикс | Что |
|---|---|
| `/api/auth/*` | Регистрация / логин (email + Telegram OAuth) |
| `/api/publications/*` | CRUD публикаций, расписание, AI, серии, шаблоны, теги, шаринг |
| `/api/channels/*` | CRUD каналов + 14 разделов настроек (модерация, бэкап, ...) |
| `/api/bots/*` | CRUD ботов + команды/триггеры/recurring/auto-replies/welcome |
| `/api/ad-revenues/*` | Рекламный кабинет: доходы, расходы, статистика, экспорт |
| `/api/inbox/*` | События из каналов (вступления, выходы, модерация) |
| `/api/direct/*` | Прямые сообщения с ботами |
| `/api/webhook/{token}` | Приём апдейтов от Telegram (по одному эндпоинту на бота) |
| `/api/upload`, `/api/media-upload` | Загрузка файлов |
| `/api/landing` | Лендинги |
| `/api/kb` | База знаний (для AI-ответов) |
| `/api/link-preview` | Превью внешних ссылок |
