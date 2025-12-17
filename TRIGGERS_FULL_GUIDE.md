# 🎯 Полное руководство по триггерам LAMA

## 📋 Оглавление

1. [Типы триггеров](#типы-триггеров)
2. [Типы действий](#типы-действий)
3. [Шорткоды](#шорткоды)
4. [Все случаи использования](#все-случаи-использования)
5. [API примеры](#api-примеры)

---

## Типы триггеров

### 1️⃣ JOIN_REQUEST_CREATED
**Когда:** Пользователь подал заявку на вступление
**Куда отправляется:** В ЛС пользователю
**Контекст:**
- `{user.first_name}` - имя пользователя
- `{user.username}` - username (@username)
- `{chat.title}` - название группы

### 2️⃣ JOIN_REQUEST_APPROVED
**Когда:** Заявка на вступление одобрена
**Куда отправляется:** В ЛС пользователю
**Контекст:** То же что и JOIN_REQUEST_CREATED

### 3️⃣ JOIN_REQUEST_REJECTED
**Когда:** Заявка на вступление отклонена
**Куда отправляется:** В ЛС пользователю
**Контекст:** 
- Все как в JOIN_REQUEST_CREATED
- `missing_channels` - список недостающих подписок (если режим CRITERIA)

### 4️⃣ MEMBER_JOINED
**Когда:** Пользователь вступил в группу
**Куда отправляется:** В группу
**Контекст:**
- `{user.first_name}`, `{user.username}`, `{user.last_name}`
- `{chat.title}`

### 5️⃣ MEMBER_LEFT
**Когда:** Пользователь покинул группу
**Куда отправляется:** В группу
**Контекст:** То же что и MEMBER_JOINED

### 6️⃣ CAPTCHA_PASSED
**Когда:** Пользователь правильно решил капчу
**Куда отправляется:** В группу
**Контекст:**
- `{user.first_name}`, `{user.username}`
- `pending_id` - ID заявки

### 7️⃣ CAPTCHA_FAILED
**Когда:** Пользователь неправильно решил капчу
**Куда отправляется:** В группу
**Контекст:**
- То же что и CAPTCHA_PASSED
- `answer` - неправильный ответ пользователя

### 8️⃣ USER_MESSAGE
**Когда:** Пользователь написал боту в ЛС или в группе
**Куда отправляется:** Туда, откуда пришло сообщение
**Контекст:**
- `{user.first_name}`, `{user.username}`
- `{chat.title}` - если в группе

### 9️⃣ COMMAND_CALLED
**Когда:** Пользователь вызвал команду (/start, /help и т.д.)
**Куда отправляется:** Туда, откуда вызвана команда
**Контекст:** То же что и USER_MESSAGE

---

## Типы действий

### SEND_MESSAGE
Отправить текстовое сообщение

```json
{
  "text": "Текст с {user.first_name} шорткодами",
  "buttons": {
    "buttons": [
      [{"text": "Кнопка 1", "url": "https://example.com"}],
      [{"text": "Кнопка 2", "callback_data": "action"}]
    ]
  }
}
```

### SEND_MEDIA
Отправить медиа (фото/видео/документ)

```json
{
  "text": "Подпись к медиа",
  "media_url": "https://example.com/image.jpg",
  "media_type": "PHOTO",
  "buttons": {...}
}
```

Типы медиа: `PHOTO`, `VIDEO`, `DOCUMENT`, `AUDIO`, `VOICE`, `ANIMATION`

### MUTE_USER
Заглушить пользователя (отключить возможность писать)

```json
{
  "duration_minutes": 60
}
```

### BAN_USER
Забанить пользователя

```json
{
  "duration_minutes": 1440,
  "revoke_messages": true
}
```

---

## Шорткоды

### Пользователь
- `{user.id}` - ID пользователя
- `{user.first_name}` - имя
- `{user.username}` - username (@username)
- `{user.last_name}` - фамилия

### Бот
- `{bot.first_name}` - имя бота

### Чат
- `{chat.title}` - название группы/канала

### Время
- `{date}` - текущая дата (DD.MM.YYYY)
- `{time}` - текущее время (HH:MM)
- `{datetime}` - дата и время (DD.MM.YYYY HH:MM)

---

## Все случаи использования

### 📥 Кейс 1: Уведомление о заявке
```json
{
  "name": "Заявка получена",
  "trigger_type": "JOIN_REQUEST_CREATED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 Привет, {user.first_name}!\n\nТвоя заявка на вступление в {chat.title} получена.\nМы рассмотрим её в течение 24 часов."
  },
  "delay_minutes": 0,
  "is_active": true
}
```

### ✅ Кейс 2: Заявка одобрена
```json
{
  "name": "Заявка одобрена",
  "trigger_type": "JOIN_REQUEST_APPROVED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "🎉 Поздравляем, {user.first_name}!\n\nТвоя заявка одобрена. Добро пожаловать в {chat.title}!"
  },
  "is_active": true
}
```

### ❌ Кейс 3: Заявка отклонена
```json
{
  "name": "Заявка отклонена",
  "trigger_type": "JOIN_REQUEST_REJECTED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "😔 К сожалению, твоя заявка в {chat.title} отклонена.\n\nПопробуй подписаться на наши каналы и подать заявку снова."
  },
  "is_active": true
}
```

### 🎊 Кейс 4: Приветствие в группе
```json
{
  "name": "Приветствие при вступлении",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "🎉 Добро пожаловать, {user.first_name}!\n\nРады видеть тебя в {chat.title}!\n\n📌 Обязательно прочитай правила в закрепе.",
    "buttons": {
      "buttons": [
        [{"text": "📋 Правила", "url": "https://t.me/c/123456/1"}],
        [{"text": "💬 Задать вопрос админу", "url": "https://t.me/admin"}]
      ]
    }
  },
  "is_active": true
}
```

### 👋 Кейс 5: Прощание
```json
{
  "name": "Прощание при выходе",
  "trigger_type": "MEMBER_LEFT",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 {user.first_name} покинул(а) нас.\n\nБудем скучать! Возвращайся!"
  },
  "is_active": true
}
```

### ✅ Кейс 6: Капча пройдена
```json
{
  "name": "Капча успешно пройдена",
  "trigger_type": "CAPTCHA_PASSED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "✅ {user.first_name} успешно прошел(ла) капчу!\n\nДобро пожаловать!"
  },
  "is_active": true
}
```

### ❌ Кейс 7: Капча не пройдена
```json
{
  "name": "Ошибка в капче",
  "trigger_type": "CAPTCHA_FAILED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "❌ {user.first_name} ошибся(лась) в капче.\n\nПопробуй ещё раз!"
  },
  "is_active": true
}
```

### ⏱️ Кейс 8: Отложенное приветствие
```json
{
  "name": "Напоминание через 24 часа",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 Привет, {user.first_name}!\n\nПрошли сутки с момента твоего вступления.\n\nНе забудь представиться в чате!"
  },
  "delay_minutes": 1440,
  "is_active": true
}
```

### 🔇 Кейс 9: Мут за спам (через триггер USER_MESSAGE)
```json
{
  "name": "Мут за частые сообщения",
  "trigger_type": "USER_MESSAGE",
  "action_type": "MUTE_USER",
  "action_data": {
    "duration_minutes": 60
  },
  "filters": {
    "user_ids": [123456789]
  },
  "is_active": false
}
```

### 🚫 Кейс 10: Бан за нарушения
```json
{
  "name": "Бан нарушителя",
  "trigger_type": "CAPTCHA_FAILED",
  "action_type": "BAN_USER",
  "action_data": {
    "duration_minutes": 43200,
    "revoke_messages": true
  },
  "filters": {
    "user_ids": [987654321]
  },
  "is_active": false
}
```

### 📅 Кейс 11: Окно доставки (только в рабочее время)
```json
{
  "name": "Приветствие в рабочее время",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 Здравствуйте, {user.first_name}!\n\nРабочее время: 9:00-18:00 МСК"
  },
  "delivery_window": {
    "start_hour": 9,
    "end_hour": 18,
    "timezone": "Europe/Moscow"
  },
  "is_active": true
}
```

### 🎯 Кейс 12: Фильтр по группе
```json
{
  "name": "Приветствие только в VIP группе",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "🌟 Добро пожаловать в VIP группу, {user.first_name}!"
  },
  "filters": {
    "chat_ids": [-1002657482202]
  },
  "is_active": true
}
```

---

## API примеры

### Создать триггер
```bash
POST https://lamaplanner.com/api/bots/1/triggers
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Приветствие",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "Привет, {user.first_name}!"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

### Получить список триггеров
```bash
GET https://lamaplanner.com/api/bots/1/triggers
Authorization: Bearer YOUR_JWT_TOKEN
```

### Обновить триггер
```bash
PUT https://lamaplanner.com/api/bots/1/triggers/1
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Новое название",
  "is_active": false
}
```

### Удалить триггер
```bash
DELETE https://lamaplanner.com/api/bots/1/triggers/1
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📊 Итоговая таблица триггеров

| Триггер | Когда | Куда | Частые кейсы |
|---------|-------|------|--------------|
| `JOIN_REQUEST_CREATED` | Заявка подана | ЛС | Уведомление о получении |
| `JOIN_REQUEST_APPROVED` | Заявка одобрена | ЛС | Поздравление |
| `JOIN_REQUEST_REJECTED` | Заявка отклонена | ЛС | Объяснение причины |
| `MEMBER_JOINED` | Вступил в группу | Группа | Приветствие |
| `MEMBER_LEFT` | Покинул группу | Группа | Прощание |
| `CAPTCHA_PASSED` | Капча пройдена | Группа | Поздравление |
| `CAPTCHA_FAILED` | Капча не пройдена | Группа | Предупреждение |
| `USER_MESSAGE` | Написал боту | Туда же | Автоответ |
| `COMMAND_CALLED` | Вызвал команду | Туда же | Помощь |

---

**Документация актуальна на:** 17.12.2025


