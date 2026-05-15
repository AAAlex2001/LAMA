# services/publications

Главный домен LAMA — всё, что связано с постами Telegram: создание, редактирование, публикация, повторы, серии, шаблоны, теги, шаринг, AI-генерация, календарь, метрики.

## Модели

| Файл | Таблица | Назначение |
|---|---|---|
| [models/publications.py](../../models/publications.py) → `Publication` | `publications` | Главная сущность поста (текст, медиа, статус, расписание, повторы, серия, реклама). |
| ↳ `Tag` | `tags` | Теги пользователя. |
| ↳ `TelegramMessage` | `telegram_messages` | Связь публикации с конкретным сообщением в Telegram (channel_id + telegram_message_id) + метрики (views, forwards, reactions, comments, clicks). |
| ↳ `PublicationSeries` | `publication_series` | Серия (несколько постов с общим именем; первый пост держит ad-поля для всех). |
| ↳ `PublicationNotification` | `publication_notifications` | Лог отправленных уведомлений по публикации. |
| Ассоциативные | `publication_channels`, `publication_tags` | M2M связи. |

## Структура каталога

Сервис разбит на под-домены, каждый в своей папке `features/<subdomain>/`:

| Под-домен | Что лежит |
|---|---|
| `features/publications/` | Core CRUD: create / update / delete / list / get / week-batch / repeat-управление (cancel, stop, exclusion, reschedule), метрики, проекция повторов. |
| `features/publishing/` | Отправка в Telegram: publish_to_channels, send_to_telegram, edit/delete published messages, backup-handling, warmup-media. |
| `features/series/` | CRUD серий + публикация конкретного поста серии. |
| `features/templates/` | CRUD текстовых шаблонов. |
| `features/tags/` | CRUD тегов + get_or_create + поиск. |
| `features/sharing/` | Расшаривание через одноразовый токен (generate / get_by_token / consume). |
| `features/calendar/` | Счётчики по дням, проекция повторов на календарь, последние времена публикаций. |
| `features/ai/` | Генерация и редактирование текста через OpenAI (stream + не-stream). |

## Конвенции

- **Один файл — один class с `execute(...)`**. Состояние не держим, только методы.
- **Не вызываем `commit`** — это работа роута / celery-таска / теста.
- **Утилиты**: общие хелперы лежат в `utils/` (repeat_calculator, html_utils, media_utils, keyboard_utils).
- **`lookup.py`** в каждом под-домене — хелперы поиска (get_X, find_X_or_404) с проверкой владельца.
- **Проверка прав**: use-case'ы принимают `owner_id` и фильтруют по нему. Объект `Publication` уже принадлежит юзеру к моменту прихода в update/delete (роут вызывает `find_publication_or_404`).

## Особые места

- **Повторы** (`repeat_interval`, `repeat_weekdays`, `repeat_excluded_dates` и т.д.) проецируются в реальные времена через `utils/repeat_calculator.py`. На календарь повторы попадают через `merge_repeating` + `projection.make_scheduled_projection` — это легковесные SimpleNamespace-копии, не строки БД.
- **`column_loaders.py`** содержит наборы колонок для `load_only(...)` — используется в compact-выдачах (`list_publications`, `get_week_batch`) чтобы не тянуть тяжёлые поля типа `formatted_content`.
- **Метрики**: суммы из `telegram_messages` дозагружаются через `attach_publication_metrics` одним SQL-запросом на список. Сами «свежие» цифры собираются ночным celery-таском `sync_message_metrics.py` через парсинг `t.me/{channel}/{msg}?embed=1`.
- **Серии с рекламой**: монетарные поля (`ad_amount`, `ad_buyer` и т.д.) хранятся только на первом посте серии (`series_order=0`) — это важно для рекламного кабинета (см. [services/ad_revenues/README.md](../ad_revenues/README.md)).

## Поток данных при публикации

```
[ user сохраняет пост ]
        ↓
   CreatePublication / UpdatePublication
        ↓
   status = SCHEDULED, scheduled_time = X
        ↓
[ celery-beat нашёл время X и вызвал publish_task ]
        ↓
   features/publishing/publish_to_channels:
      • download_media (если url'ы)
      • warmup_media (TG file_id кеш)
      • send_to_telegram → send_media_group / send_single_media
      • save_telegram_messages → строки в telegram_messages
      • finalize_publication → status = PUBLISHED
      • create_notifications (опционально)
        ↓
[ ночной cron: sync_message_metrics обновляет views/clicks ]
```

## Как добавить новую фичу

1. Определи под-домен (`publications/` для CRUD/повторов, `publishing/` для всего, что трогает Telegram API, и т.д.).
2. Создай `features/<subdomain>/<verb>_<noun>.py`.
3. Внутри — один класс с docstring (1–3 строки), `__init__(self, db)`, `async def execute(...)`.
4. Если фича роутается — добавь эндпоинт в `routes/publications/<subdomain>.py` с `summary=` и `description=`.
5. Тесты — `backend/tests/publications/<subdomain>/test_<verb>_<noun>.py`. Conftest наследуется из `backend/tests/publications/conftest.py`.

## Что НЕ делать

- Не вызывать celery напрямую из use-case'а через top-level import — только ленивым импортом внутри метода, чтобы тесты не тянули celery.
- Не дёргать Telegram API из use-case'ов, не лежащих в `features/publishing/`. CRUD над БД — отдельно, отправка — отдельно.
- Не работать с `Publication.repeat_*` руками — пользоваться готовыми use-case'ами `CancelRepeat / StopRepeatFrom / AddRepeatExclusion`, иначе легко забыть какое-то из 11+ полей.
