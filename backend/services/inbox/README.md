# services/inbox

Единая лента событий — заявки на вступление, баны, link-joins, авто-ответы, триггеры, кастомные команды бота, ошибки. События пишутся **из webhook'а** (см. [services/webhook/](../webhook/README.md)) и других сервисов, а тут — только чтение списка, групповые и точечные действия.

## Точки входа

| HTTP | Route | Use-case |
|---|---|---|
| `GET /inbox/` | [routes/inbox/events.py](../../routes/inbox/events.py) | `ListInboxEvents` — пагинированный список с фильтрами |
| `POST /inbox/bulk-action` | [routes/inbox/bulk_actions.py](../../routes/inbox/bulk_actions.py) | `ExecuteBulkAction` — массово READ / IGNORE / DELETE / BLOCK / UNBLOCK |
| `POST /inbox/{event_id}/action` | [routes/inbox/specific_actions.py](../../routes/inbox/specific_actions.py) | `ExecuteSpecificAction` — одно событие, конкретный `action_type` |

## Поток данных

### Запись событий (приходит сюда из других сервисов)

```
[ webhook → RouteJoinRequest      → CreateInboxEvent(CHANNEL_JOIN_REQUEST) ]
[ webhook → RouteCallback/admin   → CreateInboxEvent(CHANNEL_BAN / ...)    ]
[ webhook → RouteMessage          → CreateInboxEvent(SYSTEM_TRIGGER / SYSTEM_AUTOREPLY / BOT_COMMAND) ]
[ celery/tasks  → ошибка публикации→ CreateInboxEvent(BOT_ERROR)            ]
```

`CreateInboxEvent` принимает Pydantic-схему `InboxEventCreate` и пишет строку. **Транзакция управляется вызывающим сервисом** — внутри только `db.flush()`.

### Чтение

```
GET /inbox/?category=...&status=...&bot_ids=1,2&channel_ids=10,20&system=true&...
        ↓
ListInboxEvents:
    build_filters       ← базовые: owner + category + status + event_types
    build_source_or     ← OR: bot_ids | channel_ids | системные
    build_type_or       ← OR: auto_replies | triggers | commands
    fetch_events        ← page по created_at
    count_events        ← total
    fetch_bot_map       ← один запрос на ботов в выборке (избегаем N+1)
        ↓
{ items: [{ ...event, is_new, tg_bot_username, tg_bot_name }], total, has_more }
```

### Bulk-action

```
POST /inbox/bulk-action { event_ids, action, apply_to_all? }
        ↓
ExecuteBulkAction:
    build_base_where    ← apply_to_all → owner_id, иначе → owner_id AND id IN (ids)
    branch by action:
      READ    → update_status(PROCESSED)
      IGNORE  → update_status(IGNORED)
      DELETE  → delete_events
      BLOCK   → bulk_block (DM или ban_chat_member)
      UNBLOCK → bulk_unblock (unban_chat_member)
        ↓
{ status: "success", affected_rows: N }
```

`bulk_block` для DM-чатов: ставит `DirectChat.is_blocked=True`, помечает событие `BANNED`, создаёт `notification`. Для каналов: `bot.ban_chat_member(chat, user)`, та же отметка.

### Specific action

```
POST /inbox/{event_id}/action { action_type, payload? }
        ↓
find_event_or_404  ← по id + owner_id
        ↓
ExecuteSpecificAction:
    mark_resolved / ignore / reply   ← только UPDATE статуса, без TG
    остальное:
      resolve_event_client    ← Bot из события → resolve_by_token
      dispatch:
        accept              → approve_chat_join_request + increment_link_counter + fire_join_trigger
        reject              → decline_chat_join_request + fire_join_trigger
        block               → block_user
        unban               → unban_user
        delete_message      → bot.delete_message
        delete_and_block    → бан + удаление сообщения + create_block_notification
        change_ban          → restrict/ban с новой длительностью из payload
        ↓
SpecificActionResult(status="accepted" | "rejected" | ...)
```

Ошибки Telegram (`TelegramAPIError`) логируются и оборачиваются в `HTTPException 500`. `HTTPException` пробрасываются как есть.

## Структура каталога

| Подпапка | Что |
|---|---|
| [features/list_events.py](features/list_events.py) | `ListInboxEvents` + filter-builders + `BotMeta` |
| [features/create_event.py](features/create_event.py) | `CreateInboxEvent` — запись одного события |
| [features/lookup.py](features/lookup.py) | `find_event_or_404` + `mark_payload_handled` |
| [features/execute_bulk_action.py](features/execute_bulk_action.py) | `ExecuteBulkAction` + bulk_block / bulk_unblock |
| [features/create_block_notification.py](features/create_block_notification.py) | Уведомление при блокировке |
| [features/fire_join_trigger.py](features/fire_join_trigger.py) | После accept/reject — выстреливаем триггер бота |
| [features/increment_link_counter.py](features/increment_link_counter.py) | После accept — увеличиваем счётчик у invite-link |
| [features/actions/](features/actions/) | Точечные действия (см. ниже) |

### `features/actions/`

| Файл | action_type | Что |
|---|---|---|
| [execute_specific_action.py](features/actions/execute_specific_action.py) | (диспатчер) | Маршрут action_type → handler |
| [status_actions.py](features/actions/status_actions.py) | `mark_resolved` / `ignore` / `reply` | Только UPDATE статуса, без TG |
| [handle_join_request.py](features/actions/handle_join_request.py) | `accept` / `reject` | approve/decline_chat_join_request + триггер |
| [block_user.py](features/actions/block_user.py) | `block` | ban_chat_member + create_block_notification |
| [unban_user.py](features/actions/unban_user.py) | `unban` | unban_chat_member |
| [delete_message.py](features/actions/delete_message.py) | `delete_message` | bot.delete_message |
| [delete_and_block.py](features/actions/delete_and_block.py) | `delete_and_block` | удаление + бан в одной операции |
| [change_ban.py](features/actions/change_ban.py) | `change_ban` | Сменить длительность бана (`payload.duration_seconds`) |

## Особые места

### Категории и типы событий

`InboxCategory`:
- `SYSTEM` — join_request, link_join, ban, error, generic notification/update
- `AUTOMATION` — bot_command, system_trigger, system_autoreply
- `MODERATION` — модерационные действия
- `COMMENTS`, `DIRECT` — комментарии в каналах и DM

`EventType` — конкретный тип (CHANNEL_JOIN_REQUEST, SYSTEM_TRIGGER, BOT_COMMAND, ...).

`AUTOMATION_EVENT_TYPES` и `SYSTEM_EVENT_TYPES` ([list_events.py](features/list_events.py)) — два tuple'а для дефолтного раскрытия `?category=AUTOMATION` и `?system=true`.

### Статус событий

`EventStatus`:
- `NEW` — только что создано, юзер не видел
- `PROCESSED` — обработано (явно или через mark_resolved/READ)
- `IGNORED` — отброшено пользователем
- `BANNED` — пользователь по событию забанен (для join_request и т.п.)

В ответе для UI: `is_new = (status == NEW)` — фронт по этому флагу подсвечивает "точку".

### `payload.handled`

Часть событий несёт `payload["handled"]: bool` (например `BOT_COMMAND`). После любого specific action — `mark_payload_handled` переводит его в `True`. Фронт по этому полю скрывает кнопки.

### `payload.join_state`

После `accept`/`reject` — `payload.join_state = "accepted" | "rejected"`. Используется для отрисовки финального состояния заявки (а не просто статуса).

### Bulk BLOCK для DM vs канала

`bulk_block` сам выбирает путь:
- если `event.channel_id is None` → это DM-событие → ставим `DirectChat.is_blocked=True`
- иначе → канал → `bot.ban_chat_member`

В обоих случаях пишется `create_block_notification` и `event.status = BANNED`.

### Предзагрузка ботов и каналов (N+1)

`preload_bots_and_channels` делает **2 запроса** (`SELECT ... IN (...)`) на всю выборку bulk-action'а, вместо `len(events)` запросов. То же `fetch_bot_map` в `ListInboxEvents` для словаря `bot_id → tg_bot_username`.

### Триггеры после join_request

`accept_join_request` после approve дёргает:
1. `increment_link_counter` — если событие пришло по конкретной invite-link, у неё `member_count++`.
2. `fire_join_trigger(JOIN_REQUEST_APPROVED)` — выполнить триггеры бота с этим триггер-типом.

`reject_join_request` дёргает только триггер (`JOIN_REQUEST_REJECTED`).

### Unit of Work

Все сервисы используют `await db.flush()`, не `db.commit()`. Транзакция управляется через `get_db` зависимость FastAPI. Ошибка в TG (через `HTTPException 500`) откатывает все DB-изменения автоматически.

### Идемпотентность

Bulk action READ/IGNORE/DELETE — idempotent на уровне SQL (UPDATE/DELETE WHERE).

BLOCK/UNBLOCK — Telegram может вернуть ошибку (например юзер уже забанен) — мы её **логируем и пропускаем**, событие не помечается, `affected_rows` остаётся правильным.

Specific `accept`/`reject` — НЕ идемпотентны: повторный вызов upadate'ит payload и снова дёрнет TG, который может вернуть ошибку. Защита — на стороне UI (после обработки кнопки прячутся через `payload.handled`).

## Что НЕ покрыто

- **Real-time push событий** — фронт делает poll `/inbox/`, нет WebSocket-канала.
- **Удаление сообщения из истории канала** при `delete_and_block` — только последнее сообщение (которое в событии). Старые сообщения юзера не трогаем.
- **Retry для TG-ошибок** — не делаем, юзер должен нажать кнопку ещё раз.
