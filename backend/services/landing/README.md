# services/landing

Контент маркетинг-сайта: Hero, Header, Tools, Advantages, Key Advantages, FAQ, Pricing, Users, Lama, Footer + посадочные страницы под `slug` (templates). Каждая секция — отдельный модуль с парой `get_*_content` / `save_*_content`. Все секции хранятся в **двух общих таблицах**: `landing_sections` (метаданные секции) + `landing_contents` (поля по ключам с локализацией).

## Точки входа

Один роутер [routes/landing.py](../../routes/landing.py) с 24 эндпоинтами. Все принимают `?locale=ru|sr|en`, default `ru`.

| HTTP | Path | Use-case |
|---|---|---|
| `GET / PUT` | `/hero` | `hero.get_hero_content` / `save_hero_content` |
| `GET / PUT` | `/header` | `header.get_header_content` / `save_header_content` |
| `GET / PUT` | `/tools` | `tools.get_tools_content` / `save_tools_content` |
| `GET / PUT` | `/advantages` | `advantages.*` |
| `GET / PUT` | `/key-advantages` | `key_advantages.*` |
| `GET / PUT` | `/pricing` | `pricing.*` |
| `GET / PUT` | `/faq` | `faq.*` |
| `GET / PUT` | `/users` | `users.*` (счётчик-блок, не auth-юзеры!) |
| `GET / PUT` | `/lama` | `lama.*` (раздел про сам сервис) |
| `GET / PUT` | `/footer` | `footer.*` |
| `GET` | `/templates` | `templates.list_templates` |
| `GET` | `/templates/{id}` | `templates.get_template` |
| `GET` | `/templates/slug/{slug}` | `templates.get_template_by_slug` |
| `GET / PUT` | `/templates/slug/{slug}/content` | `templates.get_template_content` / `save_template_content` |
| `POST` | `/templates` | `templates.create_template` |
| `PATCH` | `/templates/slug/{slug}` | `templates.update_template` |
| `DELETE` | `/templates/slug/{slug}` | `templates.delete_template` |

## Модель данных

```
landing_sections
  id, section_type (HERO/HEADER/TOOLS/...), title, is_active, order

landing_contents
  id, section_id → landing_sections.id
  content_type (TEXT / IMAGE / LINK / ...)
  locale (RU / SR / EN)
  key (например "hero_headline", "hero_image_landing_1", "advantages_card_3_title")
  title, text, image_url, image_alt, link_url, link_text
  is_active, order
```

`save_*_content` для каждой секции делает **полную замену контента для текущей локали**: `DELETE FROM landing_contents WHERE section_id=? AND locale=?`, потом `INSERT` всех ключей секции. Это даёт чистый upsert без поштучного апдейта.

Для multi-locale: каждая локаль — отдельная порция строк `landing_contents` с тем же `section_id`.

## Структура каталога

| Файл | Секция |
|---|---|
| [hero.py](hero.py) | Hero: headline + paragraph×2 + кнопка + 2 группы изображений (landing + template) |
| [header.py](header.py) | Шапка: бренд, навигация, кнопки логина/регистрации, soc-link |
| [tools.py](tools.py) | Tools: список инструментов (название + иконка + описание + ссылка) |
| [advantages.py](advantages.py) | Карточки преимуществ (заголовок + текст + опц. CTA-кнопка) |
| [key_advantages.py](key_advantages.py) | Иконные преимущества (icon + title + description) |
| [pricing.py](pricing.py) | Тарифы (название + цена + features-список + кнопка) |
| [faq.py](faq.py) | FAQ-вопросы + кнопки "Помощь" |
| [users.py](users.py) | Блок "Нас уже N пользователей" + кнопка |
| [lama.py](lama.py) | Блок про канал автора (headline, channel, кнопка) |
| [footer.py](footer.py) | Подвал: бренд, копирайт, соц-сети, колонки ссылок |
| [templates.py](templates.py) | Посадочные страницы под slug (отдельная таблица + JSON-контент со сложной структурой) |

## Особые места

### Локализация

`parse_locale("ru" | "sr" | "en")` маппит query-параметр на enum `Locale`. Дефолт — `RU`. Внутри каждого `get_*_content` все запросы фильтруются `WHERE locale = ?`.

Если для какой-то локали контент не записан — `get_*` вернёт пустые строки (а не fallback на `RU`).

### Полная замена при сохранении

Каждый `save_*_content` делает:
1. Найти/создать `landing_sections` с нужным `section_type` (одна строка на весь проект, не привязана к локали).
2. `DELETE` всех `landing_contents` с этим `section_id` **и** этой `locale`.
3. `INSERT` новых строк.

Это значит: апдейт под одну локаль не трогает другие. Изменение только текста в RU не затронет SR-копию.

### Префиксированные ключи для коллекций

Где много однотипных элементов (изображения, карточки, FAQ-айтемы) — ключи нумерованные: `hero_image_landing_1`, `hero_image_landing_2`, ..., `advantages_card_3_title`. На чтение сервис собирает их обратно в массив, на запись — заново нумерует с 1.

### `hero_image_landing_*` vs `hero_image_template_*`

Hero имеет **две разные группы картинок**:
- `hero_image_landing_*` — иллюстрации на главной;
- `hero_image_template_*` — иллюстрации, которые рендерятся на страницах посадочных шаблонов.

Legacy-ключ `hero_image_*` (без суффикса) тоже поддерживается на чтение и трактуется как landing.

### Templates — нечто другое

`templates.*` живёт в отдельных таблицах (не в `landing_contents`). Это посадочные страницы под slug со сложной структурой:
- `headline`, `lead`, `body`
- `images[]`, `blocks[]` (заголовок + подзаголовок + advantages + image)
- `faq{}`, `cardsBlock{}`, `subscribeBlock{}`, `subscribeBlocks[]`

Контент хранится как JSON; запись — полная замена для locale.

### Анонимный доступ

**Все эндпоинты публичные** — нет `get_current_user`. Это интенционально: лендинг должен открываться неавторизованным юзерам. `PUT/POST/PATCH/DELETE` тоже без авторизации (!) — в текущей версии админ-доступ должен ставиться на уровне nginx/ingress по IP или basic-auth, либо переведён на `get_current_admin` (TODO).

⚠ **Безопасность**: с текущей конфигурацией любой может перезаписать контент лендинга. Перед продом эндпоинты с PUT/POST/PATCH/DELETE нужно закрыть `Depends(get_current_admin)`.

### Unit of Work

Все `save_*_content` используют `db.flush()` (через DELETE+INSERT), без `db.commit()`. Транзакция управляется `get_db`. На ошибку в середине save — всё откатится.

## Что НЕ покрыто

- **Кэширование** — нет. Каждый GET — это N запросов в БД (section + contents). Простая optимизация: добавить Redis-кэш с инвалидацией на save.
- **Версионирование контента** — нет. История изменений теряется.
- **CDN-инвалидация после save** — нет. Если фронт деплоится статически (Next.js SSG), нужно дёргать webhook ревалидации.
- **Авторизация** — все mutation-эндпоинты сейчас публичные (см. выше).
