# tests/ad_revenues

Юнит и интеграционные тесты для домена `services/ad_revenues` и `routes/ad_revenues`.

## Запуск

```bash
# из корня репозитория
pip install -r backend/requirements-dev.txt
python -m pytest backend/tests/ad_revenues -v
```

Или внутри docker-контейнера backend:

```bash
docker exec -it lama-backend pip install -r requirements-dev.txt
docker exec -it lama-backend python -m pytest backend/tests/ad_revenues -v
```

## Архитектура

- **БД**: `sqlite+aiosqlite:///:memory:` с `StaticPool` — одно соединение на тест,
  фикстура `engine` создаёт схему через `Base.metadata.create_all`. Postgres не нужен.
- **Celery / Telegram**: `patch_snapshot_side_effects` autouse-fixture глушит
  `ScheduleAdRevenueSnapshots.execute`, чтобы `CreateAdRevenue` не пытался дёрнуть
  celery-задачи и `get_chat_member_count`.
- **HTTP**: интеграционные тесты собирают минимальный FastAPI app только с
  `ad_revenues_router` и подменяют зависимости `get_db` / `get_current_user`.
  Запросы идут через `httpx.AsyncClient` + `asgi-lifespan`.

## Что покрыто

| Файл | Что проверяет |
|---|---|
| `test_create_ad_revenue.py` | Создание, resolve channel по username, персистентность. |
| `test_get_ad_revenue.py` | Поиск по id+owner, изоляция между пользователями. |
| `test_update_ad_revenue.py` | Частичное обновление, сериализация enum типа. |
| `test_delete_ad_revenue.py` | Удаление по положительному и отрицательному id, очистка `publication.is_ad`. |
| `test_list_ad_revenues.py` | Склейка реальных AdRevenue и синтетических из Publication, фильтры по типу, пагинация. |
| `test_compute_subscribers_metrics.py` | Чистые функции расчёта ПДП: окна, дельты, retention. |
| `test_routes.py` | CRUD-роуты, stats, export, 404-ответы. |

## Что НЕ покрыто (отложено)

- `get_monthly_stats.py` использует `func.extract("month", ...)` — у SQLite нет
  этой функции. Эти тесты потребуют либо postgres в CI, либо адаптера на
  `func.strftime`.
- `get_community_stats.py` — большой агрегат через `case`/`group_by`, можно
  тестировать на sqlite, но это отдельный заход.
- `take_channel_snapshot.py` — сетевой вызов в Telegram, нужны моки `aiogram.Bot`.
- `schedule_ad_revenue_snapshots.py` — celery-side. Сейчас отглушено autouse-fixture;
  отдельный тест без глушения для проверки `apply_async` подойдёт следующим заходом.
