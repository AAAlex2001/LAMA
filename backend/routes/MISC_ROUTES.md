# Misc routes

Точечные роуты, не относящиеся к основным доменам.

## [knowledge_base.py](knowledge_base.py)

База знаний — статьи + категории + навигация + обратная связь.

| HTTP | Path | Кто читает |
|---|---|---|
| `GET /articles?category=&locale=` | список активных статей | public |
| `GET /articles/slug/{slug}` | статья по slug (полный контент + sections) | public |
| `GET /navigation` | дерево категорий со статьями для бокового меню | public |
| `POST /articles/slug/{slug}/feedback {action}` | helpful / unhelpful counter | public, без авторизации |
| `POST /categories` | создать | admin (на ingress) |
| `PATCH /categories/slug/{slug}` | обновить | admin |
| `DELETE /categories/slug/{slug}` | удалить (cascade на статьи) | admin |
| `POST /articles` | создать | admin |
| `PATCH /articles/slug/{slug}` | обновить (sections — полная замена) | admin |
| `DELETE /articles/slug/{slug}` | удалить | admin |

⚠ Авторизация admin-эндпоинтов не валидируется в коде — должна стоять на ingress/nginx.

Контент хранится в отдельных таблицах KB (не в `landing_*`). Локализация по `?locale=ru|sr|en`. Сервис: `backend/services/knowledge_base.py`.

## [link_preview.py](link_preview.py)

| HTTP | Path |
|---|---|
| `GET /link-preview?url=...` | OpenGraph-превью ссылки |

aiohttp дёргает URL, парсит `<meta og:*>`, `<title>`, `<meta description>`. Используется в редакторе публикации при вставке URL — фронт показывает preview-карточку. Требует `Authorization: Bearer ...`.

Сервис: `backend/services/link_preview.py`.

## [media_upload.py](media_upload.py)

| HTTP | Path |
|---|---|
| `POST /upload-media` (multipart) | загрузка 1..N медиа для публикации |

**Лимиты**: каждый файл ≤ 50 MB, общий ≤ 50 MB.
**Форматы**: image (png/jpg/jpeg/webp/gif), video (mp4/mov/avi/webm), document (pdf/doc/docx/txt/zip/rar).
**Поток**:
1. Чтение всех файлов, валидация формата + размера + общего размера.
2. `storage.upload_file()` ([backend/services/storage.py](../services/storage.py)) — S3/local. Для image/video генерится thumbnail.
3. `warmup_media_files` с **мастер-ботом** ([backend/services/bot_provider.py](../services/bot_provider.py)) — отправка медиа в Telegram, получение `file_id`. Возвращаем эти id фронту. Дальше публикация шлёт по `file_id`, не качая файл повторно.

При ошибке прогрева `file_ids = [None, ...]` — публикация всё равно сможет отправить (упадёт обратно на URL).

## [upload.py](upload.py)

| HTTP | Path |
|---|---|
| `POST /upload-image` (multipart) | загрузка одной картинки для лендинга |

**Лимит**: 5 MB. **Форматы**: png/jpg/jpeg/svg/webp/gif.

Сохраняет в `uploads/landing/{uuid}.{ext}`. Возвращает URL `/uploads/landing/{filename}`. Используется в админке лендинга при добавлении картинок в Hero / Advantages / Templates.

⚠ Эндпоинт **без авторизации**. На проде должен быть закрыт ingress'ом или basic-auth.

## Тестирование

- **knowledge_base** — не покрыто. Контент — простой CRUD + сложный JSON для sections; интеграционный тест в `tests/landing/` достаточно для подтверждения схемы.
- **link_preview** — не покрыто, требует мока aiohttp (полностью stub) + reference html. Малая ценность для unit-тестов.
- **media_upload** — не покрыто, требует мока storage + bot_provider + warmup. Лучше покрывается e2e против тестового бакета.
- **upload** — простая запись в файловую систему. Тест не нужен.

См. подробное описание ограничений в [backend/TESTING.md](../TESTING.md).
