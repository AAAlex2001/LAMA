# services/webhook

Runtime приёма всех событий от Telegram: входящие сообщения, callback-кнопки, заявки на вступление, изменения участников, реакции, опросы. Самый большой и самый критичный домен — ~90 use-case'ов в 13 подпапках.

## Точки входа

| Файл | Что |
|---|---|
| [routes/webhook/telegram.py](../../routes/webhook/telegram.py) | Единственный HTTP-эндпоинт: `POST /api/telegram/webhook/{bot_token}`. Telegram шлёт сюда апдейты. |
| `features/intake/receive_telegram_webhook.py` | Валидирует секрет, парсит update, ставит в очередь и сразу отдаёт `{"ok": true}`. |
| `features/intake/enqueue_telegram_update.py` | Запускает `RouteTelegramUpdate` через `asyncio.create_task` (НЕ через celery). |
| `features/dispatch/route_telegram_update.py` | Главный маршрутизатор: резолвит бота, выбирает ветку (сообщение / callback / join-request / chat_member / my_chat_member). |

## Поток данных

```
[ Telegram → POST /api/telegram/webhook/{bot_token} ]
        ↓
   ReceiveTelegramWebhook:
     • ValidateWebhookSecret (заголовок X-Telegram-Bot-Api-Secret-Token)
     • GetTelegramUpdate (парсит JSON в aiogram.Update)
     • EnqueueTelegramUpdate → asyncio.create_task
        ↓
   [ HTTP-ответ {"ok": true} Telegram'у — мгновенно ]
        ↓
   (в фоне)
   RouteTelegramUpdate:
     • ResolveBotContext (бот по token / по chat для group)
     • если bot.status == INACTIVE — выход
     • /start, /guest — отдельный быстрый ответ
     • для групп/каналов: CheckMessage (модерация) → если заблокировано, выход
     • Update.chat_join_request   → RouteJoinRequest
     • Update.message             → RouteMessage.save + after_save
     • Update.callback_query      → RouteCallback (по префиксу callback_data)
     • Update.chat_member         → ClearBanLockOnUnban + UpdateSubscription
     • Update.my_chat_member      → SyncBotMembership
        ↓
   (если save вернул ws-событие)
   ws_manager.broadcast_chat_update → клиенты с открытым WebSocket'ом видят сообщение мгновенно
```

## Структура каталога

Каждая подпапка — отдельная ветка обработки апдейта:

| Подпапка | Что обрабатывает |
|---|---|
| `features/intake/` | Приём webhook-запроса: валидация секрета, парсинг update, постановка в asyncio task. |
| `features/dispatch/` | Главный маршрутизатор + helpers `get_update_message` / `get_update_chat_id`. |
| `features/bot_context/` | Резолв какому именно боту адресован update (по токену из URL или по чату для group-апдейтов). |
| `features/bot_membership/` | Синк статуса бота в чате (добавили/выгнали администратора). |
| `features/messages/` | Сохранение сообщения (DM / group / channel comment / forum topic), запуск авто-ответов и триггеров, метаданные чата. |
| `features/callbacks/` | Обработка нажатий inline-кнопок: captcha, admin-action, hidden_text для публикаций и команд. |
| `features/commands/` | `/start`, `/guest`, кастомные команды бота, claim-команды для админов. |
| `features/members/` | События входа/выхода участника, обновление профиля. |
| `features/join_requests/` | Заявки на вступление в канал/группу: проверка подписок, капча, авто-одобрение. |
| `features/captcha/` | Капча в личке (callback-кнопкой) и в группе (callback в чате). |
| `features/moderation/` | Применение модерационных действий из правил: ban / mute / kick / delete. |
| `features/subscriptions/` | Обновление статуса подписки на канал; отслеживание подсчёта новых участников по invite-ссылкам. |
| `features/welcome/` | Отправка welcome-сообщения новому участнику. |
| `features/settings/` | `SetWebhook` / `DeleteWebhook` / `GetWebhookInfo` — для CRUD ботов. |

## Особые места

### Асинхронная обработка через asyncio (НЕ celery)

`EnqueueTelegramUpdate` запускает `RouteTelegramUpdate` через `asyncio.create_task` в том же процессе FastAPI. Это даёт быстрый ответ Telegram'у (< 30 сек — лимит TG) и не требует celery для основной массы апдейтов.

**Минусы**: если backend перезапустить во время обработки — задача потеряется. Телеграм через 60 сек ретрит, так что для важных событий получим вторую попытку. Идемпотентность — на стороне use-case'ов (`save_pending_approval`, `save_private_message` пишут с проверкой что такое сообщение/заявка ещё не были обработаны).

**Celery используется** только для отложенных действий: `take_channel_subscribers_snapshot` (рекламный кабинет), `process_backup_job` (бэкап), `delete_publication_messages`, `publish_publication`. Сам webhook-цикл их не вызывает напрямую.

### Маршрутизация callback-кнопок по префиксу

`RouteCallback` диспатчит по началу `callback_data`:

| Префикс | Куда |
|---|---|
| `group_captcha_` | `CheckGroupCaptcha` |
| `captcha_` | `CheckPrivateCaptcha` |
| `admincall_` | `ExecuteAdminAction` |
| `hidden_text:` | `ShowPublicationHiddenText` (раскрывает скрытый блок в посте) |
| `callback:` | `ExecutePublicationCallbackAction` (трекинг клика по inline-кнопке) |
| `cmd_hidden:` | `ShowCommandHiddenText` |
| `cmd_callback:` | `ExecuteCommandCallbackAction` |

Все эти префиксы генерируются на стороне публикаций / команд при отправке сообщения с inline-клавиатурой.

### Модерация: до сохранения сообщения

`CheckMessage` отрабатывает **до** `RouteMessage.save`. Если правило сработало и бот выполнил ban/mute/delete — сообщение в БД не пишется и обработчик возвращает `True` (заблокировано). Это важно: иначе автоответы и триггеры срабатывали бы на удалённое сообщение.

### `route_direct_command` приоритет

`/start` и `/guest` обрабатываются **раньше** всех остальных веток, потому что они работают для любого бота независимо от его настроек (нужны для регистрации DM-чата с ботом). Кастомные команды (через `bot_commands`) обрабатываются уже в `RouteMessage.after_save`.

### Webhook-секрет

При `SetWebhook` Telegram'у передаётся `secret_token` (из `TELEGRAM_WEBHOOK_SECRET`). Каждый его запрос приходит с заголовком `X-Telegram-Bot-Api-Secret-Token`. `ValidateWebhookSecret` проверяет — если не совпадает, запрос игнорируется. Защита от подделки webhook-вызовов сторонними сервисами, если кто-то узнает URL.

### WebSocket-уведомления

Когда сохранили DM или group-сообщение — `RouteMessage.save` возвращает `DirectChatWsEvent`. `RouteTelegramUpdate` после успешной обработки делает `ws_manager.broadcast_chat_update`, и подключенные клиенты получают сообщение в реальном времени. Если broadcast упал — это не валит обработку, только лог.

### Двух-фазный `RouteMessage`

- `save(message)` — критическая часть: запись сообщения в БД, инкремент счётчиков, ws-событие. Быстро.
- `after_save(message)` — некритическое: триггеры, автоответы, custom-команды, метаданные чата, форум-темы. Может упасть — это не повлияет на сохранение.

## Связь с другими доменами

- **services/bot/** — `Bot`, `BotCommand`, `AutoReply`, `Trigger`, `PendingApproval` модели и use-case'ы для срабатывания (`FindAutoReplyByText`, `FindCommandByText`, `CheckCaptchaAnswer`).
- **services/channel/** — `ChannelGroup` (для модерации в группах), `BackedUpPost` (создание копий через webhook), `ChannelModerationRule`, `auto_delete`.
- **services/direct/** — `DirectChat`, `DirectMessage` для сохранения DM.
- **services/inbox/** — все важные события (вступления, выходы, модерация, триггеры) пишутся в `InboxEvent` для отображения в Inbox UI.

## Конвенции

- **Один файл — одна обработчик-функция или класс**.
- **Не commit'ить** в use-case'ах — `session_scope` в `RouteTelegramUpdate` коммитит по выходу из `async with`.
- **Все Telegram-вызовы** через `RateLimitedBot`. Ошибки `TelegramBadRequest / TelegramForbiddenError` ловить (бот может быть удалён из чата).
- **Использовать `resolve_by_token` / `resolve_for_channel`** — они кешируют экземпляр Bot в памяти.
- **WebSocket-события — best-effort**. Если broadcast упал, основная логика не должна страдать.

## Как добавить новую фичу

1. Определи тип апдейта, на который реагирует фича: новое сообщение / callback / член чата / join-request — это определит подпапку в `features/`.
2. Создай `features/<subdomain>/<verb>_<noun>.py`. Один класс, `execute(...)`, не commit'ить.
3. Если это новая ветка маршрутизации — добавь её в `dispatch/route_telegram_update.py`.
4. Если это новый префикс callback'а — добавь в `callbacks/route_callback.py`.
5. Логировать важные шаги через `logger.info` — без webhook'а очень трудно отлаживать что упало в проде.
6. Тесты — `backend/tests/webhook/` (пока не созданы; примеры моков `aiogram.Update / Message / CallbackQuery` есть в `tests/bot/`).

## Что НЕ делать

- Не возвращать тяжёлый ответ Telegram'у — он ждёт `{"ok": true}` за миллисекунды.
- Не делать длинные операции (HTTP вызовы, тяжёлые SQL) **до** `enqueue_telegram_update` — они задержат ответ Telegram'у.
- Не пробрасывать exception из обработчика наружу — это сломает все последующие апдейты (asyncio task поглотит, но логи зашумит). Внутри use-case'ов лучше явно ловить и логировать.
- Не работать с **закрытой сессией БД** после `async with session_scope() as db:` — она закроется и все объекты `expire`'нутся.
- Не дёргать `bot.set_webhook` руками — только через `SetWebhook` (он умеет ретраить DNS-ошибки и не повторно ставит тот же URL).
