# Тестирование backend

## Как запускать

```bash
docker exec -it lama-backend python -m pytest backend/tests -v --tb=short
```

Или по конкретному домену:

```bash
docker exec -it lama-backend python -m pytest backend/tests/ad_revenues -v
docker exec -it lama-backend python -m pytest backend/tests/publications -v
docker exec -it lama-backend python -m pytest backend/tests/channel -v
```

Зависимости (`pytest-asyncio`, `asgi-lifespan`, `aiosqlite`) лежат в `backend/requirements.txt` — после `docker compose build backend` они окажутся в образе автоматически.

## Архитектура тестов

- **БД**: in-memory `sqlite+aiosqlite` с `StaticPool` (общее соединение между сессиями).
- **HTTP**: минимальный FastAPI-app с одним роутером, override на `get_db` и `get_current_user` через `dependency_overrides`. Клиент — `httpx.AsyncClient + asgi-lifespan`.
- **Postgres-only функции** (`timezone`, `to_char`, `JSONB`, `EXTRACT`) — переопределены через `@compiles(..., "sqlite")` и `dbapi_connection.create_function(...)` в каждом `conftest.py`.
- **Celery / aiogram / Redis** — мокаются через `monkeypatch` либо `unittest.mock.AsyncMock`.

## Что покрыто (по доменам)

### `ad_revenues` — 67 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_compute_subscribers_metrics.py` | 13 | Чистая математика: split_delta, retention, поиск окон ±2ч |
| `test_create_ad_revenue.py` | 4 | Создание income/expense, resolve channel по username |
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

### `publications` — 81 кейс

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_create_publication.py` | 7 | Drafts, каналы, чужой канал → 400, теги, auto_delete, реклама |
| `test_update_publication.py` | 5 | Partial, enum, переподписка каналов, auto_delete |
| `test_delete_publication.py` | 1 | Удаление |
| `test_lookup.py` | 6 | get/find_or_404 + изоляция владельцев |
| `test_list_publications.py` | 5 | Фильтры status/content_type/is_ad, пагинация |
| `test_repeat_use_cases.py` | 4 | cancel/stop/exclusion/reschedule |
| `test_templates.py` | 7 | CRUD шаблонов + поиск |
| `test_tags.py` | 11 | CRUD + idempotent + search + 409 на конфликт + get_or_create с per-index цветами |
| `test_sharing.py` | 8 | generate/get/consume + 404 на expired/used/foreign |
| `test_series.py` | 5 | create/update/find/get_publications + DeleteSeries с замоканным celery |
| `test_ai.py` | 6 | GenerateContent + EditContent с моком http_client (200/502/no-key) |
| `test_publishing_delete_messages.py` | 3 | DeleteTelegramMessages с замоканным aiogram-ботом |
| `test_calendar.py` | 4 | GetDayCounts + GetRecentTimes (через SQLite-шим для `timezone()`/`to_char()`) |
| `test_routes.py` | 9 | CRUD, drafts, repeat-delete, celery-задача delete |

### `channel` — 68 кейсов

| Файл | Кейсов | Покрытие |
|---|---|---|
| `test_crud.py` | 14 | CRUD каналов, фильтры, пагинация, lookup-хелперы |
| `test_moderation_rules.py` | 9 | CRUD правил, проверка сообщения (match/case-insensitive/no-match) |
| `test_settings_toggles.py` | 9 | antispam, flood, captcha, banned_words, night_mode, media_block, quick_commands |
| `test_flood_lock.py` | 7 | Redis-замок (mark/is/clear) + CheckUserFlood с фейковым redis |
| `test_backup.py` | 7 | UpdateBackupMode, ListBackedUpPosts, GetBackupStats |
| `test_invite_links_db.py` | 8 | list/find/delete invite-ссылок без Telegram API |
| `test_routes.py` | 12 | Интеграционные: каналы CRUD, moderation, antispam, banned-words, backup |

## Что НЕ покрыто (требует моков aiogram / postgres)

### `publications`

| Use-case | Почему не покрыт |
|---|---|
| `publishing/publish_to_channels` | Главный оркестратор отправки. Нужен полный мок aiogram pipeline: send_message → save_telegram_messages → handle_backups → finalize_publication. |
| `publishing/send_to_telegram` | Маршрутизация по content_type → send_message / send_photo / send_video и т.д. Нужны моки на все send_* методы. |
| `publishing/send_media_group` | Альбомы (media groups) через `bot.send_media_group`. |
| `publishing/send_single_media` | Одиночные медиа с подписью. |
| `publishing/send_to_channel_with_retry` | Retry на `TelegramRetryAfter`, `TelegramBadRequest`. Тестировать с фейковым ботом, который последовательно бросает разные exceptions. |
| `publishing/republish` | Повторная публикация для repeat-постов. |
| `publishing/edit_published_message` | Редактирование уже отправленного сообщения. |
| `publishing/warmup_media` | Прогрев медиа в storage-каналы для получения file_id. |
| `publishing/download_media` | Скачивание + ресайз картинок. Чистая Python-логика, можно покрыть без aiogram. |
| `publishing/handle_backups` | Связывает publishing с channel.backup. |
| `calendar/count_bot_messages_per_day` | Использует `BotMessage.raw_data["calendar_source"].as_string()` — postgres JSON-path, SQLite шим не справится. |
| `calendar/project_repeats` | Использует pure-функцию `project_repeat_occurrences`, можно покрыть отдельно как unit-тест utils. |
| `series/publish_series_post` | Публикация N-го поста серии с reply_to_previous. |
| `utils/repeat_calculator` | Pure-функции расчёта повторов. **Покрывается легко**, надо добавить. |
| `utils/html_utils.clean_html_for_telegram` | Pure-функция, легко тестируется. **Надо добавить.** |
| `utils/keyboard_utils.prepare_inline_keyboard_data` | Pure-функция. **Надо добавить.** |

### `channel`

| Use-case | Почему не покрыт |
|---|---|
| `sync/sync_channel` + 4 файла | Резолв chat в Telegram через `bot.get_chat`. Нужен мок aiogram. |
| `invite_links/{create,update,refresh,revoke,sync}` | Все ходят в `bot.create_chat_invite_link` / `edit_chat_invite_link` / `revoke_chat_invite_link` / `get_chat_invite_links`. |
| `telegram_settings/*` (6 файлов) | Все ходят в TG: pin/unpin/photo/permissions/title. |
| `info_messages/{publish,share_token,info_message_sender}` | Публикация в TG через бот. |
| `backup/save_post` | Работает с реальными `Message` объектами от aiogram (типы из aiogram.types). |
| `backup_jobs/process_job` | Celery-таск с реальным TG. |
| `retransmit/{send_backed_post,retransmit_post}` | Ходит в `bot.copy_message`. |
| `auto_delete/{get,update,process,safe_delete}` | `ensure_auto_delete_settings` использует `pg_insert(...).on_conflict_do_nothing()` — postgres-specific. На SQLite не работает, тест требует либо мокать `pg_insert`, либо переписать на portable upsert. |
| `permissions/apply_permissions` | `bot.set_chat_permissions`. |
| `forum_topics/{upsert,list,close,reopen}` | `bot.get_forum_topic_*`. |
| `crud/refresh_stale_channels` | Дёргает `sync_channel` под капотом. |

### `ad_revenues`

Покрытие близко к полному. Не покрыт только:
- `take_channel_snapshot.fetch_subscribers_count` — покрыт частично (через моки `resolve_for_channel`), но не сценарий «бот успешно ответил».
- `schedule_ad_revenue_snapshots.queue_deferred` — покрыт через `apply_async.assert_called_once`, но без проверки реальной celery-конфигурации.

## Где гарантировано работает только на postgres

- `services/publications/features/calendar/get_day_counts.py` — `func.timezone()`, `func.date()` через timezone, частично покрыто SQLite-шимом.
- `services/publications/features/calendar/count_bot_messages_per_day.py` — JSONB path `raw_data["calendar_source"].as_string()`.
- `services/channel/features/auto_delete/get_settings.py` — `pg_insert(...).on_conflict_do_nothing()` (используется upsert по `channel_id`).

Эти места требуют postgres в тестах. Можно либо поднимать postgres в CI через `testcontainers-python`, либо мокать на уровне выше.

## Производительность

**Тесты не измеряют производительность.** 80 тестов за 8 сек — это скорость in-memory sqlite, не реальный perf.

Для замеров:
- `pytest-benchmark` (уже в requirements.txt). Существующие бенчи — в `backend/tests/test_benchmarks.py`.
- Load-тесты — в `tests/load_test_*.py` (на корне репо), запускаются через `locust` или прямые `httpx`-флуды.

## Как добавить новый тест

1. Найди подходящий `tests/<domain>/test_<feature>.py`. Если такого нет — создай новый файл.
2. Используй фикстуры из `conftest.py`: `db`, `test_user`, `test_channel`, `client`, `session_factory`.
3. Для проверки результата HTTP-вызова используй **свежую сессию** через `session_factory()` (а не `db`-фикстуру), иначе identity map отдаст устаревшую копию.
4. Помечай tz-aware datetimes — sqlite теряет tzinfo при чтении. См. `test_repeat_use_cases.test_stop_repeat_from_sets_end_time`.
5. Если use-case вызывает Telegram / celery / redis — мокай через `monkeypatch.setattr` (см. `test_publishing_delete_messages.py`).
