# services/ad_revenues

Рекламный кабинет: учёт доходов и расходов от рекламных размещений + замеры подписчиков канала вокруг публикации (приток / отток / удержание) для оценки эффективности.

## Модели

| Файл | Таблица | Назначение |
|---|---|---|
| [models/ad_revenues.py](../../models/ad_revenues.py) → `AdRevenue` | `ad_revenues` | Денежная запись (доход или расход). Может быть привязана к `publication_id`, `channel_id` или `bot_id`, либо «висеть в воздухе» с `channel_username`. |
| [models/channels.py](../../models/channels.py) → `ChannelSubscribersSnapshot` | `channel_subscribers_snapshot` | Снимки числа подписчиков канала во времени. Из них считаются дельты ПДП вокруг рекламной публикации. |
| [models/publications.py](../../models/publications.py) → `Publication` (поля `is_ad`, `ad_buyer`, `ad_amount`, `ad_currency`, `ad_note`) | `publications` | Альтернативный источник «рекламных строк»: когда юзер создаёт пост и проставляет `is_ad=true` с суммой — такой пост попадает в кабинет как **синтетическая строка** (без отдельной `AdRevenue`). |

## Источники списка кабинета

`ListAdRevenues` склеивает **два** источника в один отсортированный список:

1. **Реальные `AdRevenue`** — id положительный, есть денежные поля + опционально `publication_id`.
2. **Синтетические из `Publication` с `is_ad=True`** — id отдаётся как `-publication.id` (со знаком минус). Деньги/buyer берутся из полей `ad_*` публикации. Эти строки не дублируются с реальными — публикации, на которые уже есть `AdRevenue.publication_id`, исключаются из синтетического выбора.

Это важно для UPDATE/DELETE в роутах: знак id определяет, что именно править — таблицу `ad_revenues` или поля публикации.

## Фичи (use-case'ы)

Файлы в [features/](features/), один класс на файл, входная точка — `execute(...)`. Все принимают `AsyncSession` в конструктор и **не делают `commit`** — это ответственность вышестоящего слоя.

| Файл | Что делает |
|---|---|
| `create_ad_revenue.py` | Создаёт `AdRevenue`. **Side-effect:** дёргает `ScheduleAdRevenueSnapshots` (baseline + celery countdown на +24ч/+48ч). Если канал указан только username'ом — резолвится в `channel_id`. |
| `get_ad_revenue.py` | Достаёт `AdRevenue` по id+owner. `None` если нет / чужая. |
| `update_ad_revenue.py` | Частичное обновление (`model_dump(exclude_unset=True)`). |
| `delete_ad_revenue.py` | Унифицированное удаление. `id < 0` → чистит рекламные поля у `publication`. `id > 0` → удаляет `AdRevenue` и зачищает связанную публикацию (иначе она «всплывала» бы как синтетическая строка). Возвращает `bool`. |
| `list_ad_revenues.py` | Унифицированный список + сортировка/пагинация в памяти. Подмешивает агрегаты `views/forwards/reactions/comments/clicks` из `TelegramMessage`. |
| `get_ad_revenue_stats.py` | `income_total / expense_total / profit`, счётчики published/scheduled рекламных постов, список валют пользователя. |
| `get_community_stats.py` | По одной строке на канал/бот: доходы, расходы, published/scheduled. Сшивает три источника: `AdRevenue`, `Publication.ad_amount`, `Publication.is_ad` счётчики. |
| `get_monthly_stats.py` | 12 точек (январь–декабрь) для графика. Если задан `channel_id`, расходы дополнительно матчатся по `channel_username` (записи без `channel_id`). |
| `export_ad_revenues.py` | xlsx (`openpyxl`) или csv. Каждая секция (general_income/expense, ads_income/expense) — отдельный лист/блок. |
| `compute_subscribers_metrics.py` | Чистая функция: по `(channel_id, anchor_at)` находит baseline / +24ч / +48ч snapshot'ы и считает `in_24h / out_24h / retention_rate`. Не пишет в БД. |
| `schedule_ad_revenue_snapshots.py` | Снимает baseline-snapshot прямо сейчас + ставит celery-задачи `take_channel_subscribers_snapshot` на +24ч/+48ч. |
| `take_channel_snapshot.py` | Тянет `get_chat_member_count` через бота и пишет строку в `ChannelSubscribersSnapshot`. Сетевой вызов в Telegram. |

## Расчёт цены подписчика (CPS)

CPS на бэкенде **не считается**. Бэкенд возвращает только `subscribers_in_24h`. Цена за подписчика считается на фронте: `amount / subscribers_in_24h`. Если `subscribers_in_24h == None or 0` — фронт отрисовывает `—`.

## Метрики ПДП — окна и допуски

| Поле | Что значит |
|---|---|
| `baseline` | Последний snapshot ДО `anchor_at` (момент рекламной публикации). |
| `after_24h` | Snapshot ближайший к `anchor_at + 24ч`, допуск ±2ч. |
| `after_48h` | Snapshot ближайший к `anchor_at + 48ч`, допуск ±2ч. |
| `in_24h` / `out_24h` | Положительная / отрицательная дельта `after_24h - baseline`. |
| `in_48h` / `out_48h` | То же на 48ч-окно. |
| `retention_rate` | `(in_48h / in_24h) * 100`. Кладётся к 0..100. `None` если `in_24h <= 0`. |

Если хотя бы одного snapshot'а нет — соответствующие поля `None`. На фронте `None` отображается как `—`.

## Поток данных

```
[ user добавляет расход через UI ]
        ↓
   CreateAdRevenue:
     • вставка в ad_revenues
     • ScheduleAdRevenueSnapshots:
         • baseline-snapshot прямо сейчас (TakeChannelSnapshot)
         • celery countdown 24ч → take_channel_subscribers_snapshot
         • celery countdown 48ч → take_channel_subscribers_snapshot
        ↓
[ celery воркеры спустя 24/48ч пишут ещё две точки в channel_subscribers_snapshot ]
        ↓
[ frontend запрашивает /api/ad-revenues/ ]
        ↓
   ListAdRevenues:
     • смерж реальных AdRevenue + Publication.is_ad
     • ComputeSubscribersMetrics → дельты ПДП на каждую строку
     • attach views/clicks из telegram_messages
        ↓
[ AdRevenueResponse с метриками ПДП и метриками поста ]
```

## Особые места

- **Серии с рекламой**: монетарные поля (`ad_amount`, `ad_buyer` и т.д.) хранятся только на первом посте серии (`series_order=0`). `ListAdRevenues` фильтрует `Publication.series_order == 0 OR series_id IS NULL`, иначе один доход дублировался бы N раз.
- **Multi-channel публикации**: если пост `is_ad=true` отправлен в несколько каналов, для метрик ПДП используется список каналов из `publication.channels`; в `AdRevenueResponse.placements` отдаются все каналы с их `post_link`.
- **Currency dropdown**: `GetAdRevenueStats` возвращает `currencies` — все валюты пользователя из `ad_revenues`. Если их меньше двух — фронт дополняет фолбэк-списком `RUB / USD / EUR` чтобы пользователь мог переключаться даже на пустой БД.
- **Channel resolution**: записи могут быть привязаны либо через `channel_id` (FK), либо через `channel_username` (текст, если канал не зарегистрирован). `GetCommunityStats` и `GetMonthlyAdStats` сводят оба случая через индекс `ChannelGroup.username`.

## Конвенции

- **Один файл — один class с `execute(...)`**.
- **Не вызывать `commit`** — это работа роута / celery-таска / теста.
- **Telegram-вызовы** в `take_channel_snapshot.py` ловят `TelegramAPIError` и `TelegramForbiddenError` — возвращают `None` чтобы не валить весь батч ночного cron'а.
- **Celery-импорт** в `schedule_ad_revenue_snapshots.queue_deferred` — **ленивый**, чтобы тесты use-case'а не тянули celery.
- **Shared helpers**: общий `get_channel` лежит в [services/channel/utils/query_utils.py](../channel/utils/query_utils.py), не дублировать.

## Как добавить новую фичу

1. Создай файл `features/<verb>_<noun>.py` (например, `bulk_import_ad_revenues.py`).
2. Внутри — один класс с docstring (1–2 строки), конструктор `__init__(self, db: AsyncSession)`, единственный публичный метод `async def execute(...)`.
3. **Не вызывать `commit`** — работа роута/задачи.
4. Если фича роутается — добавь эндпоинт в [routes/ad_revenues/crud.py](../../routes/ad_revenues/crud.py) с `summary=` и `description=` для каждого `Query/Path/Body` параметра.
5. Тесты — `backend/tests/ad_revenues/test_<verb>_<noun>.py` (фейковая `AsyncSession` через sqlite).

## Что НЕ делать

- Не вызывать celery напрямую из `__init__` или из конструктора — только из `execute()`, и обязательно с ленивым импортом.
- Не записывать в БД из `compute_subscribers_metrics.py` — это pure-функция расчёта по уже загруженным точкам.
- Не дублировать запросы к каналу — `query_utils.get_channel` уже есть в `services/channel/utils/`.
- Не считать CPS на бекенде — это работа фронта (см. выше).
