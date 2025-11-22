# Отчёт: Система команд и автоответов для ботов

## Реализованный функционал

### 1. Личные команды ✅

#### Базовые возможности
- ✅ Статичные команды с ответами (например: `/rules`, `/help`)
- ✅ Поддержка текста, медиа (фото, видео, документы), inline-кнопок
- ✅ Область работы команды:
  - `PRIVATE` — только в личных сообщениях
  - `GROUPS` — только в группах/супергруппах
  - `ALL` — везде
- ✅ Активация/деактивация команд

#### Шорткоды
Поддерживаемые шорткоды в ответах:
- `{user_name}` — имя пользователя
- `{user_username}` — username пользователя (@username)
- `{user_id}` — ID пользователя
- `{bot_name}` — имя бота
- `{date}` — текущая дата (ДД.ММ.ГГГГ)
- `{time}` — текущее время (ЧЧ:ММ)
- `{datetime}` — дата и время

### 2. Триггеры модерации ✅

#### Доступные команды

**Для всех пользователей:**
- `/admin` — вызов администраторов (уведомление всех админов группы)

**Только для администраторов:**
- `/ban @username time` или `/ban time` (ответ на сообщение)
  - Бан пользователя на указанное время
  - Форматы времени: `10m` (минуты), `1h` (часы), `30` (минуты по умолчанию)
  - Без времени — бан навсегда

- `/unban @username` или `/unban` (ответ на сообщение)
  - Разбан пользователя

- `/mute @username time` или `/mute time` (ответ на сообщение)
  - Заглушить пользователя (запрет отправки сообщений)
  - Форматы времени: `10m`, `1h`, `30`

- `/unmute @username` или `/unmute` (ответ на сообщение)
  - Разглушить пользователя

- `/delitetime <секунды>`
  - Настройка автоудаления сообщений для всей группы
  - Telegram API: от 0 до 31536000 секунд (1 год)
  - 0 — отключить автоудаление

### 3. Автоответы на ключевые слова ✅

#### Возможности
- ✅ Триггеры по ключевым словам (список слов)
- ✅ Автоматический поиск ключевых слов в тексте сообщения
- ✅ Поддержка текста, медиа, inline-кнопок, шорткодов
- ✅ Область работы (`PRIVATE`, `GROUPS`, `ALL`)
- ✅ Активация/деактивация автоответов

## Архитектура

### Файлы

#### Модели (`backend/models/bots.py`)
- `CommandScope` — enum для области работы команд
- `BotCommand` — модель команды бота
- `AutoReply` — модель автоответа на ключевые слова

#### Схемы (`backend/schemas/bots.py`)
- `BotCommandCreate`, `BotCommandUpdate`, `BotCommandResponse`, `BotCommandListResponse`
- `AutoReplyCreate`, `AutoReplyUpdate`, `AutoReplyResponse`, `AutoReplyListResponse`

#### Сервисы
- `backend/services/bot/commands.py` — `BotCommandService`
  - CRUD для команд
  - CRUD для автоответов
  - Обработка модерационных команд
  - Поиск команд/автоответов с учётом области работы

- `backend/services/bot/shortcodes.py` — `ShortcodeProcessor`
  - Обработка шорткодов в текстах

#### Роуты (`backend/routes/bots.py`)
**Команды:**
- `POST /bots/{bot_id}/commands` — создать команду
- `GET /bots/{bot_id}/commands` — список команд
- `GET /bots/{bot_id}/commands/{command_id}` — получить команду
- `PUT /bots/{bot_id}/commands/{command_id}` — обновить команду
- `DELETE /bots/{bot_id}/commands/{command_id}` — удалить команду

**Автоответы:**
- `POST /bots/{bot_id}/auto-replies` — создать автоответ
- `GET /bots/{bot_id}/auto-replies` — список автоответов
- `GET /bots/{bot_id}/auto-replies/{auto_reply_id}` — получить автоответ
- `PUT /bots/{bot_id}/auto-replies/{auto_reply_id}` — обновить автоответ
- `DELETE /bots/{bot_id}/auto-replies/{auto_reply_id}` — удалить автоответ

#### Обработка (`backend/tasks/bot_polling.py`)
- Обработка модерационных команд (приоритет)
- Обработка пользовательских команд
- Обработка автоответов на ключевые слова
- Применение шорткодов во всех ответах

## Примеры использования

### 1. Создание команды

```json
POST /api/bots/1/commands
{
  "command": "/rules",
  "description": "Правила группы",
  "response_text": "Привет, {user_name}! Вот правила нашей группы:\n1. Будьте вежливы\n2. Не спамьте",
  "scope": "GROUPS",
  "is_active": true
}
```

### 2. Создание команды с кнопками

```json
POST /api/bots/1/commands
{
  "command": "/start",
  "response_text": "Добро пожаловать, {user_name}!",
  "response_buttons": {
    "buttons": [
      [
        {"text": "🔗 Сайт", "url": "https://example.com"},
        {"text": "📞 Поддержка", "url": "https://t.me/support"}
      ]
    ]
  },
  "scope": "PRIVATE",
  "is_active": true
}
```

### 3. Создание автоответа

```json
POST /api/bots/1/auto-replies
{
  "keywords": ["привет", "здравствуй", "hi"],
  "response_text": "Привет, {user_name}! Как дела?",
  "scope": "ALL",
  "is_active": true
}
```

### 4. Использование модерационных команд

В группе:
- `/admin` — вызвать администраторов
- `/ban 30m` (ответ на сообщение) — забанить на 30 минут
- `/mute 1h` (ответ на сообщение) — заглушить на 1 час
- `/unban` (ответ на сообщение) — разбанить
- `/unmute` (ответ на сообщение) — разглушить
- `/delitetime 3600` — автоудаление через 1 час

## Технические детали

### Приоритет обработки
1. Модерационные команды (`/admin`, `/ban`, `/mute`, и т.д.)
2. Пользовательские команды
3. Автоответы на ключевые слова

### Фильтрация по области работы
- В личных сообщениях: команды/автоответы с `scope = PRIVATE` или `ALL` или `NULL`
- В группах: команды/автоответы с `scope = GROUPS` или `ALL` или `NULL`

### Шорткоды
- Обрабатываются в момент отправки ответа
- Контекст формируется из данных пользователя и бота
- Применяются ко всем типам ответов (команды и автоответы)

### Модерация
- Проверка прав администратора через Telegram API
- `/admin` доступен всем, остальные команды — только админам
- Поддержка ответа на сообщение для указания целевого пользователя
- Парсинг времени: `10m`, `1h`, `30` (минуты по умолчанию)

## Миграция БД

Необходимо создать миграцию для новой таблицы:

```sql
CREATE TABLE bot_auto_replies (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    keywords JSON NOT NULL,
    response_text TEXT NOT NULL,
    response_media_url VARCHAR(512),
    response_media_type VARCHAR(50),
    response_buttons JSON,
    scope VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_bot_auto_replies_bot_id ON bot_auto_replies(bot_id);
CREATE INDEX idx_bot_auto_replies_is_active ON bot_auto_replies(is_active);

-- Добавить scope к bot_commands
ALTER TABLE bot_commands ADD COLUMN scope VARCHAR(50);
```

## Статус

✅ Все задачи выполнены:
1. ✅ Личные команды с ответами
2. ✅ Поддержка шорткодов
3. ✅ Область работы команды (PRIVATE/GROUPS/ALL)
4. ✅ Триггеры модерации (/admin, /ban, /mute, /unban, /unmute, /delitetime)
5. ✅ Автоответы на ключевые слова
6. ✅ Текст, кнопки, медиа, inline-кнопки
7. ✅ Выбор области работы для автоответов

## Готово к тестированию

Система полностью реализована и готова к тестированию.


