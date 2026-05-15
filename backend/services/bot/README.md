# services/bot

Логика работы с Telegram-ботом: CRUD + welcome / auto-replies / commands / triggers (включая расписания) / recurring сообщения / модерация в группах / messaging (DM + broadcast) / captcha / auto-approval join-request'ов.

## Модели

| Файл | Таблица | Назначение |
|---|---|---|
| [models/bots.py](../../models/bots.py) → `Bot` | `bots` | Сам бот: токен, webhook, welcome-настройки, авто-одобрение, captcha-режим. |
| ↳ `BotCommand` | `bot_commands` | Команды бота (/start, /help, custom). |
| ↳ `AutoReply` | `auto_replies` | Авто-ответы по триггеру (текст → ответ). |
| ↳ `Trigger` | `triggers` | Триггеры на события (новый участник, расписание, медиа и т.д.). |
| ↳ `RecurringMessage` | `recurring_messages` | Повторяющиеся рассылки в чаты по расписанию. |
| ↳ `BotMessage` | `bot_messages` | Лог всех сообщений бота (входящих и исходящих). |
| ↳ `PendingCaptcha` | `pending_captchas` | Активные капчи для новых участников. |

## Структура каталога

Сервис разбит на 10 подпапок:

| Подпапка | Что внутри |
|---|---|
| `features/crud/` | CRUD ботов: create (с webhook), update (синк имени/описания в TG), delete, activate/deactivate, sync_from_telegram, фото бота. |
| `features/commands/` | CRUD команд + поиск команды по тексту сообщения. |
| `features/triggers/` | Большая папка с тремя подпапками: `crud/`, `fire/` (срабатывание триггера на событие), `schedule/` (отложенные SCHEDULE-триггеры через celery), `actions/` (ban / mute / send_message / send_media / remove). |
| `features/recurring/` | Повторяющиеся сообщения: создание/обновление, расчёт `next_send_at`, отправка в `target_chats`. |
| `features/welcome/` | Отправка welcome-сообщения новому участнику с шорткодами. |
| `features/auto_replies/` | CRUD авто-ответов + поиск по тексту + проверка частоты срабатывания + логи. |
| `features/moderation/` | Команды модерации в группах: `/ban`, `/mute`, `/admin` и т.д. Парсинг target'а и времени. |
| `features/messaging/` | Отправка сообщения от бота (DM) + broadcast по всем подписчикам + список сообщений + статистика. |
| `features/captcha/` | Математическая капча для новых участников. |
| `features/settings/` | Обновление welcome-настроек, auto-approval, проверка критериев для approval. |
| `bot_shortcodes.py` | Рендеринг шорткодов вида `{user_name}`, `{chat_name}` в тексте сообщений. |

## Особые места

- **Webhook автоматический**: при `CreateBot` поднимается через `SetWebhook` (см. `services/webhook/`). При `DeleteBot` — снимается. Не забыть про это при ручной миграции.
- **Owner-проверки**: все use-case'ы (CRUD команд, триггеров, recurring, auto-replies) поддерживают `owner_id` для проверки владения ботом. `find_bot_or_404` — общий хелпер.
- **Триггеры — три модуля**:
  - `crud/` — управление триггерами от пользователя (POST/PUT/DELETE).
  - `fire/` — runtime: при событии (новый член, сообщение и т.д.) `get_active` + `matchers` + `execute_trigger` запускает action.
  - `schedule/` — для триггеров с `delay_minutes > 0`: ставит celery-задачу с `countdown`, потом `execute_scheduled_task` запускает.
- **Recurring messages**: отдельный celery-beat пробуждает каждую минуту и зовёт `SendRecurring` для всех с `next_send_at <= now`. Поддерживает weekday-фильтр и окно `time_from-time_to` в TZ пользователя.
- **Авто-ответы**: матч по тексту с учётом скоупа (DM / group / supergroup / конкретный канал), проверка `frequency_check` (раз в N минут на чат/юзера), запись в `auto_reply_trigger_logs`.
- **Welcome шорткоды**: `{user_first_name}`, `{user_mention}`, `{chat_name}`, `{rules_url}` — раскрываются через `ShortcodeProcessor` перед отправкой.
- **Captcha**: при включённой `captcha_mode=MATH` бот шлёт `generate_captcha` (вопрос+ответ) и кладёт `PendingCaptcha` с TTL. По таймауту юзер кикается или ограничивается.
- **Auto-approval join-request'ов**: бот может автоматически одобрять заявки на вступление, если выполнены `approval_criteria` (например, подписан на канал X, прошло Y минут после регистрации в TG).

## Поток данных при срабатывании триггера

```
[ webhook: новое сообщение / новый участник в чате ]
        ↓
   handle_incoming_message / handle_new_member (см. routes/webhook/)
        ↓
   GetActiveTriggers (по типу события + bot_id)
        ↓
   match_trigger (фильтры: chat_type, текст, время суток)
        ↓
   if delay_minutes > 0:
       ScheduleTrigger → celery countdown
   else:
       ExecuteTrigger → action (ban / mute / send_message / send_media)
        ↓
   SaveTriggerMessage (логи срабатываний)
```

## Поток данных при создании бота

```
[ user вводит токен в форме ]
        ↓
   CreateBot.execute:
      • fetch_bot_info (вызывает getMe + getMyDescription через httpx)
      • guard_duplicates (400 если уже у юзера, 409 если у другого)
      • вставка Bot
      • SetWebhook (ставит URL в TG)
        ↓
   Сохранён в БД с активным webhook → готов принимать события.
```

## Конвенции

- **Один файл — один class с `execute(...)`**.
- **Owner-проверки**: используй `find_bot_or_404(db, bot_id, owner_id=...)` чтобы не дублировать.
- **Telegram API**: дёргается через `RateLimitedBot` из `services/telegram_client.py`. Резолв бота — через `services/bot_provider.resolve_by_token / resolve_for_bot_id / resolve_for_channel`.
- **Не commit'ить в use-case'ах** — это работа роута / celery-таска / теста.
- **Lookup-хелперы в каждой подпапке**: `lookup.py` содержит `get_X` / `find_X_or_404` / `ensure_bot_exists`.

## Как добавить новую фичу

1. Если фича про команды бота — `features/commands/`. Про авто-ответы — `features/auto_replies/`. Про новый тип триггера — `features/triggers/{crud,fire}/`.
2. Создай файл `features/<subdomain>/<verb>_<noun>.py`.
3. Класс с docstring (1–2 строки), `__init__(self, db)`, `async def execute(...)`.
4. Если фича роутается — добавь эндпоинт в соответствующий `routes/bots/<file>.py` с `summary=` и `description=`.
5. Зарегистрируй роутер в `routes/bots/__init__.py`, если он новый.

## Что НЕ делать

- Не вызывать `bot.send_message` руками из use-case'а — всё через `RateLimitedBot` и `dispatch_telegram` (есть rate-limiter, retries).
- Не хранить токен бота в логах / уведомлениях — это секрет.
- Не забывать обработать `TelegramBadRequest / TelegramForbiddenError / TelegramRetryAfter` при вызовах TG API — иначе один битый бот валит всю фичу.
- Не дёргать `SetWebhook` / `DeleteWebhook` руками вне `CreateBot` / `DeleteBot` — webhook должен быть синхронизирован с состоянием бота в БД.
