# services/channel

Всё что связано с каналом/группой Telegram — синхронизация с TG, бэкапы, ретрансляция, модерация, антиспам, флуд-контроль, ночной режим, капча, инвайт-ссылки, инфо-сообщения, форум-темы, права участников.

Самый большой домен в проекте: ~90 use-case'ов в 17 подпапках, 16 роут-файлов.

## Модели

| Файл | Таблица | Назначение |
|---|---|---|
| [models/channels.py](../../models/channels.py) → `ChannelGroup` | `channel_groups` | Канал/группа. Тащит в себе все настройки модерации (плоско, для скорости): антиспам, флуд, ночной режим, капча, авто-удаление, бэкап, разрешения участников. |
| ↳ `ChannelModerationRule` | `channel_moderation_rules` | Правило модерации: запрещённая фраза + действие (kick / mute / delete / ban). |
| ↳ `AutoDeleteSettings` | `auto_delete_settings` | Настройки автоудаления (вынесены отдельно, потому что широкие). |
| ↳ `InviteLink` | `channel_invite_links` | Invite-ссылки канала (зеркало того что в Telegram). |
| ↳ `BackedUpPost` | `backed_up_posts` | Снятая с канала копия поста (медиа, текст, метрики). |
| ↳ `PostRetransmission` | `post_retransmissions` | Лог ретрансляции бэкапнутого поста в другой канал. |
| ↳ `ChannelSubscribersSnapshot` | `channel_subscribers_snapshots` | Снимки числа подписчиков канала во времени (см. также [services/ad_revenues/](../ad_revenues/README.md)). |
| ↳ `ForumTopic` | `forum_topics` | Темы супергруппы (зеркало TG). |
| `models/channels.py` → `ChannelInfoMessage` | `channel_info_messages` | Инфо-сообщения канала (приветствия, FAQ, авто-ответы). |

## Структура каталога

Каждая подпапка в `features/` — отдельная функциональная область:

| Подпапка | Что внутри |
|---|---|
| `features/crud/` | Создание/обновление/удаление/список каналов, очистка связей при удалении бота. |
| `features/sync/` | Подтянуть канал из Telegram по username/invite/telegram_id, валидация прав бота. |
| `features/backup/` | Сохранять копии постов (`save_post`), статистика, режим бэкапа (`update_mode`), список бэкапнутых постов. |
| `features/backup_jobs/` | Фоновые job-ы массового бэкапа (создание, лист, фильтрация постов, обработка через celery). |
| `features/retransmit/` | Ретрансляция бэкапнутого поста в целевой канал (для instant-режима). |
| `features/moderation_rules/` | CRUD правил модерации + проверка сообщения на запрещённые фразы. |
| `features/antispam/` | Фильтр ссылок (whitelist / blacklist / только t.me / блок всех). |
| `features/flood/` | Лимит сообщений в окне времени + redis-замок «уже забанен» для дедупа. |
| `features/banned_words/` | Toggle фильтра запрещённых слов (сам список лежит в `ChannelGroup`). |
| `features/captcha/` | Капча для новых участников + действия при провале. |
| `features/auto_delete/` | Автоудаление сообщений по таймеру. |
| `features/night_mode/` | Ночной режим (окно часов, что блокировать). |
| `features/media_block/` | Блокировка отдельных типов медиа (стикеры, гифки, голосовые и т.д.). |
| `features/invite_links/` | CRUD invite-ссылок, синк с Telegram, revoke. |
| `features/info_messages/` | Инфо-сообщения канала (приветствия, FAQ, авто-ответы). |
| `features/forum_topics/` | Темы форум-группы (зеркало TG). |
| `features/quick_commands/` | Быстрые команды бота в канале. |
| `features/permissions/` | Применить permissions к каналу через Telegram API. |
| `features/telegram_settings/` | Прямые операции с каналом в TG: обновить заголовок/фото, закрепить/открепить, установить permissions. |

## Конвенции

- **Один файл — один class с `execute(...)`**. Состояние не держим.
- **Хелперы поиска** — общие `get_channel`, `find_channel_or_404`, `get_channel_by_telegram_id` лежат в [utils/query_utils.py](utils/query_utils.py). Не дублировать в каждом сервисе.
- **Утилиты для работы с TG-чатами** — `utils/chat_data_utils.py` (нормализация ChatFullInfo), `utils/message_utils.py` (форматирование сообщений), `utils/media_utils.py` (извлечение media_file_ids из Message), `utils/link_utils.py` (парсинг invite-ссылок).
- **Не вызывать `commit`** — это работа роута / celery-таска / теста.
- **Telegram API дёргаем через `RateLimitedBot`** из [services/telegram_client.py](../telegram_client.py). Резолв бота для канала — через [services/bot_provider.py](../bot_provider.py) (`resolve_for_channel`).
- **Бот может быть не привязан** — большинство операций должно либо требовать `bot_id`, либо валидно отказывать ("Bot is disabled for this channel"). См. [features/sync/validate_access.py](features/sync/validate_access.py).

## Особые места

- **Backup-режимы**: канал может быть в режиме `DISABLED / ENABLED / INSTANT / POST_FACTUM`. `ENABLED` — бот пишет копию каждого нового поста в БД. `INSTANT` — сразу же ретранслирует в `backup_target_ids`. `POST_FACTUM` — копия в БД + ретрансляция при необходимости вручную. Подробно в [features/backup/save_post.py](features/backup/save_post.py).
- **Backup post-types фильтрация**: `backup_post_types` (`text_posts / with_buttons / with_attachments`) + `backup_content_types` (`photo / video / document / animation`) определяют какие посты вообще попадают под backup/retransmit. Проверка в `features/publishing/handle_backups.py:should_retransmit` (см. [services/publications/](../publications/README.md)).
- **`features/flood/banned_user_lock.py`** — redis-замок «уже забанен», TTL по умолчанию 10 минут. Нужен чтобы при флуде один и тот же юзер не банился многократно (несколько событий приходят одновременно).
- **`features/moderation_rules/check_message`** — линейный проход по правилам с `.lower()`. На больших объёмах надо будет делать full-text search или Aho-Corasick, но пока сойдёт.
- **`features/sync/sync_channel.py`** — резолвит chat либо по telegram_id, либо по username, либо по invite_link. Если не передан `bot_id` — берёт бота из `TELEGRAM_BOT_TOKEN` (системный) и регистрирует его у пользователя.

## Поток данных при модерации сообщения

```
[ webhook: новое сообщение в канале ]
        ↓
   handle_incoming_message (см. backend/routes/webhook/telegram.py)
        ↓
   1. is_banned (redis)?           → пропустить если уже забанен
   2. CheckUserFlood               → флуд?
   3. CheckMessageAgainstRules     → запрещённая фраза?
   4. antispam (link filter)       → подозрительная ссылка?
   5. banned_words                 → запрещённое слово?
   6. captcha (для новых)          → ещё не прошёл капчу?
        ↓
   при нарушении → apply_action (delete / mute / kick / ban)
        ↓
   mark_banned (redis) если ban
```

## Поток данных при синхронизации канала

```
[ user добавил бота в канал и нажал «синхронизировать» ]
        ↓
   resolve_chat_identifier (telegram_id / @username / invite_link → unified id)
        ↓
   resolve_by_token / GetOwnedBot → берём токен бота
        ↓
   ValidateChatAccess              → бот действительно может читать канал?
        ↓
   bot.get_chat → ChatFullInfo
        ↓
   build_chat_data → нормализация полей
        ↓
   SaveSyncedChannel → upsert ChannelGroup
```

## Как добавить новую фичу

1. Определи подпапку. Если фича про настройку канала — отдельная папка в `features/<feature_name>/`. Если про работу с Telegram API — скорее всего `features/telegram_settings/`.
2. Создай файл `features/<subdomain>/<verb>_<noun>.py`.
3. Один класс, docstring (1–2 строки), `__init__(self, db)`, `async def execute(...)`.
4. Если фича роутается — добавь эндпоинт в `routes/channels/<subdomain>.py` с `summary=` и `description=`.
5. Если эндпоинт новый — зарегистрируй его в `routes/channels/__init__.py`.
6. Тесты — `backend/tests/channel/<subdomain>/test_<verb>_<noun>.py`.

## Что НЕ делать

- Не писать в БД напрямую из веб-хука Telegram — только через use-case'ы (есть тонкости с миграциями и атомарностью).
- Не дёргать `bot.get_chat_member_count` или `bot.get_chat` без обработки `TelegramAPIError` и `TelegramForbiddenError` — бот может выпасть из канала в любой момент.
- Не дублировать `get_channel` логику в новом сервисе — пользоваться `utils/query_utils.get_channel`.
- Не хранить тяжёлые JSON-ответы Telegram в `ChannelGroup` напрямую — для этого есть `BackedUpPost.raw_data`.
