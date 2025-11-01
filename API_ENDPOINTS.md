# API Endpoints Documentation

**Base URL:** `http://193.42.125.13:8000`

---

## 🔐 1. Модуль: Аутентификация (`/auth`)

### 1.1 Регистрация
**POST** `http://193.42.125.13:8000/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ожидаемый ответ (200):**
```json
{
  "message": "registered",
  "user_email": "user@example.com"
}
```

**Ошибки:**
- `400` - Неверный email или пароль
- `422` - Ошибка валидации (некорректный формат email или пароль < 8 символов)

---

### 1.2 Логин
**POST** `http://193.42.125.13:8000/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ожидаемый ответ (200):**
```json
{
  "access_token": "fake-token-for:user@example.com",
  "token_type": "bearer"
}
```

**Ошибки:**
- `401` - Неверные учетные данные
- `422` - Ошибка валидации (некорректный формат email или пароль < 8 символов)

---

### 1.3 Авторизация через Telegram
**POST** `http://193.42.125.13:8000/auth/login/telegram`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "auth_date": 1697234567,
  "hash": "a1b2c3d4e5f6789abcdef..."
}
```

**Поля:**
- `id` (required, int) - ID пользователя Telegram
- `first_name` (optional, string) - Имя
- `last_name` (optional, string) - Фамилия
- `username` (optional, string) - Username без @
- `auth_date` (required, int) - Unix timestamp авторизации
- `hash` (required, string) - HMAC-SHA256 подпись для проверки

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "user_id": 123456789,
  "token": "fake-token-for:123456789"
}
```

**Ошибки:**
- `401` - Неверная подпись Telegram hash
- `500` - Telegram bot token не настроен
- `422` - Ошибка валидации

---

## 📰 2. Модуль: Публикации (`/publications`)

### 2.1 Создание публикации
**POST** `http://193.42.125.13:8000/publications`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON) - Полный пример со всеми полями:**
```json
{
  "content_type": "text_with_media",
  "text": "Текст публикации с поддержкой Markdown",
  "media": [
    {
      "url": "https://example.com/image.jpg",
      "blur": false,
      "caption": "Подпись к фото"
    }
  ],
  "poll": {
    "question": "Ваш любимый язык программирования?",
    "options": [
      {"text": "Python"},
      {"text": "JavaScript"},
      {"text": "Go"}
    ],
    "is_quiz": true,
    "correct_option_id": 0,
    "is_anonymous": false,
    "allows_multiple_answers": false
  },
  "inline_buttons": [
    [
      {
        "text": "Перейти на сайт",
        "url": "https://example.com"
      },
      {
        "text": "Действие",
        "callback_data": "action_123"
      }
    ]
  ],
  "link": "https://example.com/article",
  "channel_ids": ["channel123", "channel456"],
  "tags": ["новости", "технологии"],
  "is_draft": false,
  "scheduled_at": "2024-01-15T12:00:00Z",
  "timezone": "Europe/Moscow",
  "auto_pin": true,
  "auto_delete": {
    "enabled": true,
    "hours": 24
  },
  "series_id": "series_123"
}
```

**Типы контента (`content_type`):**
- `text` - Только текст
- `text_with_media` - Текст + медиа
- `image` - Изображение
- `video` - Видео
- `audio` - Аудио
- `document` - Документ
- `link` - Ссылка
- `poll` - Опрос
- `quiz` - Викторина

**Медиа (`media`):**
- `url` (required) - URL медиафайла
- `blur` (optional, default: false) - Блюр, отменяется по нажатию
- `caption` (optional) - Подпись к медиа

**Опрос (`poll`):**
- `question` (required) - Вопрос
- `options` (required) - Массив вариантов `[{"text": "Вариант 1"}]`
- `is_quiz` (optional, default: false) - Викторина с правильным ответом
- `correct_option_id` (optional) - ID правильного ответа (для викторины)
- `is_anonymous` (optional, default: true) - Анонимный опрос
- `allows_multiple_answers` (optional, default: false) - Множественный выбор

**Inline кнопки (`inline_buttons`):**
- Массив рядов кнопок: `[[button1, button2], [button3]]`
- Кнопка: `{"text": "Текст", "url": "https://..."}` ИЛИ `{"text": "Текст", "callback_data": "data"}`

**Автоудаление (`auto_delete`):**
- `enabled` (required) - Включено автоудаление
- `hours` (required) - Часов до удаления (1, 24, 36, 48, 60, 72)

**Ожидаемый ответ (201):**
```json
{
  "id": "pub_123",
  "content_type": "text_with_media",
  "text": "Текст публикации",
  "media": [...],
  "status": "scheduled",
  "channel_ids": ["channel123"],
  "tags": ["новости"],
  "scheduled_at": "2024-01-15T12:00:00Z",
  "published_at": null,
  "timezone": "Europe/Moscow",
  "auto_pin": true,
  "auto_delete": {...},
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

---

### 2.2 Получение публикации по ID
**GET** `http://193.42.125.13:8000/publications/{publication_id}`

**Ожидаемый ответ (200):**
```json
{
  "id": "pub_123",
  "content_type": "text",
  "text": "Текст публикации",
  "status": "scheduled",
  "channel_ids": ["channel123"],
  "tags": ["новости"]
}
```

**Ошибки:**
- `404` - Публикация не найдена

---

### 2.3 Список публикаций
**GET** `http://193.42.125.13:8000/publications?status=scheduled&channel_id=channel123&tags=новости&series_id=series_123`

**Query параметры:**
- `status` (optional) - Фильтр: `draft`, `scheduled`, `published`, `failed`, `deleted`
- `tags` (optional) - Массив тегов: `?tags=новости&tags=технологии`
- `channel_id` (optional) - ID канала
- `series_id` (optional) - ID сериала

**Ожидаемый ответ (200):**
```json
[
  {
    "id": "pub_123",
    "content_type": "text",
    "text": "Заголовок",
    "status": "scheduled",
    "scheduled_at": "2024-01-15T12:00:00Z"
  }
]
```

---

### 2.4 Обновление публикации
**PUT** `http://193.42.125.13:8000/publications/{publication_id}`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON) - все поля опциональны:**
```json
{
  "text": "Обновленный текст",
  "media": [...],
  "poll": {...},
  "inline_buttons": [...],
  "link": "https://example.com/new-link",
  "channel_ids": ["channel123"],
  "tags": ["новости"],
  "scheduled_at": "2024-01-15T14:00:00Z",
  "timezone": "Europe/Moscow",
  "auto_pin": true,
  "auto_delete": {
    "enabled": true,
    "hours": 48
  }
}
```

**Ожидаемый ответ (200):**
```json
{
  "id": "pub_123",
  "text": "Обновленный текст",
  "status": "scheduled"
}
```

**Ошибки:**
- `404` - Публикация не найдена

---

### 2.5 Удаление публикации
**DELETE** `http://193.42.125.13:8000/publications/{publication_id}`

**Ожидаемый ответ (204):**
```
No Content
```

**Ошибки:**
- `404` - Публикация не найдена

---

### 2.6 Предпросмотр публикации
**POST** `http://193.42.125.13:8000/publications/preview`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "content_type": "text",
  "text": "Текст для предпросмотра",
  "media": [...],
  "poll": {...},
  "inline_buttons": [...]
}
```

**Ожидаемый ответ (200):**
```json
{
  "text": "Текст публикации",
  "media": [...],
  "poll": {...},
  "inline_buttons": [...],
  "formatted_html": "<p>Отформатированный HTML для предпросмотра</p>"
}
```

---

### 2.7 Календарь публикаций
**GET** `http://193.42.125.13:8000/publications/calendar/{year}/{month}`

**Пример:** `GET /publications/calendar/2024/1`

**Ожидаемый ответ (200):**
```json
[
  {
    "date": "2024-01-15",
    "publications": [
      {
        "id": "pub_123",
        "text": "Заголовок",
        "scheduled_at": "2024-01-15T12:00:00Z"
      }
    ]
  }
]
```

---

### 2.8 Перенос публикации
**PATCH** `http://193.42.125.13:8000/publications/{publication_id}/reschedule`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "scheduled_at": "2024-01-15T14:00:00Z",
  "timezone": "Europe/Moscow"
}
```

**Ожидаемый ответ (200):**
```json
{
  "id": "pub_123",
  "scheduled_at": "2024-01-15T14:00:00Z",
  "timezone": "Europe/Moscow"
}
```

**Ошибки:**
- `404` - Публикация не найдена

---

### 2.9 Создание сериала публикаций
**POST** `http://193.42.125.13:8000/publications/series`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Сериал публикаций",
  "publications": [
    {
      "content_type": "text",
      "text": "Публикация 1",
      "channel_ids": ["channel123"],
      "scheduled_at": "2024-01-15T12:00:00Z"
    },
    {
      "content_type": "text",
      "text": "Публикация 2",
      "channel_ids": ["channel123"],
      "scheduled_at": "2024-01-16T12:00:00Z"
    }
  ]
}
```

**Ожидаемый ответ (201):**
```json
{
  "id": "series_123",
  "name": "Сериал публикаций",
  "publications": [...],
  "created_at": "2024-01-01T10:00:00Z"
}
```

---

### 2.10 Получение сериала по ID
**GET** `http://193.42.125.13:8000/publications/series/{series_id}`

**Ожидаемый ответ (200):**
```json
{
  "id": "series_123",
  "name": "Сериал публикаций",
  "publications": [...],
  "created_at": "2024-01-01T10:00:00Z"
}
```

**Ошибки:**
- `404` - Сериал не найден

---

### 2.11 AI текстовый редактор
**POST** `http://193.42.125.13:8000/publications/ai/text`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON) - Генерация:**
```json
{
  "action": "generate",
  "prompt": "Напиши статью о технологиях на 500 слов"
}
```

**Body (raw JSON) - Редактирование:**
```json
{
  "action": "edit",
  "text": "Исходный текст для редактирования",
  "instruction": "Сделай текст более формальным"
}
```

**Ожидаемый ответ (200):**
```json
{
  "text": "Сгенерированный или отредактированный текст..."
}
```

---

### 2.12 Отправка уведомления о статусе
**POST** `http://193.42.125.13:8000/publications/notify`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "publication_id": "pub_123",
  "status": "success",
  "message": "Публикация успешно опубликована",
  "channel_id": "channel123",
  "error_details": null
}
```

**Поля статуса:**
- `success` - Успешная публикация
- `error` - Ошибка при публикации

**Ожидаемый ответ (200):**
```json
{
  "publication_id": "pub_123",
  "status": "success",
  "message": "Публикация успешно опубликована",
  "channel_id": "channel123"
}
```

---

## 📱 3. Модуль: Telegram (`/telegram`)

### 3.1 Публикация в канал
**POST** `http://193.42.125.13:8000/telegram/publish`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "channel_id": "channel123",
  "publication_id": "pub_123",
  "publication": {
    "content_type": "text",
    "text": "Текст публикации",
    "channel_ids": ["channel123"]
  }
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "message_id": 12345,
  "channel_id": "channel123"
}
```

**Ошибки:**
- `400` - Ошибка публикации (проверь `error` в ответе)

---

### 3.2 Редактирование сообщения
**POST** `http://193.42.125.13:8000/telegram/edit`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "channel_id": "channel123",
  "message_id": 12345,
  "new_text": "Обновленный текст"
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

**Ошибки:**
- `400` - Ошибка редактирования

---

### 3.3 Удаление сообщения
**POST** `http://193.42.125.13:8000/telegram/delete`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "channel_id": "channel123",
  "message_id": 12345
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

**Ошибки:**
- `400` - Ошибка удаления

---

### 3.4 Закрепление сообщения
**POST** `http://193.42.125.13:8000/telegram/pin?channel_id=channel123&message_id=12345`

**Query параметры:**
- `channel_id` (required) - ID канала
- `message_id` (required) - ID сообщения

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

**Ошибки:**
- `400` - Ошибка закрепления

---

### 3.5 Открепление сообщения
**POST** `http://193.42.125.13:8000/telegram/unpin?channel_id=channel123&message_id=12345`

**Query параметры:**
- `channel_id` (required) - ID канала
- `message_id` (required) - ID сообщения

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

**Ошибки:**
- `400` - Ошибка открепления

---

### 3.6 Получение информации о канале
**GET** `http://193.42.125.13:8000/telegram/channel/{channel_id}`

**Ожидаемый ответ (200):**
```json
{
  "id": "channel123",
  "title": "Название канала",
  "username": "channel_username",
  "members_count": 1000
}
```

**Ошибки:**
- `404` - Канал не найден

---

## 🤖 4. Модуль: Боты (`/bots`)

### 4.1 Создание бота
**POST** `http://193.42.125.13:8000/bots`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  "name": "My Bot"
}
```

**Поля:**
- `token` (required, min 10 символов) - Токен Telegram Bot API
- `name` (optional) - Человеко-читаемое имя бота

**Ожидаемый ответ (201):**
```json
{
  "id": "8308599165",
  "username": "LAMMAPLANNERBOT",
  "name": "My Bot",
  "description": null,
  "photo_url": null,
  "created_at": "2025-11-01T16:00:14.182825",
  "welcome_enabled": false,
  "auto_approve_mode": "manual",
  "description_suffix": null
}
```

**Ошибки:**
- `400` - Ошибка создания бота

---

### 4.2 Список ботов
**GET** `http://193.42.125.13:8000/bots`

**Ожидаемый ответ (200):**
```json
[
  {
    "id": "8308599165",
    "username": "LAMMAPLANNERBOT",
    "name": "My Bot",
    "description": "Bot description",
    "photo_url": "https://example.com/photo.jpg",
    "created_at": "2025-11-01T16:00:14.182825",
    "welcome_enabled": false,
    "auto_approve_mode": "manual",
    "description_suffix": null
  }
]
```

---

### 4.3 Получение бота по ID
**GET** `http://193.42.125.13:8000/bots/{bot_id}`

**Ожидаемый ответ (200):**
```json
{
  "id": "8308599165",
  "username": "LAMMAPLANNERBOT",
  "name": "My Bot",
  "description": "Bot description",
  "photo_url": "https://example.com/photo.jpg",
  "created_at": "2025-11-01T16:00:14.182825",
  "welcome_enabled": false,
  "auto_approve_mode": "manual",
  "description_suffix": null
}
```

**Ошибки:**
- `404` - Бот не найден

---

### 4.4 Обновление бота
**PATCH** `http://193.42.125.13:8000/bots/{bot_id}`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON) - все поля опциональны:**
```json
{
  "name": "Updated Bot Name",
  "description": "Updated bot description",
  "photo_url": "https://example.com/bot-photo.jpg",
  "welcome_enabled": true,
  "welcome_config": {
    "enabled": true,
    "greet_message": {
      "text": "Привет! Добро пожаловать в наш канал!\n\n{firstname}, рады видеть вас здесь! 🎉"
    },
    "rules_message": {
      "text": "Правила канала:\n1. Будьте вежливы\n2. Не спамьте\n3. Соблюдайте тематику"
    },
    "allow_rules": {
      "require_memberships": ["@channel1", "@channel2"],
      "captcha_enabled": true
    },
    "mode": "rules"
  },
  "auto_approve_mode": "auto",
  "description_suffix": "Создано при помощи сервиса @LamaPlanner"
}
```

**Примечания:**
- `name` и `description` обновляются в профиле бота в Telegram
- `photo_url` сохраняется в системе, но фото профиля нужно обновлять вручную в Telegram
- `welcome_config` позволяет полностью настроить приветственное сообщение и правила допуска

**Режимы автодопуска (`auto_approve_mode`):**
- `auto` - Автоматическое одобрение
- `manual` - Ручное одобрение
- `rules` - По правилам (капча, подписки)

**Структура `welcome_config`:**
- `enabled` (boolean) - Включить приветственного бота
- `greet_message` (DMTemplate) - Приветственное сообщение пользователю
- `rules_message` (DMTemplate, optional) - Сообщение с правилами
- `allow_rules` - Правила допуска:
  - `require_memberships` (array) - Список каналов для обязательной подписки
  - `captcha_enabled` (boolean) - Включить капчу
- `mode` - Режим работы ("auto", "manual", "rules")

**Шорткоды в сообщениях:**
- `{firstname}` - Имя пользователя
- `{lastname}` - Фамилия пользователя
- `{fullname}` - Полное имя
- `{username}` - Username без @
- `{date}` - Текущая дата (YYYY-MM-DD)
- `{datetime}` - Дата и время (YYYY-MM-DD HH:MM)

**Ожидаемый ответ (200):**
```json
{
  "id": "8308599165",
  "username": "LAMMAPLANNERBOT",
  "name": "Updated Bot Name",
  "description": "Updated bot description",
  "photo_url": "https://example.com/bot-photo.jpg",
  "created_at": "2025-11-01T16:00:14.182825",
  "welcome_enabled": true,
  "auto_approve_mode": "auto",
  "description_suffix": "Создано при помощи сервиса @LamaPlanner"
}
```

**Ошибки:**
- `404` - Бот не найден

---

### 4.5 Удаление бота
**DELETE** `http://193.42.125.13:8000/bots/{bot_id}`

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

**Ошибки:**
- `404` - Бот не найден

---

### 4.6 Отправка DM (Личное сообщение)
**POST** `http://193.42.125.13:8000/bots/send-dm`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON) - Простой текст:**
```json
{
  "bot_id": "8308599165",
  "user_id": 5078754101,
  "message": {
    "text": "Привет!"
  }
}
```

**Body (raw JSON) - С inline кнопками:**
```json
{
  "bot_id": "8308599165",
  "user_id": 5078754101,
  "message": {
    "text": "Выберите действие:",
    "inline_buttons": [
      [
        {
          "text": "Перейти на сайт",
          "url": "https://example.com"
        },
        {
          "text": "Действие",
          "callback_data": "action_123"
        }
      ]
    ]
  }
}
```

**Body (raw JSON) - С медиа:**
```json
{
  "bot_id": "8308599165",
  "user_id": 5078754101,
  "message": {
    "text": "Смотри фото:",
    "media": [
      {
        "type": "photo",
        "url": "https://example.com/image.jpg",
        "caption": "Подпись к фото"
      }
    ]
  }
}
```

**Body (raw JSON) - С опросом:**
```json
{
  "bot_id": "8308599165",
  "user_id": 5078754101,
  "message": {
    "poll": {
      "question": "Ваш любимый язык?",
      "options": ["Python", "JavaScript", "Go"],
      "is_anonymous": true,
      "quiz": false
    }
  }
}
```

**Body (raw JSON) - С автоудалением:**
```json
{
  "bot_id": "8308599165",
  "user_id": 5078754101,
  "message": {
    "text": "Сообщение удалится через 24 часа",
    "auto_delete": {
      "hours": 24
    }
  }
}
```

**Поля `DMTemplate` (message):**
- `text` (optional) - Текст сообщения
- `inline_buttons` (optional) - Массив рядов кнопок: `[[button1], [button2, button3]]`
  - Кнопка: `{"text": "Текст", "url": "https://..."}` ИЛИ `{"text": "Текст", "callback_data": "data"}`
  - ⚠️ **Важно:** У кнопки должен быть либо `url`, либо `callback_data`, не оба одновременно
- `media` (optional) - Массив медиафайлов:
  - `type`: `"photo"` | `"video"` | `"document"`
  - `url` (required) - URL медиафайла
  - `caption` (optional) - Подпись
- `media_urls` (optional) - Простой список URL медиа: `["https://...", "https://..."]`
- `poll` (optional) - Опрос:
  - `question` (required) - Вопрос
  - `options` (required) - Массив строк: `["Вариант 1", "Вариант 2"]`
  - `is_anonymous` (optional, default: true) - Анонимный опрос
  - `quiz` (optional, default: false) - Викторина
  - `correct_option_id` (optional) - ID правильного ответа (для викторины)
- `auto_delete` (optional) - Автоудаление:
  - `hours` (required) - Через сколько часов удалить

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "message_id": 12345
}
```

**Ошибки:**
- `400` - Ошибка отправки

---

### 4.7 Telegram Webhook
**POST** `http://193.42.125.13:8000/bots/{bot_id}/webhook`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON) - Пример Update от Telegram:**
```json
{
  "update_id": 123456,
  "message": {
    "message_id": 1,
    "from": {
      "id": 123456789,
      "first_name": "John",
      "username": "johndoe"
    },
    "chat": {
      "id": 123456789,
      "type": "private"
    },
    "text": "Hello"
  }
}
```

**Ожидаемый ответ (200):**
```json
{
  "ok": true
}
```

---

### 4.8 Установка Webhook
**POST** `http://193.42.125.13:8000/bots/{bot_id}/set-webhook`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "url": "https://example.com/webhook",
  "secret_token": "secret123"
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "url": "https://example.com/webhook"
}
```

**Ошибки:**
- `400` - Ошибка установки webhook

---

### 4.9 Отправка сообщения
**POST** `http://193.42.125.13:8000/bots/send`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_id": 123456789,
  "message": {
    "text": "Привет!",
    "inline_buttons": [[{"text": "Кнопка", "url": "https://example.com"}]]
  }
}
```

**Типы получателей (`target_type`):**
- `user` - Пользователь
- `chat` - Группа/супергруппа
- `channel` - Канал

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "sent": 1
}
```

**Ошибки:**
- `400` - Ошибка отправки

---

### 4.10 Планирование сообщения
**POST** `http://193.42.125.13:8000/bots/schedule`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON) - Разовое сообщение (`once`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789, 987654321],
  "message": {
    "text": "Запланированное сообщение"
  },
  "schedule": {
    "type": "once",
    "run_at": "2024-01-15T12:00:00Z",
    "timezone": "Europe/Moscow"
  }
}
```

**Body (raw JSON) - Ежедневно (`daily`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789],
  "message": {
    "text": "Ежедневное сообщение"
  },
  "schedule": {
    "type": "daily",
    "daily_time": "09:00:00",
    "timezone": "Europe/Moscow"
  }
}
```

**Body (raw JSON) - Еженедельно (`weekly`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789],
  "message": {
    "text": "Еженедельное сообщение"
  },
  "schedule": {
    "type": "weekly",
    "daily_time": "09:00:00",
    "weekly_days": [0, 2, 4],
    "timezone": "Europe/Moscow"
  }
}
```

**Body (raw JSON) - По будням (`weekdays`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789],
  "message": {
    "text": "Сообщение по будням"
  },
  "schedule": {
    "type": "weekdays",
    "daily_time": "09:00:00",
    "timezone": "Europe/Moscow"
  }
}
```

**Body (raw JSON) - Ежемесячно (`monthly`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789],
  "message": {
    "text": "Ежемесячное сообщение"
  },
  "schedule": {
    "type": "monthly",
    "daily_time": "09:00:00",
    "monthly_days": [1, 15],
    "timezone": "Europe/Moscow"
  }
}
```

**Body (raw JSON) - По точкам времени (`points`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789],
  "message": {
    "text": "Сообщение в указанное время"
  },
  "schedule": {
    "type": "points",
    "points": [
      {"at": "09:00:00"},
      {"at": "12:00:00"},
      {"at": "18:00:00"}
    ],
    "timezone": "Europe/Moscow"
  }
}
```

**Body (raw JSON) - Сериал (`series`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789],
  "message": {
    "text": "Первое сообщение сериала"
  },
  "schedule": {
    "type": "series",
    "run_at": "2024-01-15T12:00:00Z",
    "timezone": "Europe/Moscow"
  }
}
```

**Body (raw JSON) - С фильтрацией аудитории (`audience`):**
```json
{
  "bot_id": "bot_123",
  "target_type": "user",
  "target_ids": [123456789, 987654321],
  "message": {
    "text": "Сообщение только для одобренных"
  },
  "schedule": {
    "type": "once",
    "run_at": "2024-01-15T12:00:00Z"
  },
  "audience": {
    "applicants": "approved",
    "membership_required": ["@channel1", "@channel2"],
    "has_captcha": true,
    "recent_days": 30,
    "exclude_received_series_id": "series_123"
  }
}
```

**Типы расписания (`schedule.type`):**
- `once` - Разовое отправление
- `daily` - Ежедневно в указанное время
- `weekly` - Еженедельно в указанные дни недели (0=понедельник, 6=воскресенье)
- `weekdays` - По будням (пн-пт)
- `monthly` - Ежемесячно в указанные дни месяца (1-31)
- `points` - По точкам времени
- `series` - Сериал сообщений

**Фильтры аудитории (`audience`):**
- `applicants` - Фильтр по статусу заявки: `"all"` | `"approved"` | `"declined"` | `"no_response"`
- `membership_required` - Требуется подписка на каналы/группы (массив ID)
- `has_captcha` - Прошёл ли капчу (`true` | `false`)
- `recent_days` - Только пользователи с заявкой за последние N дней
- `exclude_received_series_id` - Исключить получивших сериал с указанным ID

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "scheduled": 2
}
```

**Ошибки:**
- `400` - Ошибка планирования (неверный тип расписания или параметры)

---

### 4.11 Статистика бота
**GET** `http://193.42.125.13:8000/bots/{bot_id}/stats`

**Ожидаемый ответ (200):**
```json
{
  "bot_id": "bot_123",
  "clicks_by_callback": {
    "button_1": 100,
    "button_2": 50
  },
  "total_users": 1000,
  "blocked_users": 10,
  "deliveries_ok": 5000,
  "deliveries_fail": 50
}
```

---

### 4.12 Список команд бота
**GET** `http://193.42.125.13:8000/bots/{bot_id}/commands`

**Ожидаемый ответ (200):**
```json
{
  "bot_id": "bot_123",
  "commands": {
    "/start": {
      "text": "Привет! Это стартовая команда"
    },
    "/help": {
      "text": "Справка",
      "inline_buttons": [[{"text": "Документация", "url": "https://docs.example.com"}]]
    }
  }
}
```

---

### 4.13 Установка команды
**POST** `http://193.42.125.13:8000/bots/{bot_id}/commands`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "command": "/start",
  "response": {
    "text": "Привет! Это стартовая команда",
    "inline_buttons": [[{"text": "Начать", "callback_data": "start_action"}]]
  }
}
```

**Ожидаемый ответ (200):**
```json
{
  "bot_id": "bot_123",
  "commands": {
    "/start": {
      "text": "Привет! Это стартовая команда",
      "inline_buttons": [[{"text": "Начать", "callback_data": "start_action"}]]
    }
  }
}
```

---

### 4.14 Удаление команды
**DELETE** `http://193.42.125.13:8000/bots/{bot_id}/commands/{command}`

**Пример:** `DELETE /bots/bot_123/commands/start`

**Ожидаемый ответ (200):**
```json
{
  "bot_id": "bot_123",
  "commands": {}
}
```

---

### 4.15 WebSocket для событий
**WebSocket** `ws://193.42.125.13:8000/bots/{bot_id}/ws`

**Подключение:**
```javascript
const ws = new WebSocket('ws://193.42.125.13:8000/bots/bot_123/ws');
ws.onmessage = (event) => {
  console.log(JSON.parse(event.data));
};
```

**Формат событий:**
```json
{
  "type": "message_sent",
  "data": {
    "user_id": 123456789,
    "message_id": 12345
  }
}
```

---

### 4.16 Предпросмотр сообщения
**POST** `http://193.42.125.13:8000/bots/preview`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_123",
  "message": {
    "text": "Привет, {{user.first_name}}! Сегодня {{date}}",
    "inline_buttons": [[{"text": "Кнопка", "url": "https://example.com"}]]
  },
  "user_id": 123456789,
  "timezone": "Europe/Moscow"
}
```

**Ожидаемый ответ (200):**
```json
{
  "rendered_text": "Привет, John! Сегодня 15.01.2024"
}
```

---

### 4.17 Настройка ветвления (branch mapping)
**POST** `http://193.42.125.13:8000/bots/{bot_id}/branch`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "callback_data_1": {
    "bot_id": "bot_456",
    "target_id": "target123",
    "message": {
      "text": "Сообщение для ветвления"
    }
  },
  "callback_data_2": {
    "bot_id": "bot_789",
    "target_id": "target456",
    "message": {
      "text": "Другое сообщение"
    }
  }
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "size": 2
}
```

---

### 4.18 Одобрение запроса на вступление
**POST** `http://193.42.125.13:8000/bots/{bot_id}/approve`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "chat_id": "chat123",
  "user_id": 123456789
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.19 Отклонение запроса на вступление
**POST** `http://193.42.125.13:8000/bots/{bot_id}/decline`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "chat_id": "chat123",
  "user_id": 123456789
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.20 Настройка рабочих чатов
**POST** `http://193.42.125.13:8000/bots/{bot_id}/working-chats`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "chat_ids": ["chat123", "chat456"]
}
```

**Примечание:** Если `chat_ids` пустой или null, бот будет работать во всех чатах.

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.21 Обновление профиля бота
**PATCH** `http://193.42.125.13:8000/bots/{bot_id}/profile`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "New Bot Name",
  "description": "Новое описание бота",
  "photo_url": "https://example.com/bot_photo.jpg"
}
```

**Поля:**
- `name` (optional) - Имя бота
- `description` (optional) - Описание бота
- `photo_url` (optional) - URL фото профиля (⚠️ может быть не поддерживается через Bot API)

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

**Ошибки:**
- `400` - Ошибка обновления

---

### 4.22 Сохранение шаблона
**POST** `http://193.42.125.13:8000/bots/{bot_id}/templates`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "template_id": "welcome_message",
  "message": {
    "text": "Добро пожаловать, {{user.first_name}}!",
    "inline_buttons": [[{"text": "Начать", "callback_data": "start"}]]
  }
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.23 Список шаблонов
**GET** `http://193.42.125.13:8000/bots/{bot_id}/templates`

**Ожидаемый ответ (200):**
```json
{
  "welcome_message": {
    "text": "Добро пожаловать, {{user.first_name}}!",
    "inline_buttons": [[{"text": "Начать", "callback_data": "start"}]]
  },
  "help_message": {
    "text": "Справка по боту"
  }
}
```

---

### 4.24 Удаление шаблона
**DELETE** `http://193.42.125.13:8000/bots/{bot_id}/templates/{template_id}`

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.25 Копирование расписания
**POST** `http://193.42.125.13:8000/bots/{bot_id}/copy-schedule`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_target",
  "target_type": "user",
  "target_ids": ["123456789"],
  "message": {
    "text": "Сообщение"
  },
  "schedule": {
    "type": "once",
    "run_at": "2024-01-15T12:00:00Z"
  }
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "scheduled": 1
}
```

---

### 4.26 Блокировка пользователя
**POST** `http://193.42.125.13:8000/bots/moderate/ban`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_123",
  "chat_id": "chat123",
  "user_id": 123456789,
  "minutes": 60,
  "reason": "Нарушение правил"
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

**Ошибки:**
- `400` - Ошибка блокировки

---

### 4.27 Заглушка пользователя
**POST** `http://193.42.125.13:8000/bots/moderate/mute`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_123",
  "chat_id": "chat123",
  "user_id": 123456789,
  "minutes": 30,
  "reason": "Спам"
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.28 Исключение пользователя
**POST** `http://193.42.125.13:8000/bots/moderate/kick`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_123",
  "chat_id": "chat123",
  "user_id": 123456789,
  "reason": "Нарушение"
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.29 Разблокировка пользователя
**POST** `http://193.42.125.13:8000/bots/moderate/unban`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_123",
  "chat_id": "chat123",
  "user_id": 123456789,
  "reason": "Разблокировка"
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.30 Снятие заглушки
**POST** `http://193.42.125.13:8000/bots/moderate/unmute`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bot_id": "bot_123",
  "chat_id": "chat123",
  "user_id": 123456789,
  "reason": "Снятие заглушки"
}
```

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

### 4.31 Настройка триггера
**POST** `http://193.42.125.13:8000/bots/{bot_id}/trigger-config`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "trigger_type": "join_request_created",
  "delay_minutes": 5,
  "message": {
    "text": "Привет! Ваша заявка на рассмотрении."
  }
}
```

**Типы триггеров (`trigger_type`):**
- `join_request_created` - Создана заявка на вступление
- `join_request_approved` - Заявка одобрена
- `join_request_declined` - Заявка отклонена
- `member_joined` - Пользователь присоединился
- `member_left` - Пользователь покинул
- `captcha_passed` - Капча пройдена
- `captcha_failed` - Капча не пройдена
- `user_message` - Сообщение от пользователя
- `user_command` - Команда от пользователя
- `button_click` - Нажатие на кнопку

**Задержка (один из параметров обязателен):**
- `delay_minutes` - Задержка в минутах
- `delay_hours` - Задержка в часах
- `delay_days` - Задержка в днях

**Ожидаемый ответ (200):**
```json
{
  "success": true,
  "trigger_type": "join_request_created"
}
```

---

### 4.32 Получение конфигурации триггеров
**GET** `http://193.42.125.13:8000/bots/{bot_id}/trigger-config`

**Ожидаемый ответ (200):**
```json
{
  "bot_id": "bot_123",
  "triggers": {
    "join_request_created": {
      "trigger_type": "join_request_created",
      "delay_minutes": 5,
      "message": {
        "text": "Привет! Ваша заявка на рассмотрении."
      }
    }
  }
}
```

---

### 4.33 Удаление конфигурации триггера
**DELETE** `http://193.42.125.13:8000/bots/{bot_id}/trigger-config/{trigger_type}`

**Ожидаемый ответ (200):**
```json
{
  "success": true
}
```

---

## 💬 5. Модуль: Inbox (Переписка) (`/inbox`)

### 5.1 Список тредов
**GET** `http://193.42.125.13:8000/inbox/{bot_id}?user_id=123456789&from_ts=2024-01-01T00:00:00Z&to_ts=2024-01-31T23:59:59Z&query=текст`

**Query параметры (все опциональны):**
- `user_id` - Фильтр по ID пользователя
- `from_ts` - Начало периода (ISO 8601)
- `to_ts` - Конец периода (ISO 8601)
- `query` - Поиск по тексту сообщений

**Ожидаемый ответ (200):**
```json
{
  "threads": [
    {
      "bot_id": "bot_123",
      "user_id": 123456789,
      "messages": [
        {
          "user_id": 123456789,
          "direction": "in",
          "text": "Привет!",
          "ts": "2024-01-01T12:00:00Z"
        },
        {
          "user_id": 123456789,
          "direction": "out",
          "text": "Привет! Как дела?",
          "ts": "2024-01-01T12:01:00Z"
        }
      ]
    }
  ]
}
```

**Направление сообщения (`direction`):**
- `in` - Входящее от пользователя
- `out` - Исходящее от админа

---

## 🏥 6. Системные эндпоинты

### 6.1 Проверка здоровья
**GET** `http://193.42.125.13:8000/health`

**Ожидаемый ответ (200):**
```json
{
  "status": "ok"
}
```

---

## 📚 Swagger документация

**URL:** `http://193.42.125.13:8000/docs`

**ReDoc:** `http://193.42.125.13:8000/redoc`

---

## 🔑 Важные замечания

### Структура сообщений (DMTemplate)

Все сообщения в модуле ботов используют единую структуру `DMTemplate`:

```json
{
  "text": "Текст сообщения",
  "inline_buttons": [
    [
      {"text": "Кнопка 1", "url": "https://example.com"},
      {"text": "Кнопка 2", "callback_data": "action_123"}
    ],
    [
      {"text": "Кнопка 3", "url": "https://example.com/other"}
    ]
  ],
  "media": [
    {
      "type": "photo",
      "url": "https://example.com/image.jpg",
      "caption": "Подпись"
    }
  ],
  "media_urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "poll": {
    "question": "Вопрос?",
    "options": ["Вариант 1", "Вариант 2"],
    "is_anonymous": true,
    "quiz": false
  },
  "auto_delete": {
    "hours": 24
  }
}
```

**⚠️ Важно для inline_buttons:**
- У кнопки должен быть **либо** `url`, **либо** `callback_data`, не оба одновременно
- Кнопки организованы в ряды: `[[ряд1_кнопки], [ряд2_кнопки]]`

### Типы расписания

- `once` - Требует `run_at`
- `daily` - Требует `daily_time` и `timezone`
- `weekly` - Требует `daily_time`, `weekly_days` (0-6, где 0=понедельник) и `timezone`
- `weekdays` - Требует `daily_time` и `timezone`
- `monthly` - Требует `daily_time`, `monthly_days` (1-31) и `timezone`
- `points` - Требует `points` (массив времени) и `timezone`
- `series` - Требует `run_at` и `timezone`

### Фильтры аудитории

Используются при планировании сообщений для таргетинга:
- `applicants` - Статус заявки: все/одобренные/отклонённые/без ответа
- `membership_required` - Требуется подписка на каналы/группы
- `has_captcha` - Прохождение капчи
- `recent_days` - Активность за последние N дней
- `exclude_received_series_id` - Исключить получивших определённый сериал
