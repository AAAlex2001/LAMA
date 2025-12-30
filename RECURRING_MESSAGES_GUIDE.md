# Повторяющиеся сообщения - Полное руководство

## 📋 Содержание
1. [Описание функционала](#описание-функционала)
2. [API Endpoints](#api-endpoints)
3. [Структура данных](#структура-данных)
4. [Примеры использования](#примеры-использования)
5. [Тестирование](#тестирование)
6. [Troubleshooting](#troubleshooting)

---

## Описание функционала

**Повторяющиеся сообщения** - это система автоматической отправки сообщений по расписанию в один или несколько чатов/каналов.

### Основные возможности:

✅ **Автопостинг с периодичностью:**
- Ежечасно (HOURLY)
- Ежедневно (DAILY)
- Еженедельно (WEEKLY)
- Ежемесячно (MONTHLY)
- Кастомный интервал (CUSTOM)

✅ **Множественные каналы/группы:**
- Отправка в один или несколько чатов одновременно
- Указывается массив `target_chats` с ID чатов

✅ **Временные рамки:**
- `start_date` - дата начала (опционально)
- `end_date` - дата окончания (опционально)
- По умолчанию - активно всё время
- Пример: только с 01.09 по 05.09

✅ **Временные точки ("метки"):**
- Массив времени для отправки: `["09:00", "16:00", "21:00"]`
- Можно указать несколько точек
- Учитывается timezone

✅ **Контент:**
- Текст (`text_content`)
- Медиа (`media_url` + `media_type`)
- Inline-кнопки (`inline_buttons`)
- Шорткоды (автоматическая замена)

✅ **Дополнительные фильтры:**
- `weekdays` - дни недели для отправки [1-7]
- `timezone` - часовой пояс

---

## API Endpoints

### 1. Создание повторяющегося сообщения
```
POST /api/bots/{bot_id}/recurring-messages
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:** См. раздел "Структура данных"

---

### 2. Получение списка
```
GET /api/bots/{bot_id}/recurring-messages
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "bot_id": 1,
    "name": "Ежедневное напоминание",
    "text_content": "Проверьте обновления!",
    "target_chats": [-1001234567890],
    "interval_type": "DAILY",
    "interval_value": 1,
    "time_points": ["16:00"],
    "timezone": "Europe/Moscow",
    "is_active": true,
    "next_send_at": "2025-12-30T13:00:00Z",
    "last_sent_at": "2025-12-29T13:00:00Z",
    "created_at": "2025-12-25T10:00:00Z"
  }
]
```

---

### 3. Получение одного сообщения
```
GET /api/bots/{bot_id}/recurring-messages/{message_id}
```

**Headers:**
```
Authorization: Bearer <access_token>
```

---

### 4. Обновление
```
PUT /api/bots/{bot_id}/recurring-messages/{message_id}
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:** Частичное обновление (можно отправить только изменяемые поля)

---

### 5. Удаление
```
DELETE /api/bots/{bot_id}/recurring-messages/{message_id}
```

**Headers:**
```
Authorization: Bearer <access_token>
```

---

## Структура данных

### Полная схема запроса

```json
{
  "name": "Название сообщения (для идентификации)",
  "text_content": "Текст сообщения с шорткодами: {date}, {time}",
  "media_url": "https://example.com/image.jpg",
  "media_type": "PHOTO",
  "inline_buttons": {
    "inline_keyboard": [
      [
        {"text": "Кнопка 1", "url": "https://example.com"},
        {"text": "Кнопка 2", "callback_data": "action_1"}
      ],
      [
        {"text": "Кнопка 3", "url": "https://example.com/page"}
      ]
    ]
  },
  "target_chats": [
    -1001234567890,
    -1009876543210
  ],
  "interval_type": "DAILY",
  "interval_value": 1,
  "time_points": ["09:00", "16:00", "21:00"],
  "timezone": "Europe/Moscow",
  "start_date": "2025-12-30T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "weekdays": [1, 2, 3, 4, 5],
  "is_active": true
}
```

---

### Описание полей

#### Обязательные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | string | Название для идентификации |
| `target_chats` | array[integer] | Массив ID чатов (отрицательные для групп/каналов) |
| `interval_type` | enum | Тип интервала: HOURLY / DAILY / WEEKLY / MONTHLY / CUSTOM |
| `time_points` | array[string] | Временные точки в формате "HH:MM" |
| `timezone` | string | Часовой пояс (например, "Europe/Moscow", "UTC") |

#### Опциональные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `text_content` | string | Текст сообщения (обязателен, если нет медиа) |
| `media_url` | string | URL медиа-файла |
| `media_type` | enum | PHOTO / VIDEO / DOCUMENT / AUDIO |
| `inline_buttons` | object | Inline-клавиатура Telegram |
| `interval_value` | integer | Значение интервала (например, 3 для "каждые 3 часа") |
| `start_date` | datetime | Дата начала (ISO 8601) |
| `end_date` | datetime | Дата окончания (ISO 8601) |
| `weekdays` | array[integer] | Дни недели [1-7]: 1=Пн, 2=Вт, ..., 7=Вс |
| `is_active` | boolean | Активно ли сообщение (по умолчанию true) |

---

### Типы интервалов

#### HOURLY - Ежечасно
```json
{
  "interval_type": "HOURLY",
  "interval_value": 1,
  "time_points": ["00:00"]
}
```
Отправляется каждый час в 00 минут.

**Для "каждые 3 часа":**
```json
{
  "interval_type": "HOURLY",
  "interval_value": 3,
  "time_points": ["00:00"]
}
```

#### DAILY - Ежедневно
```json
{
  "interval_type": "DAILY",
  "interval_value": 1,
  "time_points": ["09:00", "16:00", "21:00"]
}
```
Отправляется каждый день в 09:00, 16:00 и 21:00.

**Для "каждые 2 дня":**
```json
{
  "interval_type": "DAILY",
  "interval_value": 2,
  "time_points": ["12:00"]
}
```

#### WEEKLY - Еженедельно
```json
{
  "interval_type": "WEEKLY",
  "interval_value": 1,
  "time_points": ["10:00"],
  "weekdays": [1, 3, 5]
}
```
Отправляется каждую неделю по Пн, Ср, Пт в 10:00.

#### MONTHLY - Ежемесячно
```json
{
  "interval_type": "MONTHLY",
  "interval_value": 1,
  "time_points": ["12:00"]
}
```
Отправляется 1-го числа каждого месяца в 12:00.

#### CUSTOM - Кастомный интервал
```json
{
  "interval_type": "CUSTOM",
  "interval_value": 180,
  "time_points": ["00:00"]
}
```
Отправляется каждые 180 минут (3 часа).

---

### Временные рамки

#### Без ограничений (активно всегда)
```json
{
  "start_date": null,
  "end_date": null
}
```

#### С датами начала и окончания
```json
{
  "start_date": "2025-09-01T00:00:00Z",
  "end_date": "2025-09-05T23:59:59Z"
}
```
Активно только с 1 по 5 сентября.

#### Только начало
```json
{
  "start_date": "2025-12-30T00:00:00Z",
  "end_date": null
}
```
Начнет работать с 30 декабря и далее бесконечно.

#### Только конец
```json
{
  "start_date": null,
  "end_date": "2025-12-31T23:59:59Z"
}
```
Активно до конца 2025 года.

---

### Фильтр по дням недели

```json
{
  "weekdays": [1, 2, 3, 4, 5]
}
```
Только по будням (Пн-Пт).

```json
{
  "weekdays": [6, 7]
}
```
Только по выходным (Сб-Вс).

```json
{
  "weekdays": null
}
```
Все дни недели (по умолчанию).

---

### Медиа типы

- `PHOTO` - изображение
- `VIDEO` - видео
- `DOCUMENT` - документ/файл
- `AUDIO` - аудио

---

### Inline кнопки

#### Кнопки с URL
```json
{
  "inline_keyboard": [
    [
      {"text": "Открыть сайт", "url": "https://example.com"}
    ]
  ]
}
```

#### Кнопки с callback
```json
{
  "inline_keyboard": [
    [
      {"text": "Действие 1", "callback_data": "action_1"},
      {"text": "Действие 2", "callback_data": "action_2"}
    ]
  ]
}
```

#### Несколько рядов кнопок
```json
{
  "inline_keyboard": [
    [
      {"text": "Кнопка 1", "url": "https://example.com/1"},
      {"text": "Кнопка 2", "url": "https://example.com/2"}
    ],
    [
      {"text": "Кнопка 3", "url": "https://example.com/3"}
    ],
    [
      {"text": "Кнопка 4", "callback_data": "action_4"}
    ]
  ]
}
```

---

### Шорткоды

Поддерживаются следующие шорткоды (автоматическая замена при отправке):

**Дата и время:**
- `{date}` → 30.12.2025
- `{time}` → 16:45
- `{datetime}` → 30.12.2025 16:45

**Данные чата:**
- `{chat_id}` → -1001234567890
- `{chat_title}` → Название чата
- `{chat_type}` → supergroup
- `{member_count}` → 150

**Пользовательские данные** (если применимо):
- `{user_id}` → 123456789
- `{first_name}` → Иван
- `{last_name}` → Петров
- `{username}` → @username
- `{full_name}` → Иван Петров

**Пример текста с шорткодами:**
```
📅 Сегодня {date}, время {time}

Привет, участники чата "{chat_title}"!
У нас уже {member_count} человек 🎉

Не забудьте посетить наш сайт!
```

---

## Примеры использования

### Пример 1: Ежедневное напоминание в одном канале

**Задача:** Отправлять каждый день в 16:00 напоминание в канал.

**Запрос:**
```bash
POST /api/bots/1/recurring-messages
```

```json
{
  "name": "Ежедневное напоминание",
  "text_content": "⏰ Напоминаем: сегодня {date}\n\nНе забудьте проверить обновления!",
  "target_chats": [-1001234567890],
  "interval_type": "DAILY",
  "interval_value": 1,
  "time_points": ["16:00"],
  "timezone": "Europe/Moscow",
  "is_active": true
}
```

---

### Пример 2: Несколько точек отправки в разные каналы

**Задача:** Отправлять в 09:00, 14:00 и 20:00 в два канала.

**Запрос:**
```json
{
  "name": "Тройная отправка",
  "text_content": "📢 Текущее время: {time}\n\nПроверьте новости в чате {chat_title}!",
  "media_url": "https://example.com/news-image.jpg",
  "media_type": "PHOTO",
  "target_chats": [
    -1001234567890,
    -1009876543210
  ],
  "interval_type": "DAILY",
  "time_points": ["09:00", "14:00", "20:00"],
  "timezone": "Europe/Moscow",
  "is_active": true
}
```

---

### Пример 3: Только в рабочие дни

**Задача:** Отправлять с понедельника по пятницу в 10:00.

**Запрос:**
```json
{
  "name": "Рабочие дни",
  "text_content": "☀️ Доброе утро!\n\nНачинаем рабочий день в {chat_title}.",
  "target_chats": [-1001234567890],
  "interval_type": "DAILY",
  "time_points": ["10:00"],
  "timezone": "Europe/Moscow",
  "weekdays": [1, 2, 3, 4, 5],
  "is_active": true
}
```

---

### Пример 4: Временные рамки (акция с 1 по 5 сентября)

**Задача:** Отправлять акционное сообщение только в период акции.

**Запрос:**
```json
{
  "name": "Акция 1-5 сентября",
  "text_content": "🎉 АКЦИЯ!\n\nТолько до 5 сентября - скидка 50%!\n\nУспейте воспользоваться!",
  "inline_buttons": {
    "inline_keyboard": [
      [
        {"text": "Перейти к акции", "url": "https://example.com/sale"}
      ]
    ]
  },
  "target_chats": [-1001234567890],
  "interval_type": "DAILY",
  "time_points": ["12:00", "18:00"],
  "timezone": "Europe/Moscow",
  "start_date": "2025-09-01T00:00:00Z",
  "end_date": "2025-09-05T23:59:59Z",
  "is_active": true
}
```

---

### Пример 5: Каждые 3 часа

**Задача:** Отправлять обновления каждые 3 часа.

**Запрос:**
```json
{
  "name": "Обновления каждые 3 часа",
  "text_content": "🔄 Автоматическое обновление\n\nВремя: {time}\n\nВсе системы работают нормально.",
  "target_chats": [-1001234567890],
  "interval_type": "HOURLY",
  "interval_value": 3,
  "time_points": ["00:00"],
  "timezone": "UTC",
  "is_active": true
}
```

---

### Пример 6: Выходные дни с медиа

**Задача:** Отправлять развлекательный контент по выходным.

**Запрос:**
```json
{
  "name": "Выходные развлечения",
  "text_content": "🎮 Время отдыха!\n\nСегодня {date}, отличный день для развлечений!",
  "media_url": "https://example.com/weekend-fun.mp4",
  "media_type": "VIDEO",
  "inline_buttons": {
    "inline_keyboard": [
      [
        {"text": "🎬 Посмотреть фильмы", "url": "https://example.com/movies"},
        {"text": "🎮 Играть", "url": "https://example.com/games"}
      ],
      [
        {"text": "📚 Почитать", "url": "https://example.com/books"}
      ]
    ]
  },
  "target_chats": [-1001234567890, -1009876543210],
  "interval_type": "WEEKLY",
  "time_points": ["11:00"],
  "timezone": "Europe/Moscow",
  "weekdays": [6, 7],
  "is_active": true
}
```

---

### Пример 7: Ежемесячная рассылка

**Задача:** Отправлять отчет 1-го числа каждого месяца.

**Запрос:**
```json
{
  "name": "Ежемесячный отчет",
  "text_content": "📊 Отчет за прошлый месяц\n\nДата формирования: {date}\n\nСтатистика чата {chat_title}:\n👥 Участников: {member_count}",
  "target_chats": [-1001234567890],
  "interval_type": "MONTHLY",
  "interval_value": 1,
  "time_points": ["09:00"],
  "timezone": "Europe/Moscow",
  "is_active": true
}
```

---

### Пример 8: Обновление существующего сообщения

**Задача:** Изменить текст и время отправки.

**Запрос:**
```bash
PUT /api/bots/1/recurring-messages/5
```

```json
{
  "text_content": "📢 ОБНОВЛЕННЫЙ ТЕКСТ\n\nВремя: {time}",
  "time_points": ["10:00", "17:00"]
}
```

---

## Тестирование

### Шаг 1: Создать тестовое сообщение

**Цель:** Проверить базовую отправку.

```bash
curl -X POST "https://your-domain.com/api/bots/1/recurring-messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Message",
    "text_content": "Test at {time}",
    "target_chats": [-1001234567890],
    "interval_type": "DAILY",
    "time_points": ["16:30"],
    "timezone": "Europe/Moscow",
    "is_active": true
  }'
```

**Ожидаемый результат:**
- Статус 201 Created
- В ответе - созданный объект с ID

---

### Шаг 2: Проверить next_send_at

**Запрос:**
```bash
curl -X GET "https://your-domain.com/api/bots/1/recurring-messages" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Проверить:**
- `next_send_at` указывает на правильное время
- Учитывается `timezone`

---

### Шаг 3: Дождаться отправки

**Ожидать:**
- В указанное время (`time_points`) сообщение отправляется
- Приходит во все чаты из `target_chats`
- Шорткоды заменены

---

### Шаг 4: Проверить логи

**Endpoint (если есть):**
```bash
GET /api/bots/1/recurring-messages/1/logs
```

**Проверить:**
- Успешные отправки (`success: true`)
- `telegram_message_id` заполнен
- `sent_at` соответствует расписанию

---

### Шаг 5: Тест множественных точек

**Создать:**
```json
{
  "name": "Multiple Points Test",
  "text_content": "Time: {time}",
  "target_chats": [-1001234567890],
  "interval_type": "DAILY",
  "time_points": ["14:00", "14:05", "14:10"],
  "timezone": "UTC",
  "is_active": true
}
```

**Ожидать:**
- 3 сообщения: в 14:00, 14:05 и 14:10

---

### Шаг 6: Тест временных рамок

**Создать с прошедшей end_date:**
```json
{
  "name": "Expired Test",
  "text_content": "This should not send",
  "target_chats": [-1001234567890],
  "interval_type": "DAILY",
  "time_points": ["12:00"],
  "end_date": "2025-12-01T00:00:00Z",
  "is_active": true
}
```

**Ожидать:**
- Сообщение НЕ отправляется (end_date в прошлом)

---

### Шаг 7: Тест weekdays

**Создать (только по выходным):**
```json
{
  "name": "Weekend Only",
  "text_content": "Weekend message",
  "target_chats": [-1001234567890],
  "interval_type": "DAILY",
  "time_points": ["12:00"],
  "weekdays": [6, 7],
  "is_active": true
}
```

**Проверить:**
- В будни (Пн-Пт) - НЕ отправляется
- В выходные (Сб-Вс) - отправляется

---

### Шаг 8: Тест is_active

**Деактивировать:**
```bash
curl -X PUT "https://your-domain.com/api/bots/1/recurring-messages/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

**Ожидать:**
- Сообщение больше НЕ отправляется

**Активировать обратно:**
```bash
curl -X PUT "https://your-domain.com/api/bots/1/recurring-messages/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'
```

---

### Шаг 9: Тест удаления

**Запрос:**
```bash
curl -X DELETE "https://your-domain.com/api/bots/1/recurring-messages/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидать:**
- Статус 204 No Content
- Сообщение удалено из списка
- Больше НЕ отправляется

---

## Troubleshooting

### Проблема 1: Сообщение не отправляется

**Возможные причины:**

1. **is_active = false**
   - Проверить: `GET /api/bots/1/recurring-messages/{id}`
   - Решение: Установить `is_active: true`

2. **end_date в прошлом**
   - Проверить поле `end_date`
   - Решение: Убрать или установить будущую дату

3. **Неправильный weekdays**
   - Сегодня не входит в указанные дни
   - Решение: Проверить массив `weekdays`

4. **Scheduler не запущен**
   - Проверить логи бекенда
   - Решение: Перезапустить сервис

5. **Неправильный timezone**
   - Время рассчитывается неверно
   - Решение: Проверить и исправить timezone

---

### Проблема 2: Время отправки неправильное

**Причина:** Неверный timezone

**Решение:**
1. Проверить текущий timezone:
   ```json
   {
     "timezone": "Europe/Moscow"
   }
   ```

2. Использовать правильные значения:
   - `Europe/Moscow` (MSK, UTC+3)
   - `Europe/London` (GMT/BST)
   - `America/New_York` (EST/EDT)
   - `Asia/Tokyo` (JST)
   - `UTC` (базовое)

3. Проверить `next_send_at` в ответе API

---

### Проблема 3: Шорткоды не заменяются

**Причина:** Неправильный синтаксис

**Правильно:**
```
{first_name}
{date}
{time}
```

**Неправильно:**
```
{ first_name }  // пробелы
{firstname}     // без подчеркивания
```

---

### Проблема 4: Кнопки не работают

**Причина:** Неверная структура `inline_buttons`

**Правильно:**
```json
{
  "inline_keyboard": [
    [
      {"text": "Button", "url": "https://example.com"}
    ]
  ]
}
```

**Неправильно:**
```json
{
  "buttons": [...]  // неправильное имя поля
}
```

---

### Проблема 5: Не отправляется в некоторые чаты

**Возможные причины:**

1. **Бот не добавлен в чат**
   - Добавить бота в чат/канал
   - Дать права администратора (для каналов)

2. **Неправильный chat_id**
   - Для групп/каналов ID отрицательный
   - Проверить ID через `@username_to_id_bot`

3. **Бот забанен/удален**
   - Проверить статус бота в чате

---

### Проблема 6: Отправляется слишком часто/редко

**Причина:** Неправильный `interval_value`

**Примеры:**

Каждый час:
```json
{
  "interval_type": "HOURLY",
  "interval_value": 1
}
```

Каждые 3 часа:
```json
{
  "interval_type": "HOURLY",
  "interval_value": 3
}
```

Каждый день:
```json
{
  "interval_type": "DAILY",
  "interval_value": 1
}
```

Каждые 2 дня:
```json
{
  "interval_type": "DAILY",
  "interval_value": 2
}
```

---

### Проблема 7: Медиа не отображается

**Возможные причины:**

1. **Неправильный media_type**
   - Использовать: PHOTO, VIDEO, DOCUMENT, AUDIO
   
2. **Недоступный URL**
   - Проверить доступность `media_url`
   - URL должен быть публичным

3. **Неподдерживаемый формат**
   - Telegram поддерживает ограниченный набор форматов
   - Конвертировать в поддерживаемый формат

---

## Логи и мониторинг

### Проверка next_send_at
```bash
GET /api/bots/1/recurring-messages
```

Посмотреть поле `next_send_at` - это следующее время отправки.

---

### Проверка last_sent_at
Поле `last_sent_at` показывает время последней успешной отправки.

Если `last_sent_at` не обновляется - сообщение не отправляется.

---

### Логи отправок
Таблица `recurring_message_logs` содержит:
- `recurring_message_id` - ID сообщения
- `chat_id` - куда отправлено
- `telegram_message_id` - ID сообщения в Telegram
- `success` - успешно ли
- `error_message` - текст ошибки (если есть)
- `sent_at` - время отправки

---

## Рекомендации

### 1. Naming
Используйте понятные имена:
- ✅ "Ежедневное напоминание"
- ✅ "Акция 1-5 сентября"
- ❌ "Message 1"
- ❌ "Test"

### 2. Timezone
Всегда указывайте правильный timezone для вашей аудитории.

### 3. Тестирование
Перед запуском в продакшн:
1. Создайте тестовое сообщение
2. Установите время через 2-3 минуты
3. Проверьте отправку
4. Только потом запускайте основное

### 4. Мониторинг
Регулярно проверяйте:
- `is_active` всех сообщений
- `next_send_at` - корректность расчета
- Логи отправок

### 5. Контент
- Используйте шорткоды для персонализации
- Добавляйте кнопки для повышения вовлеченности
- Медиа увеличивает внимание к сообщению

---

## Технические детали

### Scheduler
Повторяющиеся сообщения обрабатываются фоновым процессом (scheduler), который запускается каждые 60 секунд.

**Алгоритм:**
1. Получить все активные сообщения где `next_send_at <= now`
2. Проверить фильтры (weekdays, start_date, end_date)
3. Для каждого target_chat отправить сообщение
4. Записать лог отправки
5. Рассчитать следующий `next_send_at`
6. Обновить `last_sent_at`

### Расчет next_send_at
Происходит на основе:
- `interval_type`
- `interval_value`
- `time_points`
- `timezone`
- Текущей даты/времени

### Транзакции
Каждая отправка оборачивается в транзакцию для обеспечения консистентности данных.

---

**Дата последнего обновления:** 30.12.2025
