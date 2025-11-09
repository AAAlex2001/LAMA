# 🤖 Модуль «Боты» - Документация

## Описание

Полноценный модуль для управления Telegram ботами с поддержкой:
- ✅ CRUD операций
- ✅ Синхронизации через Telegram API
- ✅ Real-time обмена сообщениями (polling каждые 3 секунды)
- ✅ Приветственных сообщений
- ✅ Автоодобрения заявок
- ✅ Команд с автоответами
- ✅ Статистики

---

## 📋 Структура модуля

```
backend/
├── models/bots.py          # Модели: Bot, BotMessage, BotCommand
├── schemas/bots.py         # Pydantic схемы для валидации
├── services/bots.py        # Бизнес-логика
├── routes/bots.py          # API endpoints
└── tasks/bot_polling.py    # Real-time обработка сообщений
```

---

## 🚀 Быстрый старт

### 1. Создание бота

**POST** `/bots`

```json
{
  "token": "7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw",
  "description": "Мой первый бот"
}
```

**Ответ:**
```json
{
  "id": 1,
  "telegram_id": 7123456789,
  "username": "my_awesome_bot",
  "first_name": "My Bot",
  "description": "Мой первый бот",
  "status": "ACTIVE",
  "welcome_enabled": false,
  "auto_approval_mode": "MANUAL",
  "created_at": "2025-11-08T10:00:00Z"
}
```

### 2. Синхронизация бота через Telegram API

**POST** `/bots/sync`

```json
{
  "token": "7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
}
```

Или для существующего бота:

**POST** `/bots/{bot_id}/sync`

---

## 📨 Отправка сообщений

### Отправить текстовое сообщение

**POST** `/bots/{bot_id}/messages`

```json
{
  "chat_id": 123456789,
  "text_content": "Привет! Это сообщение от бота."
}
```

### Отправить сообщение с медиа

```json
{
  "chat_id": 123456789,
  "text_content": "Смотри какое фото!",
  "media_url": "https://example.com/photo.jpg",
  "media_type": "PHOTO"
}
```

### Отправить с кнопками

```json
{
  "chat_id": 123456789,
  "text_content": "Выбери действие:",
  "buttons": {
    "buttons": [
      [
        {
          "text": "🔥 Перейти на сайт",
          "url": "https://example.com"
        },
        {
          "text": "❓ Помощь",
          "callback_data": "help"
        }
      ],
      [
        {
          "text": "📞 Связаться с нами",
          "url": "https://t.me/support"
        }
      ]
    ]
  }
}
```

---

## 🎉 Приветственные сообщения

### Настроить приветствие

**PUT** `/bots/{bot_id}/welcome`

```json
{
  "welcome_enabled": true,
  "welcome_message": "👋 Привет! Я бот-помощник.\n\nЧем могу помочь?",
  "welcome_media_url": "https://example.com/welcome.jpg",
  "welcome_media_type": "PHOTO",
  "welcome_buttons": {
    "buttons": [
      [
        {
          "text": "📖 Инструкция",
          "url": "https://example.com/guide"
        },
        {
          "text": "💬 Задать вопрос",
          "callback_data": "ask_question"
        }
      ]
    ]
  }
}
```

### Получить настройки приветствия

**GET** `/bots/{bot_id}/welcome`

---

## ✅ Автоодобрение заявок

### Режимы одобрения:
- `AUTO` - автоматически одобрять всех
- `MANUAL` - ручное одобрение
- `CRITERIA` - по критериям (например, подписка на другие каналы)

### Настроить автоодобрение

**PUT** `/bots/{bot_id}/auto-approval`

```json
{
  "auto_approval_mode": "AUTO"
}
```

Или с критериями:

```json
{
  "auto_approval_mode": "CRITERIA",
  "approval_criteria": {
    "required_channels": [-1001234567890, -1009876543210]
  }
}
```

---

## 🤖 Команды и автоответы

### Создать команду

**POST** `/bots/{bot_id}/commands`

```json
{
  "command": "/start",
  "description": "Приветствие",
  "response_text": "👋 Добро пожаловать! Я помогу вам с...",
  "is_active": true
}
```

### Команда с медиа и кнопками

```json
{
  "command": "/help",
  "description": "Помощь",
  "response_text": "📖 Вот что я умею:",
  "response_media_url": "https://example.com/help.jpg",
  "response_media_type": "PHOTO",
  "response_buttons": {
    "buttons": [
      [
        {
          "text": "📞 Связаться с поддержкой",
          "url": "https://t.me/support"
        }
      ]
    ]
  },
  "is_active": true
}
```

### Получить все команды

**GET** `/bots/{bot_id}/commands`

### Обновить команду

**PUT** `/bots/{bot_id}/commands/{command_id}`

```json
{
  "response_text": "Обновлённый текст ответа",
  "is_active": false
}
```

### Удалить команду

**DELETE** `/bots/{bot_id}/commands/{command_id}`

---

## 📊 Статистика

**GET** `/bots/{bot_id}/stats`

**Ответ:**
```json
{
  "bot_id": 1,
  "total_messages": 1523,
  "incoming_messages": 892,
  "outgoing_messages": 631,
  "total_commands": 5,
  "active_commands": 4,
  "last_message_at": "2025-11-08T15:30:00Z"
}
```

---

## 💬 История сообщений

### Получить все сообщения бота

**GET** `/bots/{bot_id}/messages?page=1&page_size=50`

### Фильтровать по чату

**GET** `/bots/{bot_id}/messages?chat_id=123456789`

### Только входящие сообщения

**GET** `/bots/{bot_id}/messages?is_incoming=true`

### Только исходящие сообщения

**GET** `/bots/{bot_id}/messages?is_incoming=false`

---

## 🔄 CRUD операции

### Получить список ботов

**GET** `/bots?page=1&page_size=50`

Фильтр по статусу:

**GET** `/bots?status=ACTIVE`

Статусы: `ACTIVE`, `INACTIVE`, `ERROR`

### Получить бота по ID

**GET** `/bots/{bot_id}`

### Обновить бота

**PUT** `/bots/{bot_id}`

```json
{
  "description": "Обновлённое описание",
  "status": "ACTIVE"
}
```

### Удалить бота

**DELETE** `/bots/{bot_id}`

---

## ⚡ Real-time обработка

Модуль автоматически обрабатывает входящие сообщения каждые **3 секунды** через polling.

### Что обрабатывается:
- ✅ Текстовые сообщения
- ✅ Фото, видео, документы
- ✅ Стикеры, анимации
- ✅ Голосовые сообщения
- ✅ Команды с автоответами
- ✅ Заявки на вступление (с автоодобрением)

### Автоматические действия:
1. **Сохранение всех сообщений** в БД
2. **Автоответ на команды** (если настроены)
3. **Приветствие новых пользователей** (при `/start`)
4. **Автоодобрение заявок** (если включено)

---

## 🎯 Типы медиа

Поддерживаемые типы:
- `TEXT` - текст
- `PHOTO` - фото
- `VIDEO` - видео
- `DOCUMENT` - документ
- `AUDIO` - аудио
- `VOICE` - голосовое сообщение
- `STICKER` - стикер
- `ANIMATION` - GIF/анимация

---

## 🔐 Webhook (опционально)

Для production рекомендуется использовать webhook вместо polling.

### Включить webhook

**PUT** `/bots/{bot_id}`

```json
{
  "is_webhook_enabled": true,
  "webhook_url": "https://yourdomain.com/webhook/bot/{bot_id}"
}
```

⚠️ **Важно:** При включении webhook, polling для этого бота автоматически отключается.

---

## 📝 Примеры использования

### Пример 1: Бот с приветствием и командами

```bash
# 1. Создать бота
curl -X POST http://localhost:8000/bots \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_BOT_TOKEN",
    "description": "Бот поддержки"
  }'

# 2. Настроить приветствие
curl -X PUT http://localhost:8000/bots/1/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "welcome_enabled": true,
    "welcome_message": "Привет! Я бот поддержки."
  }'

# 3. Добавить команду /start
curl -X POST http://localhost:8000/bots/1/commands \
  -H "Content-Type: application/json" \
  -d '{
    "command": "/start",
    "response_text": "Добро пожаловать!",
    "is_active": true
  }'

# 4. Добавить команду /help
curl -X POST http://localhost:8000/bots/1/commands \
  -H "Content-Type: application/json" \
  -d '{
    "command": "/help",
    "response_text": "Список команд:\n/start - начало\n/help - помощь",
    "is_active": true
  }'
```

### Пример 2: Бот с автоодобрением

```bash
# Настроить автоодобрение
curl -X PUT http://localhost:8000/bots/1/auto-approval \
  -H "Content-Type: application/json" \
  -d '{
    "auto_approval_mode": "AUTO"
  }'
```

### Пример 3: Отправка сообщения пользователю

```bash
curl -X POST http://localhost:8000/bots/1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": 123456789,
    "text_content": "Ваш заказ готов!",
    "buttons": {
      "buttons": [
        [
          {
            "text": "Забрать заказ",
            "url": "https://example.com/order/123"
          }
        ]
      ]
    }
  }'
```

---

## 🏗️ Архитектура

### Модели (SQLAlchemy)
- `Bot` - основная модель бота
- `BotMessage` - история сообщений
- `BotCommand` - команды с автоответами

### Сервисы
- `BotService` - вся бизнес-логика
  - CRUD операции
  - Синхронизация с Telegram
  - Отправка сообщений
  - Управление командами
  - Статистика

### Задачи (Background)
- `process_bot_updates()` - каждые 3 секунды
  - Получение новых сообщений
  - Обработка команд
  - Автоответы
  - Автоодобрение

---

## ⚙️ Конфигурация

### Частота polling
По умолчанию: **3 секунды**

Изменить в `backend/scheduler.py`:

```python
scheduler.add_job(
    process_bot_updates,
    trigger=IntervalTrigger(seconds=3),  # <- изменить здесь
    ...
)
```

### Connection Pool
Используется общий пул подключений к БД:
- `pool_size=50`
- `max_overflow=100`

---

## 🔍 Troubleshooting

### Бот не отвечает на сообщения
1. Проверьте статус бота: `GET /bots/{bot_id}`
2. Убедитесь, что `status=ACTIVE`
3. Проверьте логи scheduler'а
4. Убедитесь, что polling включен (`is_webhook_enabled=false`)

### Команды не работают
1. Проверьте, что команда активна: `is_active=true`
2. Убедитесь, что команда начинается с `/`
3. Проверьте список команд: `GET /bots/{bot_id}/commands`

### Приветствие не отправляется
1. Проверьте `welcome_enabled=true`
2. Убедитесь, что пользователь отправил `/start`
3. Проверьте `welcome_message` не пустое

---

## 🎓 Best Practices

1. **Используйте webhook в production** - меньше нагрузка, быстрее ответ
2. **Настройте команды заранее** - пользователи любят `/help`
3. **Включите приветствие** - первое впечатление важно
4. **Мониторьте статистику** - следите за активностью
5. **Обрабатывайте ошибки** - проверяйте статус бота

---

## 📚 Связанные модули

- **Публикации** (`/publications`) - для массовых рассылок
- **Каналы** (`/channels`) - для управления каналами
- **Инбокс** (будущий модуль) - для CRM-функций

---

## 🚀 Roadmap

- [ ] Webhook handler
- [ ] Callback query обработка
- [ ] Inline query поддержка
- [ ] Группировка сообщений (threads)
- [ ] Расширенная аналитика
- [ ] A/B тестирование сообщений

---

**Модуль готов к использованию!** 🎉

Все endpoints доступны по адресу: `http://localhost:8000/bots`

Документация API: `http://localhost:8000/docs#/Bots`

