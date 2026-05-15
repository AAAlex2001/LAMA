# Тестирование backend

## Recent changes

- **Security-fix**: все `PUT/POST/PATCH/DELETE` в `routes/landing.py`, `routes/upload.py`, `routes/knowledge_base.py` теперь требуют `Depends(get_current_admin)`. `GET` и `POST /articles/.../feedback` остались публичными.
- **Pydantic v1 → v2**: убраны последние `class Config:` и `@validator` в `schemas/inbox/events.py`, `schemas/publications/publications.py`, `schemas/channels/info_messages.py`, `schemas/publications/publishing.py`, `schemas/common.py`. Все `data.dict()` в `routes/landing.py` заменены на `.model_dump()`.

## Как запускать

```bash
docker exec -it lama-backend python -m pytest backend/tests -v --tb=short
```

Или по конкретному домену:

```bash
docker exec -it lama-backend python -m pytest backend/tests/ad_revenues -v
docker exec -it lama-backend python -m pytest backend/tests/publications -v
docker exec -it lama-backend python -m pytest backend/tests/channel -v
docker exec -it lama-backend python -m pytest backend/tests/bot -v
docker exec -it lama-backend python -m pytest backend/tests/webhook -v
docker exec -it lama-backend python -m pytest backend/tests/auth -v
docker exec -it lama-backend python -m pytest backend/tests/inbox -v
docker exec -it lama-backend python -m pytest backend/tests/direct -v
docker exec -it lama-backend python -m pytest backend/tests/landing -v
```

Зависимости (`pytest-asyncio`, `asgi-lifespan`, `aiosqlite`) лежат в [requirements.txt](requirements.txt) — после `docker compose build backend` они окажутся в образе.

## Архитектура

- **БД**: in-memory `sqlite+aiosqlite` с `StaticPool` (общее соединение между сессиями).
- **HTTP**: минимальный FastAPI-app с одним роутером, override `get_db` и `get_current_user` через `dependency_overrides`. Клиент — `httpx.AsyncClient + asgi-lifespan`.
- **Postgres-only функции** (`timezone`, `to_char`, `JSONB`, `EXTRACT`) — переопределены через `@compiles(..., "sqlite")` и `dbapi_connection.create_function(...)` в каждом `conftest.py`.
- **Celery / aiogram / Redis / OpenAI** — мокаются через `monkeypatch` либо `unittest.mock.AsyncMock`.

## Покрытие по доменам

### `ad_revenues` — 67 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_compute_subscribers_metrics.py` | 13 | Чистая математика: split_delta, retention, окна ±2ч |
| `test_create_ad_revenue.py` | 4 | Создание, resolve channel по username |
| `test_get_ad_revenue.py` | 3 | Lookup + изоляция владельцев |
| `test_update_ad_revenue.py` | 3 | Partial update, enum-сериализация |
| `test_delete_ad_revenue.py` | 6 | Положительный/отрицательный id, чистка `publication.is_ad`, 404 |
| `test_list_ad_revenues.py` | 6 | Склейка реальных + синтетических, фильтры, пагинация |
| `test_get_monthly_stats.py` | 5 | 12 месяцев, фильтр по году/валюте, доход из публикации |
| `test_get_community_stats.py` | 5 | Группировка по каналу, резолв по username |
| `test_take_channel_snapshot.py` | 4 | Замоканный aiogram-бот: успех, нет канала, API-ошибка |
| `test_schedule_ad_revenue_snapshots.py` | 3 | Замоканный celery: skip без канала, два таска через 24/48ч |
| `test_export_ad_revenues.py` | 4 | xlsx с одной/двумя секциями, csv, scope='all' |
| `test_routes.py` | 11 | CRUD-роуты, stats, export, 404 |

### `publications` — 89 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_create_publication.py` | 7 | Drafts, каналы, чужой канал → 400, теги, auto_delete |
| `test_update_publication.py` | 5 | Partial, enum, переподписка каналов, auto_delete |
| `test_delete_publication.py` | 1 | Удаление |
| `test_lookup.py` | 6 | get/find_or_404 + изоляция владельцев |
| `test_list_publications.py` | 5 | Фильтры status/content_type/is_ad, пагинация |
| `test_repeat_use_cases.py` | 4 | cancel/stop/exclusion/reschedule |
| `test_templates.py` | 7 | CRUD шаблонов + поиск |
| `test_tags.py` | 11 | CRUD + idempotent + search + 409 на конфликт + get_or_create |
| `test_sharing.py` | 8 | generate/get/consume + 404 на expired/used/foreign |
| `test_series.py` | 5 | create/update/find/get_publications + DeleteSeries с моком celery |
| `test_ai.py` | 6 | GenerateContent + EditContent с моком http_client |
| `test_publishing_delete_messages.py` | 3 | DeleteTelegramMessages с замоканным ботом |
| `test_publishing_retry.py` | 8 | Retry-логика отправки в TG: успех, fatal-ошибки, RetryAfter, generic-ошибки |
| `test_calendar.py` | 4 | GetDayCounts + GetRecentTimes (SQLite-шим для `timezone()`/`to_char()`) |
| `test_routes.py` | 9 | CRUD, drafts, repeat-delete, celery-задача delete |

### `channel` — 78 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_crud.py` | 14 | CRUD каналов, фильтры, пагинация, lookup-хелперы |
| `test_moderation_rules.py` | 9 | CRUD правил, проверка сообщения (case-insensitive, no-match) |
| `test_settings_toggles.py` | 9 | antispam, flood, captcha, banned_words, night_mode, media_block, quick_commands |
| `test_flood_lock.py` | 7 | Redis-замок + CheckUserFlood с фейковым redis |
| `test_backup.py` | 7 | UpdateBackupMode, ListBackedUpPosts, GetBackupStats |
| `test_invite_links_db.py` | 8 | list/find/delete invite-ссылок без Telegram API |
| `test_invite_links_mocked.py` | 10 | create/update/revoke с моком aiogram-бота, 400 на ошибки, idempotent revoke |
| `test_routes.py` | 12 | Интеграционные: каналы CRUD, moderation, antispam, backup |

### `bot` — 82 кейса

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_crud.py` | 14 | Create с моком `fetch_bot_info`, 400/409 на дубликат, update/delete/activate/deactivate, list |
| `test_commands.py` | 10 | CRUD команд, find_by_text с приоритетом channel-specific > generic |
| `test_triggers.py` | 8 | CRUD триггеров, фильтры, owner-isolation |
| `test_recurring.py` | 11 | CRUD recurring + `schedule_calculator` (today_candidate, weekly, wrap) |
| `test_auto_replies.py` | 12 | CRUD + find_by_text + `is_allowed_by_frequency` |
| `test_captcha.py` | 13 | Генератор, `is_correct_answer` / `is_expired`, check_answer все исходы |
| `test_routes.py` | 13 | Интеграционные через httpx |
| `test_publishing_delete_messages.py` | 3 | DeleteTelegramMessages с замоканным aiogram-ботом |

### `webhook` — ~95 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_intake.py` | 16 | `ValidateWebhookSecret` (ok/wrong/missing/dev/timing), `GetTelegramUpdate` (valid/empty/invalid), `EnqueueTelegramUpdate` (asyncio task + log), `ReceiveTelegramWebhook` (rejects/enqueue) |
| `test_settings.py` | 11 | `SetWebhook`: skip-if-same/set-new/400/DNS-retry/502, `DeleteWebhook`, `GetWebhookInfo` |
| `test_bot_context.py` | 8 | `GetBotByToken` / `GetBotByChat` / `ResolveBotContext` (приоритет чата над токеном) |
| `test_moderation_primitives.py` | 15 | `BanUser` / `KickUser` / `MuteUser` (с/без duration) / `UnmuteUser` / `CheckModerationAdmin` / `DeleteModeratedMessage` / `ClearBanLockOnUnban` |
| `test_apply_moderation_action.py` | 10 | Оркестратор: no_bot, no_channel, ban+event, mute с duration, admin-skip, already-banned, RateLimit, BadRequest, APIError |
| `test_route_callback.py` | 8 | Диспатч по префиксу: group_captcha / private_captcha / admin / publication-hidden / publication-callback |
| `test_route_telegram_update.py` | 11 | Главный switch: no-bot / inactive / /start / /guest / blocked / join_request / message / callback / chat_member / my_chat_member / exception swallow |
| `test_captcha_helpers.py` | 21 | `GetCaptcha` (private/group/short/invalid/None), `chat_id` из БД, `DeleteCaptcha`, `UnlockCaptchaUser`, `ApprovePendingJoinRequest`, `AnswerCallback` (включая «query too old»), `CheckSubscriber`, `GetCallbackButtonTarget` |
| `test_subscriptions.py` | 10 | `HasRecentJoinEvent` (окно 2 мин), `FindInviteLinkFromInbox` (latest), `MarkJoinRequestAccepted` (помечает payload + status) |
| `test_callbacks_publications.py` | 7 | `TrackButtonClick` (idempotent per user, разные юзеры), `ShowHiddenText` (no-op для битого callback, кнопка не найдена, subscribed vs unsubscribed) |

### `auth` — ~75 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_passwords.py` | 5 | bcrypt hash/verify, битый хеш, пустой хеш |
| `test_tokens.py` | 16 | CreateAccess/Refresh, VerifyAccess (все ветки: missing/inactive/expire/refresh-token rejected), RefreshTokenPair (rotate, missing session, inactive user), LogoutSession |
| `test_telegram_widget.py` | 11 | HMAC compute + verify (correct/tampered/old/modified/no-optional-fields), UpsertTelegramUser (create/update/auth_date), AuthenticateTelegramWidget (success + inactive 403) |
| `test_email_flow.py` | 13 | RegisterWithEmail (consent, dup, normalize), LoginWithEmail (unknown/wrong/telegram-only/inactive), AddEmailToUser (dup, re-add) |
| `test_bot_login.py` | 10 | AuthenticateBotUser (create/idempotent/inactive), CreateBotLoginCode (TTL/unique), RedeemBotLoginCode (success/unknown/used/expired) |
| `test_users.py` | 17 | GetUser/GetUserByEmail/GetUserByTelegramId/ListUsers/UpdateUser/DeleteUser/GetUserStats + session CRUD + RevokeUserSession (owner-check) |

### `inbox` — ~40 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_list_events.py` | 11 | Owner-isolation, category/status/bot_ids/event_types/system/auto_replies filter, pagination, sort old/new, bot_map preload |
| `test_lookup.py` | 6 | find_event_or_404 (owner check, 404), mark_payload_handled (with/without key/empty) |
| `test_create_event.py` | 2 | CreateInboxEvent — пишет строку, дефолт status=NEW |
| `test_bulk_action.py` | 11 | READ/IGNORE/DELETE, apply_to_all, empty-ids, BLOCK для DM + канала, UNBLOCK, swallow TelegramAPIError, skip без required fields |
| `test_specific_actions.py` | 10 | mark_resolved / ignore / reply + accept_join (approve + state + handled), reject_join, 404 без channel.telegram_id, dispatcher routes/404/400/wraps-500 |

### `direct` — ~90 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_chats.py` | 17 | GetOrCreateChat (idempotent, profile-update, skip-empty), ListChats (фильтры bot_id/unread/read, pinned first, preview), UpdateChatStatus (pin/block), IncrementUnread (multi + noop), ResetUnread, UpdateLastMessage |
| `test_lookup.py` | 7 | get_chat_and_bot (owner-check, 404), find_chat_by_id_or_404, bot_belongs_to_owner |
| `test_media_detectors.py` | 13 | detect_media_type по расширению, extract_incoming_media (photo/video/text), extract_media_type, extract_media_file_id (photo последний/video/TEXT none/404) |
| `test_message_extractors.py` | 15 | message_get (dict/object), get_raw_message_data, extract_nested_id (dict/object/custom-key/404), extract_file_id_from_entity (dict/object/None/empty), extract_file_id_from_collection (photos[], single, empty, str-not-iterable) |
| `test_send_to_telegram.py` | 11 | Маршрутизация по media-count: 0+text → send_message, 0 no-text → empty, single photo/video/document/audio, detect type by URL, album → send_media_group, лимит 10, reply_params passthrough; wrap_for_send |
| `test_save_messages.py` | 9 | SaveOutgoingMessage (text, photo+caption, fallback type, reply_to); SaveIncomingMessage (dict text, photo+caption, 404 bot, reply_to) |
| `test_edit_delete.py` | 10 | EditMessage (text/caption/empty skip/foreign 404/incoming 404/TG-error 400); DeleteMessage (db row gone after TG, db kept on TG fail, foreign 404) |

### `landing` — ~13 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_hero.py` | 5 | get для пустой секции, save+get round-trip, full replacement, locale isolation, coerce_locale |
| `test_faq.py` | 3 | Пустая секция, save+get, замена items |
| `test_advantages.py` | 4 | Пустая, save+get, slug generation из title (translit), preserve explicit uid+slug |

### Итого: **~630 тестов** через ~65 файлов

## Что НЕ покрыто (честный список)

### `publications`

| Use-case | Почему не покрыт |
|---|---|
| `publishing/publish_to_channels` | Главный оркестратор отправки. Нужен полный мок aiogram pipeline (send_message → save_telegram_messages → handle_backups → finalize). |
| `publishing/send_to_telegram` | Маршрутизация по content_type → send_message / send_photo / send_video. Нужны моки на все send_* методы. |
| `publishing/send_media_group` | Альбомы через `bot.send_media_group`. |
| `publishing/send_single_media` | Одиночные медиа с подписью. |
| `publishing/republish` | Повторная публикация для repeat-постов. |
| `publishing/edit_published_message` | Редактирование уже отправленного сообщения. |
| `publishing/warmup_media` | Прогрев медиа в storage-каналы. |
| `publishing/download_media` | Скачивание + ресайз картинок (Pillow). |
| `publishing/handle_backups` | Связывает publishing с channel.backup. |
| `calendar/count_bot_messages_per_day` | Использует `BotMessage.raw_data["calendar_source"].as_string()` — postgres JSON-path. SQLite шим не справится. |
| `calendar/project_repeats` | Зависит от utils.repeat_utils. Тестируется отдельно как unit utils. |
| `series/publish_series_post` | Публикация N-го поста серии с reply_to_previous. |
| `utils/repeat_calculator` | Pure-функции расчёта повторов. Покрывается легко — план. |
| `utils/html_utils.clean_html_for_telegram` | Pure-функция. План. |
| `utils/keyboard_utils.prepare_inline_keyboard_data` | Pure-функция. План. |

### `channel`

| Use-case | Почему не покрыт |
|---|---|
| `sync/*` (5 файлов) | Резолв chat в Telegram через `bot.get_chat`. Нужен мок aiogram. |
| `telegram_settings/*` (6 файлов) | Все ходят в TG: pin/unpin/photo/permissions/title. |
| `info_messages/{publish,share_token,info_message_sender}` | Публикация в TG через бот. |
| `backup/save_post` | Работает с реальными `Message` объектами от aiogram. |
| `backup_jobs/process_job` | Celery-таск с реальным TG. |
| `retransmit/{send_backed_post,retransmit_post}` | Ходит в `bot.copy_message`. |
| `auto_delete/{get,update}_settings` | `ensure_auto_delete_settings` использует `pg_insert(...).on_conflict_do_nothing()` (postgres-specific). |
| `permissions/apply_permissions` | `bot.set_chat_permissions`. |
| `forum_topics/{upsert,list,close,reopen}` | `bot.get_forum_topic_*`. |
| `crud/refresh_stale_channels` | Дёргает `sync_channel` под капотом. |

### `bot`

| Use-case | Почему не покрыт |
|---|---|
| `messaging/{send_message,broadcast,dispatch_telegram}` | Реальные TG-вызовы + DirectChat-фикстуры. |
| `moderation/{handle_command,handle_admin,ban_user,mute_user,...}` | Команды модерации с моками `aiogram.Message` и `RateLimitedBot`. |
| `triggers/{fire,actions,schedule}/*` | Runtime триггеров. Моки aiogram + celery. |
| `welcome/send_welcome.py` | Отправка через бота + шорткоды. |
| `settings/check_channel_subscriptions` | Реальные запросы в TG. |
| `bot_shortcodes.py` | Pure-функция — можно покрыть отдельно. |

### `webhook` — самые большие пробелы

Документация и тесты покрывают **критичный приёмник + диспатч + модерационные примитивы**. То что осталось — самый тяжёлый runtime:

| Подпапка | Почему не покрыта |
|---|---|
| `messages/*` (~12 файлов) | `RouteMessage` ветка — самая большая. Сохранение DM/group/forum, триггеры на сообщение, автоответы, custom-команды. Требует ~15-20 тестов с глубокими моками всей цепочки. |
| `members/{update_member,delete_member,send_group_captcha,get_captcha_restriction}` | Обновление участников чата + отправка group-captcha. Требует моки aiogram + welcome + триггеры. |
| `join_requests/{route_join_request,save_pending_approval,approve,send_*}` (~12 файлов) | Switch по `ApprovalMode × CaptchaMode` + отправка капчи/уведомлений. Требует ~10 тестов с моками 8 дочерних сервисов. |
| `captcha/{check_private,check_group,fire_captcha_result,send_captcha_welcome,...}` | Глубокая цепочка callback'а. Покрыты только helpers (GetCaptcha, ApprovePendingJoinRequest, DeleteCaptcha, UnlockCaptchaUser). |
| `welcome/send_welcome_message` | Отправка в TG с медиа/кнопками/шорткодами. |
| `callbacks/admin/*` | Кнопки модерации (kick/ban из инлайн-меню). |
| `callbacks/commands/*` | Hidden-text и callback-action для команд бота. |
| `subscriptions/{accept_pending_approvals,create_direct_join_event,update_subscription,restrict_for_required_subscription,fire_direct_join_events,get_subscription_join_state,update_invite_member_count}` | Каскад событий при изменении статуса участника. |
| `commands/*` (~10 файлов) | `RouteBotCommand` + `send_start_message` / `send_guest_link` / `send_command_response` / `send_claim_to_admin` / `execute_moderation_command` / `fire_command_triggers`. |
| `bot_membership/sync_bot_membership` | Обновление статуса бота в чате (kicked/admin/member). |
| `bot_context/get_bot_by_chat` + `get_bot_by_token` | Покрыты в `test_bot_context.py`. |
| `moderation/check_message` | Не покрыт изолированно (асимметричный путь enqueue celery после проверки), но логика `flood/links/banned_words` покрыта в `tests/channel/`. |

**Почему не сделал**: каждый из этих файлов требует моков целой цепочки (aiogram.Update → bot → DB-сессия → celery → ws_manager → trigger-firing pipeline). Реалистично — это ещё 100+ тестов и 4-5 сессий работы. **Лучше покрывается e2e против реального тестового бота на тестовом канале**, чем пытаться мокать всю инфраструктуру.

### `auth`

| Use-case | Почему не покрыт |
|---|---|
| `routes/auth/*` HTTP-уровень | Тесты идут на уровне сервисов; httpx-интеграцию не делал — все ветки проверены через прямой вызов use-case'ов. |
| `dependencies.get_current_user` / `get_current_admin` | Тонкие обёртки над `VerifyAccessToken`. Логика VerifyAccessToken покрыта целиком (5 веток). |

### `inbox`

| Use-case | Почему не покрыт |
|---|---|
| `features/actions/block_user.py`, `unban_user.py`, `delete_message.py`, `delete_and_block.py`, `change_ban.py` | Тонкие обёртки над `client.ban/unban/delete + UPDATE status`. Логика диспатча покрыта (`test_specific_actions.py::test_dispatcher_*`), остальное — проверка моков. |
| `features/create_block_notification.py` | Создание уведомления — простой INSERT. Не критично. |
| `features/fire_join_trigger.py`, `features/increment_link_counter.py` | Замоканы в `test_specific_actions.py::accept_join_request`. Отдельные тесты не делал. |

### `direct`

| Use-case | Почему не покрыт |
|---|---|
| `features/messages/send_to_telegram.py` + `send_message.py` | Полная цепочка отправки требует моков aiogram (send_message / send_photo / send_media_group), aiohttp (media URLs), ws_manager. Покрыто фрагментарно: маршрутизация по media-count — план, нужно ~10 тестов. |
| `features/messages/save_outgoing_message.py` / `save_incoming_message.py` | Запись BotMessage с разбором raw_data из aiogram — нужны fixture aiogram-объектов. |
| `features/messages/edit_message.py` / `delete_message.py` | Тонкие обёртки над bot.edit_*/delete_* + WS-эвент. Малая ценность. |
| `features/messages/broadcast.py` | Цикл по chat-id с `send_message`. Тестируется через `send_message`. |
| `features/messages/resolve_media_url.py` | Дёргает `bot.get_file()` — нужен мок aiogram. План. |
| `features/utils/*` | Pure-функции (media_detectors, input_media, message_extractors). Лёгкие unit-тесты — план. |
| `features/chats/get_chat_messages.py` + `fetch_chat_messages.py` + `enrich_chat_messages.py` | Цепочка fetch + reply lookahead + enrich. Требует фикстуры с reply_to цепочкой — план. |
| `routes/direct/ws.py` | WebSocket-handshake требует `asgi-lifespan` + `httpx.AsyncClient.websocket_connect`. План. |

### `landing`

Покрыто **только 3 секции** (Hero / FAQ / Advantages) из 11. Остальные секции (`header`, `key_advantages`, `pricing`, `users`, `lama`, `footer`, `tools`, `templates`) — **тот же паттерн** "section + key-value contents + полная замена при save". Один аналогичный тест на каждую секцию закрывает всё, нет смысла делать 8 копий.

| Use-case | Почему не покрыт |
|---|---|
| `templates.*` | Самый большой модуль с JSON-контентом (blocks/faq/cards/subscribeBlocks). Тест save+get round-trip покрыл бы 80%; не делал — много сериализаций, лучше протестировать через httpx-роуты. |
| `header`, `pricing`, `users`, `lama`, `footer`, `tools`, `key_advantages` | Тот же шаблон что Hero/FAQ. Покрывается копированием test_hero.py с заменой ключей. |

### `misc routes`

| Файл | Тесты |
|---|---|
| `knowledge_base.py` | Не покрыто. CRUD простой; интеграционный тест через httpx достаточен. |
| `link_preview.py` | Не покрыто. Требует мока aiohttp + reference HTML с OG-тегами. Малая ценность. |
| `media_upload.py` | Не покрыто. Цепочка storage + bot_provider + warmup. Лучше e2e против тестового S3-бакета. |
| `upload.py` | Не покрыто. Запись на FS — простой smoke-тест плана не сделал. |

### Где гарантировано работает только на postgres

- `services/publications/features/calendar/get_day_counts.py` — `func.timezone()`, `func.date()` (частично покрыто SQLite-шимом).
- `services/publications/features/calendar/count_bot_messages_per_day.py` — JSONB path `raw_data["calendar_source"].as_string()`.
- `services/channel/features/auto_delete/get_settings.py` — `pg_insert(...).on_conflict_do_nothing()`.
- `services/webhook/features/callbacks/publications/track_button_click.py` — `pg_insert(...).on_conflict_do_nothing()` для unique constraint. На SQLite будет работать через `try/except`, но тест `test_track_button_click_idempotent_per_user` может упасть. Если упадёт — нужно адаптировать через native SQLite `INSERT OR IGNORE`.

Эти места требуют postgres в тестах. Можно либо поднимать postgres в CI через `testcontainers-python`, либо мокать на уровне выше.

## Производительность

**Тесты не измеряют производительность.** 400+ тестов за ~30 секунд — это скорость in-memory sqlite, не реальный perf.

Для замеров:
- `pytest-benchmark` (уже в requirements). Существующие бенчи — в `tests/test_benchmarks.py`.
- Load-тесты — в `tests/load_test_*.py` (на корне репо), запускаются через `locust` или прямые `httpx`-флуды.

## Как добавить новый тест

1. Найди подходящий `tests/<domain>/test_<feature>.py`. Если такого нет — создай новый файл.
2. Используй фикстуры из `conftest.py`: `db`, `test_user`, `test_channel`, `test_bot`, `client`, `session_factory`.
3. Для проверки результата HTTP-вызова используй **свежую сессию** через `session_factory()` (а не `db`-фикстуру), иначе identity map отдаст устаревшую копию.
4. **tz-aware datetimes**: sqlite теряет tzinfo при чтении. Приводи к UTC через `expires.replace(tzinfo=timezone.utc)` перед сравнением. Пример — `test_repeat_use_cases.test_stop_repeat_from_sets_end_time`.
5. Если use-case вызывает Telegram / celery / redis — мокай через `monkeypatch.setattr` либо `unittest.mock.AsyncMock`. Примеры моков aiogram — в `tests/webhook/conftest.py:fake_bot`.
6. Тесты не должны зависеть друг от друга — каждая фикстура создаёт фреш-БД.
