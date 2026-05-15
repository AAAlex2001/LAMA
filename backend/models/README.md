# models/

SQLAlchemy 2.0 ORM модели (`Mapped[...]` + `mapped_column`). Каждый модуль — один домен; `Base` общий для всех (через [base.py](base.py)). Все модели регистрируются вызовом [`load_models()`](__init__.py) — это нужно для разрешения forward-ссылок в `relationship("StringName")`.

## Карта моделей

| Файл | Главная модель | Дополнительные | Enums |
|---|---|---|---|
| [auth.py](auth.py) | `User` | `TelegramAccount`, `UserSession`, `BotLoginCode` | `UserRole` |
| [bots.py](bots.py) | `Bot` | `BotMessage`, `BotCommand`, `BotCommandButtonClick`, `AutoReply`, `AutoReplyLog`, `PendingApproval`, `PendingJoinApproval`, `Trigger`, `ScheduledTriggerTask`, `RecurringMessage`, `RecurringMessageLog` | `BotStatus`, `TriggerType`, `TriggerActionType`, `ApprovalMode`, `ApprovalDestination`, `CaptchaMode`, `MessageType`, `TriggerChatType`, `CommandScope`, `RecurringMessageInterval` |
| [channels.py](channels.py) | `ChannelGroup` | `BackedUpPost`, `PostRetransmission`, `BackupJob`, `ChannelModerationRule`, `ChannelAutoDeleteSettings`, `ChatInviteLink`, `ForumTopic`, `InformationalMessage`, `ChannelSubscribersSnapshot` | `ChannelType`, `BackupMode`, `BackupStatus`, `ActionType`, `LinkFilterMode`, `CaptchaFailAction` |
| [publications.py](publications.py) | `Publication` | `PublicationSeries`, `Tag`, `TelegramMessage`, `PublicationNotification`, `TextTemplate`, `ButtonClick` | `PublicationStatus`, `ContentType`, `RepeatInterval` |
| [direct.py](direct.py) | `DirectChat` | — | — |
| [inbox.py](inbox.py) | `InboxEvent` | — | (использует `InboxCategory`, `EntityType`, `EventType`, `EventStatus` из `schemas/inbox/enums.py`) |
| [ad_revenues.py](ad_revenues.py) | `AdRevenue` | — | — |
| [landing.py](landing.py) | `LandingSection` | `LandingContent`, `Template`, `TemplateContent` | `ContentType`, `SectionType`, `Locale` |
| [knowledge_base.py](knowledge_base.py) | `KBCategory` | `KBArticle` | — |
| [base.py](base.py) | `Base` (DeclarativeBase) | — | — |

## Граф владельца (cascade-удаления)

Каскады идут от `User`. Удаление юзера сносит весь его контент:

```
User
├── TelegramAccount (1:1, cascade delete)
├── UserSession    [] (cascade)
├── Bot            [] (cascade)
│    ├── BotMessage []
│    ├── BotCommand []
│    ├── AutoReply []
│    ├── Trigger []
│    │    └── ScheduledTriggerTask []
│    ├── RecurringMessage []
│    │    └── RecurringMessageLog []
│    ├── PendingApproval []
│    ├── DirectChat []
│    └── (используется в) ChannelGroup.bot_id
├── ChannelGroup   [] (cascade)
│    ├── BackedUpPost []
│    ├── BackupJob []
│    ├── ChatInviteLink []
│    ├── ChannelModerationRule []
│    ├── ForumTopic []
│    ├── InformationalMessage []
│    └── ChannelSubscribersSnapshot []
├── Publication    [] (cascade)
│    ├── TelegramMessage []
│    ├── ButtonClick []
│    └── PublicationNotification []
├── PublicationSeries []
├── TextTemplate []
├── Tag []
├── InboxEvent []
├── AdRevenue []
└── KBArticle (только feedback counter)
```

## Ключевые детали

### `Base`

[base.py](base.py) — `DeclarativeBase` для всех моделей. Никаких mixins сейчас нет (ad-hoc `created_at` / `updated_at` в каждой модели).

### `load_models()` ([__init__.py](__init__.py))

Импортирует все модули моделей по очереди — нужно ДО `Base.metadata.create_all` чтобы SQLAlchemy мог разрешить `relationship("StringName", back_populates="...")`. Тесты вызывают её в `engine` fixture.

### `User` ([auth.py](auth.py))

Один аккаунт может быть привязан и к Telegram (`TelegramAccount`), и к email/паролю одновременно. Поле `email_verified` есть, но в текущей версии нигде не выставляется в `True` (флоу верификации не реализован).

`BotLoginCode` — одноразовый код, который генерит бот для логина юзера через сайт. TTL по умолчанию 5 минут, после redeem помечается `is_used=True`.

### `Bot` ([bots.py](bots.py))

Каждый бот принадлежит одному юзеру. Уникален по `(owner_id, telegram_id)`. `token` хранится в открытом виде (нет шифрования в БД). `status` управляет включением webhook'а и обработкой апдейтов.

`BotMessage` — все DM-сообщения бота (входящие и исходящие). Уникальный по `(bot_id, telegram_message_id, chat_id)`. `raw_data` (JSONB) хранит полный aiogram-объект для последующего разбора.

`TriggerType` — enum того что МОЖЕТ запустить триггер: `MEMBER_JOINED`, `USER_MESSAGE`, `JOIN_REQUEST_CREATED`, `JOIN_REQUEST_APPROVED`, `JOIN_REQUEST_REJECTED`, `MEMBER_LEFT`, `CAPTCHA_PASSED`, `CAPTCHA_FAILED`, `COMMAND_CALLED`.

`PendingApproval` — заявки на вступление в чат, где боту нужно одобрить. Содержит `captcha_question` + `captcha_answer` если бот настроен с капчей.

### `ChannelGroup` ([channels.py](channels.py))

Канал или группа, к которой подключён бот. `channel_type` (SUPERGROUP / CHANNEL / FORUM) определяет какие операции возможны. `linked_chat_id` — для каналов с привязанной discussion-группой (там комментарии).

`BackupMode`: `OFF` / `MIRROR` (все сообщения переотправлять в другой канал) / `STORE` (хранить только в БД).

`ChatInviteLink` — приглашения с per-link metrics. Поле `member_count` инкрементится через [increment_invite_member_count](../services/webhook/features/join_requests/increment_invite_member_count.py).

`ChannelSubscribersSnapshot` — снапшоты числа подписчиков (для ad_revenues и графиков). Берутся раз в 24 часа через celery-таск.

### `Publication` ([publications.py](publications.py))

Главная сущность системы публикаций. `status` (DRAFT / SCHEDULED / PUBLISHED / FAILED) + богатый контент (`text_content`, `media_urls[]`, `inline_keyboard`, `poll_data`). Поддерживает `RepeatInterval` (NEVER / DAILY / WEEKLY / MONTHLY / YEARLY / CUSTOM).

`TelegramMessage` — связка `Publication ↔ ChannelGroup` с `telegram_message_id`. После отправки публикации в N каналов получаем N строк TelegramMessage. Используется для delete/edit.

`ButtonClick` — клик по inline-кнопке публикации. Уникальный по `(publication_id, button_id, tg_user_id)` — идемпотентный счётчик.

`Tag` уникален по `(owner_id, name)`, цвет можно менять.

### `DirectChat` ([direct.py](direct.py))

DM-чат между ботом и подписчиком. Уникальный индекс `(bot_id, tg_chat_id)`. `unread_count` инкрементится при входящем, сбрасывается при открытии фронтом. `last_message_*` поля — превью для списка чатов.

### `InboxEvent` ([inbox.py](inbox.py))

Единая лента событий. Полиморфная по `category` + `entity_type` + `event_type`. `payload` (JSONB) хранит специфичные для типа поля: `link_url`, `chat_id`, `message_id`, `trigger_names`, `reason_source`, `handled` flag и т.д.

Индексы заточены под типовые выборки: по `(owner_id, status, created_at)` и `(owner_id, category, created_at)`.

### `AdRevenue` ([ad_revenues.py](ad_revenues.py))

Учёт рекламных доходов. Поля: канал, дата, сумма, валюта, ссылка на пост (опц.), buyer, ad_note. Может быть привязан к `Publication.is_ad=True` (см. `services/ad_revenues/features/list_ad_revenues.py` про синтетические записи с отрицательным id).

### `LandingSection` + `LandingContent` ([landing.py](landing.py))

Контент сайта — две таблицы:
- `landing_sections`: одна строка на секцию (HERO, FAQ, ...), `section_type` уникален.
- `landing_contents`: key-value поля локализованы по `locale` (RU/SR/EN). Ключи могут быть нумерованные (`hero_image_landing_1`, ...).

`save_*` сервисы делают полную замену контента для текущей локали (`DELETE WHERE section_id=? AND locale=?` + INSERT).

`Template` + `TemplateContent` — отдельная схема для slug-based посадочных страниц. JSON-контент (blocks, faq, cards) хранится прямо в `TemplateContent.content`.

### `KBArticle` + `KBCategory` ([knowledge_base.py](knowledge_base.py))

База знаний. Категории с slug, статьи с `sections[]` (JSON-блоки), счётчики `helpful_count` / `unhelpful_count`.

## SQL-специфики

### JSONB (Postgres-only)

Используется в:
- `BotMessage.raw_data`
- `Publication.formatted_content`, `media_urls`, `media_file_ids`, `media_blur`, `inline_keyboard`, `poll_data`, `repeat_*`, `tag_colors`
- `InboxEvent.payload`
- `Trigger.payload`, `actions`
- `RecurringMessage.payload`
- `LandingContent.content` (Template)
- `KBArticle.sections`, `meta_breadcrumbs`

В тестах используется `@compiles(JSONB, "sqlite")` shim → JSON.

### Postgres `pg_insert(...).on_conflict_do_nothing()`

Используется в:
- `services/webhook/features/callbacks/publications/track_button_click.py` — упрощает идемпотентность.
- `services/channel/features/auto_delete/get_settings.py` — для `ChannelAutoDeleteSettings.ensure_exists`.

В тестах **частично** работает, но местами требует обхода. Документировано в [backend/TESTING.md](../TESTING.md).

### `timezone()`, `to_char()`, `EXTRACT()`

Используются в `services/publications/features/calendar/get_day_counts.py`. В тестах патчатся через `dbapi_connection.create_function("timezone", ...)`.

### tz-aware datetime

ВСЕ `DateTime(timezone=True)`. Дефолты — `lambda: datetime.now(timezone.utc)`. SQLite теряет tz при чтении, поэтому в коде есть defensive `if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)` (например в [redeem_bot_login_code.py](../services/auth/features/bot/redeem_bot_login_code.py)).

## Где какие модели используются

См. соответствующие README сервисов:
- [services/auth/README.md](../services/auth/README.md) — User, TelegramAccount, UserSession, BotLoginCode
- [services/bot/README.md](../services/bot/README.md) — Bot, BotCommand, AutoReply, Trigger, PendingApproval
- [services/channel/README.md](../services/channel/README.md) — ChannelGroup и спутники
- [services/publications/README.md](../services/publications/README.md) — Publication, Tag, TelegramMessage
- [services/direct/README.md](../services/direct/README.md) — DirectChat, BotMessage
- [services/inbox/README.md](../services/inbox/README.md) — InboxEvent
- [services/ad_revenues/README.md](../services/ad_revenues/README.md) — AdRevenue
- [services/landing/README.md](../services/landing/README.md) — LandingSection, Template
- [services/webhook/README.md](../services/webhook/README.md) — все модели через runtime событий

## Миграции

Все изменения схемы — через Alembic ([backend/alembic/](../alembic/)). Файлы миграций в [versions/](../alembic/versions/). Никогда не править таблицы напрямую — всегда `alembic revision --autogenerate -m "..."` + ревизия + `alembic upgrade head`.
