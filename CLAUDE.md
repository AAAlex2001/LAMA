# LAMA — Telegram Channel Management Platform

## Стек

- **Backend**: Python, FastAPI, SQLAlchemy (async), Alembic, Celery, PostgreSQL
- **Frontend**: Next.js (App Router), TypeScript, Redux Toolkit, SCSS Modules
- **Infra**: Docker, docker-compose

## Структура проекта

```
backend/
├── main.py                  # FastAPI app
├── config.py                # Settings, env vars (OPENAI_API_KEY, get_bot)
├── database.py              # AsyncSession, get_db
├── models/                  # SQLAlchemy models
│   ├── auth.py              # User
│   ├── channels.py          # ChannelGroup, ModerationRule, AutoDeleteSettings, InviteLink, ActionType, LinkFilterMode
│   ├── publications.py      # Publication, Tag, TelegramMessage, PublicationSeries, PublicationNotification
│   ├── bots.py              # TelegramBot
│   └── landing.py           # Landing pages
├── schemas/
│   ├── auth.py
│   ├── bots.py
│   ├── channels/            # Разбито по доменам (enums, channel, sync, backup, moderation, antispam, flood, auto_delete, invite_links)
│   │   ├── __init__.py      # Реэкспорт всех схем — обратная совместимость import from backend.schemas.channels
│   │   ├── enums.py         # ChannelType, BackupMode, BackupStatus
│   │   ├── channel.py       # ChannelGroupBase/Create/Update/Response, ChannelTelegramUpdate, ChannelPermissionsUpdate
│   │   ├── sync.py          # SyncChannelRequest/Response
│   │   ├── backup.py        # BackupModeUpdateRequest, BackedUpPost*, BackupJob*, RestoreBackup*, ChannelStatsResponse
│   │   ├── moderation.py    # ChannelModerationRule*
│   │   ├── antispam.py      # AntispamSettings*
│   │   ├── flood.py         # FloodSettings*
│   │   ├── auto_delete.py   # ChannelAutoDeleteSettings*
│   │   └── invite_links.py  # InviteLink*
│   ├── publications/        # Разбито по доменам (enums, ai, templates, series, publishing, etc.)
│   └── landing.py
├── routes/
│   ├── auth.py              # get_current_user
│   ├── channels/            # По домену: crud, sync, backup, moderation, protection, invite_links, telegram_settings
│   │   ├── dependencies.py  # DI: get_channel_service, get_sync_service, get_backup_service, etc.
│   │   └── ...
│   ├── publications/        # По домену: crud, ai, calendar, publishing, series, sharing, templates, tags
│   │   ├── dependencies.py  # DI: get_publication_service, get_create_service, get_query_service, get_template_service, get_sharing_service, get_ai_service, get_series_service
│   │   └── ...
│   ├── bots.py
│   ├── webhook.py
│   └── ...
├── services/
│   ├── channel/             # По домену: channel_service, sync_service, backup_service, backup_job_service, moderation_service, antispam_service, flood_service, auto_delete_service, night_mode_service, telegram_settings_service, invite_link_service, retransmit_service
│   │   ├── utils/           # query_utils (shared get_channel), chat_data_utils, bot_utils, link_utils, media_utils, message_utils
│   │   └── ...
│   ├── publications/        # publication_service (оркестратор ~150 строк), publication_create_service, publication_query_service, publication_update_service, calendar_service, ai_service, template_service, sharing_service, series_service, publisher, message_editor, etc.
│   └── telegram_client.py   # RateLimitedBot
├── celery/
│   └── tasks.py             # publish_task, delete_messages_task, republish_task (используют PublicationService)
└── alembic/                 # Миграции

frontend/
├── app/[locale]/
│   ├── calendar/
│   │   ├── components/      # CalendarPageConnected, CalendarMainContent, CalendarHeader, DayCalendarView, ListCalendarView, MonthCalendarView, WeeklyCalendarView, CalendarCard, WeeklyCard
│   │   ├── store/           # Redux slice, selectors, thunks
│   │   │   └── useInView/   # IntersectionObserver хук (useInView, useOnInView, observe) — используется для infinite scroll
│   │   └── utils/           # calendar-helpers, post-helpers (formatCompact, etc.), media-helpers, filterPosts, buildFilterConfigs
│   ├── create-post/
│   ├── drafts/
│   ├── profile/
│   └── ...
├── components/
│   ├── icons/               # Все иконки (CalendarRepeatIcon, QuizIcon, PhotoIcon, VideoIcon, etc.)
│   ├── date-picker/
│   ├── post-preview-modal/
│   └── ...
└── ...
```

## Архитектурные паттерны

### Backend

- **Прямая инжекция сервисов** (НЕ фасад): Routes инжектят нужные сервисы напрямую через `Depends(get_xxx_service)`. Нет прокси-методов.
- **PublicationService** — оркестратор для операций с кросс-сервисной логикой: get+HTTPException, update/delete (get+updater), calendar (query+timezone grouping), edit_with_ai (get+ai+commit), publish_now/republish/edit_published/delete_messages. ~150 строк.
- **Shared utils**: `services/channel/utils/query_utils.py` — общие `get_channel()`, `get_channel_by_telegram_id()` (используется 7+ сервисами вместо дублирования).
- **Schemas**: Разбиты на модули по доменам. `__init__.py` реэкспортирует для обратной совместимости.

### Frontend (Calendar)

- **Infinite scroll**: Использует `useInView` хук из `store/useInView/`. Sentinel-элемент в конце списка, `useEffect` вызывает `onLoadMore` при `inView === true`.
- **WeeklyCalendarView**: Отдельный `DaySentinel` компонент для каждого дня (обходит правило хуков в цикле).
- **Иконки повторяющихся**: `CalendarRepeatIcon` (НЕ ArrowsSpinIcon).
- **Статистика**: `formatCompact()` возвращает `"0"` при отсутствии данных (НЕ "—").
- **Опросы**: `QuizIcon` отображается при `post.poll_data?.question` в MediaIcons и DraftContentIcons.

## Важные правила

- Триггеры и сервисы НЕ используют `**kwargs`
- `get_channel` — только через `query_utils`, не дублировать в сервисах
- Routes используют прямую инжекцию сервисов, НЕ через фасад PublicationService (кроме операций с кросс-сервисной логикой)
- Все `from backend.schemas.channels import X` работают через `__init__.py` реэкспорт
