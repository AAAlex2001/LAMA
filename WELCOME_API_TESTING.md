# API для тестирования функционала приветствий

## 🔑 Базовый URL
```
https://193.42.125.13/api
```

---

## 📋 Endpoints

### 1. Получить настройки приветствия бота

```http
GET https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "application/json"
}
```

**Path Parameters:**
- `bot_id` - ID бота (integer)

**Response 200:**
```json
{
  "welcome_enabled": false,
  "welcome_message": null,
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

### 2. Обновить настройки приветствия (базовое приветствие)

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {firstname}! 👋\nДобро пожаловать в {chat_title}!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

**Response 200:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {firstname}! 👋\nДобро пожаловать в {chat_title}!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

### 3. Приветствие с шорткодами и текстом

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Здравствуй, {firstname}! 🎉\n\nДобро пожаловать в нашу группу \"{chat_title}\"!\n\nТвой username: @{username}\nСегодня: {date}\nВремя: {time}\n\nТвой ID: {user_id}",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

### 4. Приветствие с изображением

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {firstname}! 👋\nДобро пожаловать!",
  "welcome_media_url": "https://i.imgur.com/example.jpg",
  "welcome_media_type": "PHOTO",
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

**Типы медиа:**
- `"PHOTO"` - изображение
- `"VIDEO"` - видео
- `"ANIMATION"` - GIF/анимация
- `"DOCUMENT"` - документ

---

### 5. Приветствие с кнопками

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {firstname}! 🎉\nДобро пожаловать в {chat_title}!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": {
    "buttons": [
      [
        {
          "text": "📜 Правила группы",
          "url": "https://example.com/rules"
        },
        {
          "text": "❓ FAQ",
          "url": "https://example.com/faq"
        }
      ],
      [
        {
          "text": "💬 Техподдержка",
          "url": "https://t.me/support"
        }
      ]
    ]
  },
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

### 6. Приветствие с изображением и кнопками

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Добро пожаловать, @{username}! 🎊\n\nМы рады видеть тебя в нашей группе {chat_title}!\nСегодня {date}",
  "welcome_media_url": "https://i.imgur.com/welcome.jpg",
  "welcome_media_type": "PHOTO",
  "welcome_buttons": {
    "buttons": [
      [
        {
          "text": "📖 Читать правила",
          "url": "https://example.com/rules"
        }
      ],
      [
        {
          "text": "🆘 Помощь",
          "url": "https://t.me/support"
        },
        {
          "text": "📢 Канал",
          "url": "https://t.me/channel"
        }
      ]
    ]
  },
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

### 7. Приветствие с указанием топика

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {firstname}! 👋\nДобро пожаловать в топик для новичков!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": 12345,
  "join_captcha_enabled": false
}
```

**Примечание:** 
- `welcome_message_thread_id` - ID топика в Telegram (для групп с включенными топиками)
- Если `null`, то:
  - Для JOIN_REQUEST: отправится в личку
  - Для MEMBER_JOINED: автоматически определится топик из входящего сообщения

---

### 8. Приветствие с GIF

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать, {firstname}!",
  "welcome_media_url": "https://media.giphy.com/media/example/giphy.gif",
  "welcome_media_type": "ANIMATION",
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

### 9. Приветствие с видео

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {firstname}! 🎬\nПосмотри наше приветственное видео!",
  "welcome_media_url": "https://example.com/welcome-video.mp4",
  "welcome_media_type": "VIDEO",
  "welcome_buttons": {
    "buttons": [
      [
        {
          "text": "🔗 Подписаться на канал",
          "url": "https://t.me/mychannel"
        }
      ]
    ]
  },
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

### 10. Отключить приветствие

```http
PUT https://193.42.125.13/api/bots/{bot_id}/welcome
```

**Body:**
```json
{
  "welcome_enabled": false,
  "welcome_message": null,
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

---

## 🧪 Сценарии тестирования

### Тест 1: Базовое текстовое приветствие
1. Создать/получить бота
2. Настроить приветствие (пример #2)
3. Добавить нового участника в группу
4. Проверить, что приветствие пришло

### Тест 2: Приветствие с шорткодами
1. Настроить приветствие (пример #3)
2. Добавить участника с именем "Иван" и username "@ivan"
3. Проверить, что шорткоды заменились:
   - `{firstname}` → "Иван"
   - `{username}` → "@ivan"
   - `{date}` → текущая дата
   - `{time}` → текущее время

### Тест 3: Приветствие с медиа и кнопками
1. Настроить приветствие (пример #6)
2. Добавить участника
3. Проверить:
   - Изображение отображается
   - Текст с шорткодами корректный
   - Все кнопки работают

### Тест 4: Приветствие в топике
1. Создать группу с топиками
2. Узнать ID топика (message_thread_id)
3. Настроить приветствие (пример #7)
4. Добавить участника
5. Проверить, что приветствие пришло в указанный топик

### Тест 5: Заявка на вступление (JOIN_REQUEST)
1. Создать приватный канал/группу
2. Настроить бота в режиме MANUAL
3. Настроить приветствие
4. Подать заявку на вступление
5. Проверить, что приветствие пришло в личку

---

## 📝 Доступные шорткоды

| Шорткод | Описание | Пример результата |
|---------|----------|-------------------|
| `{user_id}` | ID пользователя | `123456789` |
| `{firstname}` или `{user_name}` | Имя | `Иван` |
| `{username}` или `{user_username}` | Username | `@ivan` |
| `{lastname}` или `{user_last_name}` | Фамилия | `Иванов` |
| `{bot_name}` | Имя бота | `MyBot` |
| `{chat_title}` | Название чата | `Моя группа` |
| `{date}` | Дата | `09.12.2025` |
| `{time}` | Время | `14:30` |
| `{datetime}` | Дата и время | `09.12.2025 14:30` |

---

## 🔍 Примеры для копирования

### Простое приветствие
```bash
curl -X PUT "https://193.42.125.13/api/bots/1/welcome" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "welcome_enabled": true,
    "welcome_message": "Привет, {firstname}! Добро пожаловать!",
    "welcome_media_url": null,
    "welcome_media_type": null,
    "welcome_buttons": null,
    "welcome_message_thread_id": null,
    "join_captcha_enabled": false
  }'
```

### С кнопками
```bash
curl -X PUT "https://193.42.125.13/api/bots/1/welcome" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "welcome_enabled": true,
    "welcome_message": "Привет, {firstname}! 👋",
    "welcome_media_url": null,
    "welcome_media_type": null,
    "welcome_buttons": {
      "buttons": [
        [
          {"text": "Правила", "url": "https://example.com/rules"}
        ]
      ]
    },
    "welcome_message_thread_id": null,
    "join_captcha_enabled": false
  }'
```

### Получить настройки
```bash
curl -X GET "https://193.42.125.13/api/bots/1/welcome" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## ⚠️ Важные замечания

1. **bot_id**: Замените `{bot_id}` или `1` на реальный ID вашего бота
2. **Authorization**: Замените `YOUR_TOKEN` на ваш токен доступа
3. **Медиа URL**: Используйте прямые ссылки на изображения/видео (не file_id)
4. **Топики**: ID топика можно узнать из `message_thread_id` входящего сообщения
5. **Шорткоды**: Обязательно используйте фигурные скобки `{}`
6. **Кнопки**: Максимум 8 кнопок в ряду, максимум 100 рядов

---

## 🎯 Быстрый старт для тестирования

**Шаг 1:** Получить bot_id
```bash
GET https://193.42.125.13/api/bots
```

**Шаг 2:** Настроить простое приветствие
```json
PUT https://193.42.125.13/api/bots/{bot_id}/welcome

{
  "welcome_enabled": true,
  "welcome_message": "Привет, {firstname}! Добро пожаловать!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

**Шаг 3:** Добавить нового участника в группу или подать заявку на вступление

**Шаг 4:** Проверить, что приветствие пришло с замененными шорткодами

