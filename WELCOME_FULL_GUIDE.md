# 👋 Полное руководство по приветствиям LAMA

## 📋 Оглавление

1. [Два типа приветствий](#два-типа-приветствий)
2. [Настройки Welcome](#настройки-welcome)
3. [Шорткоды](#шорткоды)
4. [Все случаи использования](#все-случаи-использования)
5. [API примеры](#api-примеры)

---

## Два типа приветствий

### 1️⃣ Приветствие при заявке (JOIN_REQUEST)
**Когда:** Пользователь подал заявку на вступление (режим `MANUAL` или `CRITERIA`)
**Куда:** В ЛС пользователю
**Управление:** Через `welcome_enabled` + Welcome handler

### 2️⃣ Приветствие при вступлении (MEMBER_JOINED)
**Когда:** Пользователь вступил в группу
**Куда:** В группу (или в определенный топик)
**Управление:** Через `welcome_enabled` + Welcome handler ИЛИ триггер `MEMBER_JOINED`

---

## Настройки Welcome

### Основные поля

```json
{
  "welcome_enabled": true,
  "welcome_message": "Текст приветствия",
  "welcome_media_url": "https://example.com/image.jpg",
  "welcome_media_type": "PHOTO",
  "welcome_buttons": {
    "buttons": [
      [{"text": "Кнопка", "url": "https://..."}]
    ]
  },
  "welcome_message_thread_id": null
}
```

### Поля в деталях

| Поле | Тип | Описание |
|------|-----|----------|
| `welcome_enabled` | Boolean | Включить/выключить приветствие |
| `welcome_message` | String | Текст с шорткодами |
| `welcome_media_url` | String (URL) | Ссылка на медиа (опционально) |
| `welcome_media_type` | Enum | `PHOTO`, `VIDEO`, `ANIMATION`, `DOCUMENT` |
| `welcome_buttons` | JSON | Inline keyboard кнопки |
| `welcome_message_thread_id` | Integer | ID топика (для групп с топиками) |

### Типы медиа

- `PHOTO` - картинка
- `VIDEO` - видео
- `ANIMATION` - GIF анимация
- `DOCUMENT` - файл/документ
- `AUDIO` - аудио файл
- `VOICE` - голосовое сообщение

---

## Шорткоды

### Пользователь
- `{user.id}` - ID (123456789)
- `{user.first_name}` - Имя (Александр)
- `{user.username}` - Username (@sasha_200121)
- `{user.last_name}` - Фамилия (Иванов)

### Бот
- `{bot.first_name}` - Имя бота

### Чат
- `{chat.title}` - Название группы

### Время
- `{date}` - Дата (17.12.2025)
- `{time}` - Время (19:45)
- `{datetime}` - Дата и время (17.12.2025 19:45)

---

## Все случаи использования

### 📥 Кейс 1: Простое текстовое приветствие

```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {user.first_name}! 👋\n\nДобро пожаловать в {chat.title}!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null
}
```

**API запрос:**
```bash
PUT https://lamaplanner.com/api/bots/1/welcome
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "welcome_enabled": true,
  "welcome_message": "Привет, {user.first_name}! 👋\n\nДобро пожаловать в {chat.title}!"
}
```

---

### 🖼️ Кейс 2: Приветствие с картинкой

```json
{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать, {user.first_name}!",
  "welcome_media_url": "https://i.imgur.com/example.jpg",
  "welcome_media_type": "PHOTO",
  "welcome_buttons": null,
  "welcome_message_thread_id": null
}
```

**API запрос:**
```bash
PUT https://lamaplanner.com/api/bots/1/welcome
Content-Type: application/json

{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать, {user.first_name}!",
  "welcome_media_url": "https://i.imgur.com/example.jpg",
  "welcome_media_type": "PHOTO"
}
```

---

### 🎬 Кейс 3: Приветствие с видео

```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет! 🎬\n\nПосмотри наше приветственное видео!",
  "welcome_media_url": "https://example.com/welcome.mp4",
  "welcome_media_type": "VIDEO",
  "welcome_buttons": null,
  "welcome_message_thread_id": null
}
```

---

### 🎨 Кейс 4: Приветствие с GIF анимацией

```json
{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать!",
  "welcome_media_url": "https://media.giphy.com/media/example/giphy.gif",
  "welcome_media_type": "ANIMATION",
  "welcome_buttons": null,
  "welcome_message_thread_id": null
}
```

---

### 🔘 Кейс 5: Приветствие с кнопками

```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {user.first_name}! 👋\n\nВыбери действие:",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": {
    "buttons": [
      [
        {"text": "📋 Правила группы", "url": "https://t.me/c/123456/1"}
      ],
      [
        {"text": "💬 Задать вопрос", "url": "https://t.me/admin"},
        {"text": "🆘 Помощь", "url": "https://t.me/support"}
      ],
      [
        {"text": "🌐 Наш сайт", "url": "https://example.com"}
      ]
    ]
  },
  "welcome_message_thread_id": null
}
```

**Формат кнопок:**
```json
{
  "buttons": [
    [{"text": "Текст", "url": "https://..."}],  // Одна кнопка в ряду
    [{"text": "Кнопка 1", "url": "..."}, {"text": "Кнопка 2", "url": "..."}]  // Две кнопки
  ]
}
```

---

### 🎯 Кейс 6: Приветствие в топике

Для групп с включенными топиками:

```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {user.first_name}! 👋\n\nДобро пожаловать в топик для новичков!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": 123
}
```

**Где взять `thread_id`:**
1. Открой топик в Telegram
2. ID топика в URL: `https://t.me/c/1234567890/123` → `123`

**Важно:**
- Если `welcome_message_thread_id = null` → отправляется в тот топик, куда добавили участника
- Если `welcome_message_thread_id = 123` → ВСЕГДА отправляется в топик 123

---

### 📝 Кейс 7: Расширенное приветствие со всеми шорткодами

```json
{
  "welcome_enabled": true,
  "welcome_message": "Здравствуй, {user.first_name}! 🎉\n\nДобро пожаловать в нашу группу \"{chat.title}\"!\n\nТвой username: {user.username}\nСегодня: {date}\nВремя: {time}\n\nТвой ID: {user.id}",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": {
    "buttons": [
      [{"text": "📋 Правила", "url": "https://t.me/rules"}],
      [{"text": "💬 Чат поддержки", "url": "https://t.me/support"}]
    ]
  },
  "welcome_message_thread_id": null
}
```

**Результат:**
```
Здравствуй, Александр! 🎉

Добро пожаловать в нашу группу "LAMA Planner"!

Твой username: @sasha_200121
Сегодня: 17.12.2025
Время: 19:45

Твой ID: 874275963

[📋 Правила] [💬 Чат поддержки]
```

---

### 🖼️+🔘 Кейс 8: Картинка + текст + кнопки (полный набор)

```json
{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать, {user.first_name}!\n\nМы рады видеть тебя в {chat.title}!\n\n👇 Выбери действие ниже:",
  "welcome_media_url": "https://i.imgur.com/welcome.jpg",
  "welcome_media_type": "PHOTO",
  "welcome_buttons": {
    "buttons": [
      [{"text": "📋 Правила группы", "url": "https://t.me/rules"}],
      [
        {"text": "💬 Чат", "url": "https://t.me/chat"},
        {"text": "📢 Канал", "url": "https://t.me/channel"}
      ],
      [{"text": "🌐 Сайт", "url": "https://example.com"}]
    ]
  },
  "welcome_message_thread_id": null
}
```

---

### ❌ Кейс 9: Отключить приветствие

```json
{
  "welcome_enabled": false,
  "welcome_message": null,
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null
}
```

**API запрос:**
```bash
PUT https://lamaplanner.com/api/bots/1/welcome

{
  "welcome_enabled": false
}
```

---

### 🔄 Кейс 10: Обновить только текст (не трогая медиа/кнопки)

```bash
PUT https://lamaplanner.com/api/bots/1/welcome

{
  "welcome_message": "Новый текст приветствия, {user.first_name}!"
}
```

---

## API примеры

### Получить текущие настройки
```bash
GET https://lamaplanner.com/api/bots/1/welcome
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {user.first_name}!",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false,
  "captcha_mode": "DISABLED",
  "captcha_timeout_seconds": 10
}
```

---

### Обновить настройки
```bash
PUT https://lamaplanner.com/api/bots/1/welcome
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "welcome_enabled": true,
  "welcome_message": "Привет, {user.first_name}! Добро пожаловать!"
}
```

---

## 🆚 Welcome vs Триггеры

### Когда использовать Welcome?
✅ Простое приветствие без сложной логики
✅ Одно сообщение для всех
✅ Быстрая настройка

### Когда использовать Триггеры?
✅ Сложная логика (фильтры, задержки, окна доставки)
✅ Несколько разных приветствий
✅ Разные сообщения для разных групп/пользователей
✅ Дополнительные действия (мут, бан, добавление в группу)

**Рекомендация:** Для простых случаев используй Welcome, для сложных - Триггеры!

---

## 📊 Итоговая таблица

| Параметр | Описание | Обязательно | Пример |
|----------|----------|-------------|--------|
| `welcome_enabled` | Вкл/выкл | Да | `true` |
| `welcome_message` | Текст | Да (если enabled) | `"Привет, {user.first_name}!"` |
| `welcome_media_url` | URL медиа | Нет | `"https://..."` |
| `welcome_media_type` | Тип медиа | Нет | `"PHOTO"` |
| `welcome_buttons` | Кнопки | Нет | `{"buttons": [[...]]}` |
| `welcome_message_thread_id` | ID топика | Нет | `123` |

---

## ⚠️ Важные моменты

1. **Шорткоды** обрабатываются автоматически
2. **Медиа** может быть только одно (фото ИЛИ видео ИЛИ GIF)
3. **Кнопки** - массив массивов (каждый внутренний массив = один ряд)
4. **Топик** - если указан, приветствие ВСЕГДА туда, иначе - туда, куда добавили
5. **Welcome работает** только если `welcome_enabled = true`

---

**Документация актуальна на:** 17.12.2025


