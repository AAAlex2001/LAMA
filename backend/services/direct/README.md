# services/direct

Direct-чаты — диалоги пользователя бота (subscriber) с владельцем (от лица бота). Сюда приходят входящие DM из webhook'а ([webhook → SavePrivateMessage](../webhook/features/messages/save_private_message.py)), отсюда уходят исходящие через `bot.send_*`. WebSocket-канал доставляет live-апдейты в браузер пользователя без поллинга.

## Точки входа

| HTTP / WS | Route | Use-case |
|---|---|---|
| `POST /chats` | [routes/direct/chats.py](../../routes/direct/chats.py) | `GetOrCreateChat` — идемпотентное создание DM |
| `GET /chats` | [routes/direct/chats.py](../../routes/direct/chats.py) | `ListChats` — список чатов юзера с превью |
| `PATCH /chats/{id}` | [routes/direct/chats.py](../../routes/direct/chats.py) | `UpdateChatStatus` — pin/block/unread/профиль |
| `GET /chats/{bot_id}/{tg_chat_id}/messages` | [routes/direct/messages.py](../../routes/direct/messages.py) | `GetChatMessages` + `ResetUnread` |
| `POST /chats/{bot_id}/{tg_chat_id}/messages` | [routes/direct/messages.py](../../routes/direct/messages.py) | `SendMessage` — отправка в TG |
| `PATCH /messages/{id}` | [routes/direct/messages.py](../../routes/direct/messages.py) | `EditMessage` — edit_message_text/caption |
| `DELETE /messages/{id}` | [routes/direct/messages.py](../../routes/direct/messages.py) | `DeleteMessage` — delete_message в TG + БД |
| `WS /direct/ws?token=...` | [routes/direct/ws.py](../../routes/direct/ws.py) | live-апдейты: message_new / edited / deleted / chat_updated |

## Поток данных

### Входящее сообщение (от подписчика боту)

```
[ Telegram → webhook → RouteMessage → SavePrivateMessage ]
        ↓
SavePrivateMessage (в services/webhook):
    GetOrCreateChat              ← в этом сервисе
    save BotMessage(is_incoming=True)
    UpdateLastMessage            ← превью + last_message_at
    IncrementUnread              ← unread_count++
    ws_manager.broadcast user_id → message_new + chat_updated
        ↓
[ браузер юзера получает событие по WebSocket — список обновляется без поллинга ]
```

### Исходящее сообщение (юзер → подписчик)

```
[ POST /chats/{bot_id}/{tg_chat_id}/messages { text, media[], buttons?, reply_to? } ]
        ↓
SendMessage:
    SendToTelegram               ← bot.send_message / send_photo / send_media_group
        ↓ Message[] от aiogram
    SaveOutgoingMessage          ← пишет BotMessage(is_incoming=False) с raw_data из aiogram
    UpdateLastMessage            ← превью + last_message_at
    ws_manager.broadcast → message_new + chat_updated
        ↓
{ items: BotMessageResponse[] }
```

При ошибке `bot.send_message` → возвращаем пустой `items=[]`, в БД ничего не пишется.

### Edit/Delete

```
[ PATCH /messages/{id} ?bot_id=&tg_chat_id= { text } ]
        ↓
EditMessage:
    выбираем edit_message_text / edit_message_caption по типу
    bot.edit_message_*           ← TG
    BotMessage.text_content = new_text
    ws_manager.broadcast → message_edited
```

```
[ DELETE /messages/{id} ?bot_id=&tg_chat_id= ]
        ↓
DeleteMessage:
    bot.delete_message           ← TG (если упал — 400, БД не трогаем)
    DELETE BotMessage WHERE id   ← БД
    ws_manager.broadcast → message_deleted
```

### Получение истории + reset unread

```
[ GET /chats/{bot_id}/{tg_chat_id}/messages?skip=0&limit=50 ]
        ↓
GetChatMessages:
    FetchChatMessages            ← страница BotMessage с reply_to lookahead
    EnrichChatMessages           ← дозагрузка reply-preview + media metadata
ResetUnread                       ← side effect: unread_count = 0
        ↓
{ items, total, page, page_size, has_more }
```

Режимы: `around_message_id` (половина до / половина после — для перехода по reply) и `after_message_id` (только новее, для дополнительной выгрузки в WS-режиме).

## Структура каталога

| Подпапка | Что |
|---|---|
| [features/chats/](features/chats/) | Управление DirectChat (создание/список/статус/unread) |
| [features/messages/](features/messages/) | Сообщения: send_message / send_to_telegram / save_*/edit/delete + resolve_media_url + broadcast |
| [features/utils/](features/utils/) | Хелперы для медиа: detectors (по типу контента), input_media (для send_media_group), request_media (proxy CDN), message_extractors (raw_data parsing) |

### `features/chats/`

| Файл | Что |
|---|---|
| [get_or_create_chat.py](features/chats/get_or_create_chat.py) | Идемпотентное создание чата по (bot_id, tg_chat_id) + обновление полей профиля |
| [list_chats.py](features/chats/list_chats.py) | Список с фильтрами (bot_id, unread/read) + сортировка (new/old, пины сверху) + превью |
| [lookup.py](features/chats/lookup.py) | `find_chat_or_404`, `TYPE_LABELS` для рендера превью медиа |
| [get_chat_messages.py](features/chats/get_chat_messages.py) | Оркестратор: fetch + enrich + reset_unread |
| [fetch_chat_messages.py](features/chats/fetch_chat_messages.py) | SELECT BotMessage с reply-preview lookahead |
| [enrich_chat_messages.py](features/chats/enrich_chat_messages.py) | Достройка raw_data: имя файла, размер, media_group_id |
| [update_chat_status.py](features/chats/update_chat_status.py) | PATCH (pin/block/unread/профиль) + WS-эвент |
| [update_last_message.py](features/chats/update_last_message.py) | Обновляет превью + updated_at после save_message |
| [increment_unread.py](features/chats/increment_unread.py) | Для входящих: unread_count++ |
| [reset_unread.py](features/chats/reset_unread.py) | При открытии чата фронтом: unread_count = 0 |
| [update_photo.py](features/chats/update_photo.py) | Refresh tg_photo_url из get_chat |

### `features/messages/`

| Файл | Что |
|---|---|
| [send_message.py](features/messages/send_message.py) | Главный оркестратор отправки: route → save_outgoing → broadcast |
| [send_to_telegram.py](features/messages/send_to_telegram.py) | Маршрутизация по media-count: 0/1/N → text/single/media_group |
| [save_outgoing_message.py](features/messages/save_outgoing_message.py) | Пишет BotMessage(is_incoming=False) с raw_data из aiogram |
| [save_incoming_message.py](features/messages/save_incoming_message.py) | Для webhook'а: пишет BotMessage(is_incoming=True) |
| [edit_message.py](features/messages/edit_message.py) | edit_message_text / edit_message_caption + WS-эвент |
| [delete_message.py](features/messages/delete_message.py) | delete_message в TG + DELETE из БД + WS-эвент |
| [broadcast.py](features/messages/broadcast.py) | Рассылка по списку chat_id'ов |
| [resolve_media_url.py](features/messages/resolve_media_url.py) | Telegram file_id → proxy-URL для фронта (через `getFile` + CDN) |

### `features/utils/`

| Файл | Что |
|---|---|
| [media_detectors.py](features/utils/media_detectors.py) | Определение MessageType из raw_data (photo/video/document/...) |
| [input_media.py](features/utils/input_media.py) | InputMediaPhoto / InputMediaVideo для `send_media_group` |
| [request_media.py](features/utils/request_media.py) | aiohttp-обёртка для proxy медиа |
| [message_extractors.py](features/utils/message_extractors.py) | Извлечение полей (caption, file_id, name) из Message |

## Особые места

### Идемпотентность создания чата

`GetOrCreateChat` использует `(bot_id, tg_chat_id)` как ключ. Никогда не создаёт дубликат — только обновляет профиль (`tg_username`, `tg_first_name`, `tg_last_name`, `tg_photo_url`) если в TG он изменился.

`refresh_user_fields` обновляет поля **только если они отличаются** — flush делается только при изменениях.

### WebSocket-broadcast вместо polling

После каждой записи в БД (`save_incoming` / `save_outgoing` / `edit` / `delete` / `update_chat_status`) — `ws_manager.broadcast(user_id, event)` шлёт сообщение всем открытым WS-соединениям юзера.

```python
events = {
    "message_new":     {"type": "message_new", "data": BotMessageResponse},
    "message_edited":  {"type": "message_edited", "data": {message_id, text_content}},
    "message_deleted": {"type": "message_deleted", "data": {message_id}},
    "chat_updated":    {"type": "chat_updated", "data": DirectChatResponse},
}
```

Реализация `ws_manager` живёт в [backend/websockets/manager.py](../../websockets/manager.py) — использует Redis Pub/Sub для распределённой доставки (если backend в нескольких репликах).

### Авторизация WebSocket

`/direct/ws?token=<JWT>` — токен передаётся как query-параметр (нет заголовков в WS-handshake браузера). Валидируется один раз через `VerifyAccessToken`, дальше соединение держится открытым. После expire соединение остаётся, но если access-токен инвалидирован через logout — события всё равно будут идти (нет re-check). Юзеру придётся пере-подключиться вручную, либо фронт делает это по `websocket.close()`.

### Сортировка списка чатов

`is_pinned=True` всегда сверху (`order_by(desc(is_pinned), ...)`), внутри — по `updated_at`. `updated_at` обновляется при каждом изменении в чате (новое сообщение, статус, профиль).

### Resolve media URL

`resolve_media_url` для каждого `file_id` дёргает `bot.get_file()`, получает `file_path`, и возвращает URL вида `https://api.telegram.org/file/bot{TOKEN}/{path}`. Этот URL пробрасывается фронту прямо в media-объекте сообщения. Для приватности можно проксировать через свой бэкенд (не реализовано — фронт ходит напрямую в TG CDN).

### Альбомы (`media_group_id`)

При отправке 2-10 медиа → `bot.send_media_group(...)` → TG возвращает массив `Message[]` с общим `media_group_id`. Мы пишем каждое как **отдельный BotMessage** с тем же `media_group_id` в `raw_data`. На фронте они склеиваются в один UI-блок.

### Reply-preview lookahead

`FetchChatMessages` ищет `reply_to_message_id` в текущей странице, потом отдельным запросом достаёт preview-данные тех сообщений (text/media_label). Это нужно даже если оригинал в той же странице — для консистентности рендера.

### unread vs delivered

В TG нет "прочитал/не прочитал" для бота. `unread_count` — это наш счётчик: инкрементится при `save_incoming`, обнуляется при открытии чата фронтом (`GET /chats/.../messages` зовёт `ResetUnread`). Если у юзера несколько открытых клиентов — все получат `chat_updated` после сброса.

### Unit of Work

Все сервисы используют `await db.flush()`. Транзакция управляется `get_db` зависимостью FastAPI. WS-broadcast делается **в конце**, после commit'а — иначе клиент может получить событие про несуществующее сообщение (если commit упадёт).

### Блокировка чата

`is_blocked=True` — фронт-сигнал что юзер не хочет видеть этого собеседника. Сообщения от него **по-прежнему сохраняются** (для аудита и анти-спам логики), но в списке чатов скрыты по умолчанию. Telegram блокировка пользователя — это другое (через webhook → BLOCK).

## Что НЕ покрыто

- **Group chats / channel comments** — не здесь, отдельные таблицы (`channel_groups`, `BotMessage.tg_chat_id` для каналов в той же таблице, но отдельный код-путь в `webhook/features/messages/save_group_comment.py`).
- **Voice / video notes** — отправка не реализована, на чтение через raw_data работает.
- **Forwarded messages** — отображаются как обычные с `raw_data["forward_*"]`, но нет ручной пересылки из UI.
- **Typing indicators** — не пробрасываются.
- **Read receipts** — нет, только наш unread_count.
