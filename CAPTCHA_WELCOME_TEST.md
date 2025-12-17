# 🎉 Настройка Капчи и Приветствия LAMA

## 📋 Получить текущие настройки

### Получить настройки приветствия и капчи:

**GET:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token"
}
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
  "join_captcha_enabled": false
}
```

---

### Получить настройки автоодобрения:

**GET:** `https://lamaplanner.com/api/bots/{bot_id}/auto-approval`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token"
}
```

**Ответ:**
```json
{
  "auto_approval_mode": "MANUAL",
  "approval_criteria": null
}
```

---

## 🎯 Настройки приветствия

### 1️⃣ Простое текстовое приветствие

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "👋 Привет, {user.first_name}!\n\nДобро пожаловать в нашу группу! Мы рады видеть тебя здесь.\n\nОзнакомься с правилами и не стесняйся задавать вопросы!"
}
```

**Тест:** Добавь нового участника в группу - бот отправит приветствие.

---

### 2️⃣ Приветствие с кнопками

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать, {user.first_name}!\n\nВыбери действие:",
  "welcome_buttons": [
    [
      {"text": "📖 Правила группы", "url": "https://example.com/rules"},
      {"text": "❓ FAQ", "url": "https://example.com/faq"}
    ],
    [
      {"text": "💬 Написать админу", "url": "https://t.me/admin"}
    ]
  ]
}
```

**Тест:** Добавь нового участника - бот отправит приветствие с кнопками.

---

### 3️⃣ Приветствие с фото

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать, {user.first_name}!",
  "welcome_media_url": "https://example.com/welcome-image.jpg",
  "welcome_media_type": "PHOTO"
}
```

**Тест:** Добавь нового участника - бот отправит фото с подписью.

**Типы медиа:**
- `PHOTO` - фотография
- `VIDEO` - видео
- `DOCUMENT` - документ
- `AUDIO` - аудио
- `VOICE` - голосовое сообщение
- `STICKER` - стикер
- `ANIMATION` - GIF/анимация

---

### 4️⃣ Приветствие с видео и кнопками

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "🎬 Добро пожаловать, {user.first_name}!\n\nПосмотри наше видео-приветствие!",
  "welcome_media_url": "https://example.com/welcome-video.mp4",
  "welcome_media_type": "VIDEO",
  "welcome_buttons": [
    [
      {"text": "🌐 Наш сайт", "url": "https://example.com"},
      {"text": "📱 Наш канал", "url": "https://t.me/your_channel"}
    ]
  ]
}
```

**Тест:** Добавь нового участника - бот отправит видео с кнопками.

---

### 5️⃣ Приветствие в топике (для форумов)

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "👋 Привет в топике, {user.first_name}!",
  "welcome_message_thread_id": 123456
}
```

**Тест:** Замени `thread_id` на ID топика в форуме. Приветствие будет отправлено в этот топик.

---

### 6️⃣ Отключить приветствие

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "welcome_enabled": false
}
```

**Тест:** Добавь нового участника - бот НЕ отправит приветствие.

---

## 🔐 Настройки капчи

### 7️⃣ Включить капчу при заявке на вступление

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "join_captcha_enabled": true
}
```

**Что делает:**
1. Пользователь отправляет заявку на вступление
2. Бот отправляет капчу (математический пример)
3. Пользователь должен решить капчу
4. Если правильно - заявка одобряется автоматически
5. Если неправильно - даётся ещё 2 попытки (всего 3)
6. После 3 неудачных попыток - заявка отклоняется

**Тест:** 
1. Включи капчу
2. Создай заявку на вступление в группу
3. Бот отправит капчу в ЛС
4. Реши капчу правильно
5. Заявка будет одобрена

---

### 8️⃣ Капча + Приветствие

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "✅ Капча пройдена, {user.first_name}! Добро пожаловать в группу! 🎉",
  "join_captcha_enabled": true
}
```

**Процесс:**
1. Пользователь отправляет заявку
2. Бот отправляет капчу
3. Пользователь решает капчу правильно
4. Заявка одобряется
5. Бот отправляет приветствие

**Тест:** Создай заявку, реши капчу, получи приветствие.

---

### 9️⃣ Отключить капчу

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "join_captcha_enabled": false
}
```

**Тест:** Создай заявку - капча НЕ будет отправлена.

---

## 🤖 Режимы автоодобрения

### 🔟 MANUAL - Ручное одобрение (по умолчанию)

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/auto-approval`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "auto_approval_mode": "MANUAL"
}
```

**Что делает:**
- Пользователь отправляет заявку
- Если капча включена - отправляется капча
- Если капча пройдена - заявка одобряется автоматически
- Если капча отключена - заявку нужно одобрить вручную

**Тест:** Создай заявку - потребуется ручное одобрение (или капча).

---

### 1️⃣1️⃣ AUTO - Автоматическое одобрение всех

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/auto-approval`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "auto_approval_mode": "AUTO"
}
```

**Что делает:**
- Пользователь отправляет заявку
- Заявка **одобряется мгновенно** без проверок
- Капча НЕ отправляется

**Тест:** Создай заявку - она одобрится сразу.

---

### 1️⃣2️⃣ CRITERIA - Одобрение по критериям (подписки)

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/auto-approval`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token",
  "Content-Type": "application/json"
}
```

**JSON:**
```json
{
  "auto_approval_mode": "CRITERIA",
  "approval_criteria": {
    "required_channels": [-1001234567890, -1009876543210]
  }
}
```

**Что делает:**
1. Пользователь отправляет заявку
2. Бот проверяет, подписан ли пользователь на указанные каналы
3. Если подписан на **все** - заявка одобряется автоматически
4. Если НЕ подписан - отправляется сообщение со ссылками на каналы
5. Когда пользователь подпишется на все каналы - заявка одобрится автоматически

**Как узнать ID канала:**
1. Добавь бота в канал админом
2. Перешли любое сообщение из канала боту [@userinfobot](https://t.me/userinfobot)
3. Он покажет ID (например, `-1001234567890`)

**Тест:** 
1. Укажи ID своих каналов
2. Создай заявку
3. Получишь сообщение: "Подпишись на каналы"
4. Подпишись на все каналы
5. Заявка одобрится автоматически

---

## 🎭 Комбинированные сценарии

### 1️⃣3️⃣ Полный VIP сценарий

**Шаг 1: Включить капчу + приветствие**

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

```json
{
  "welcome_enabled": true,
  "welcome_message": "🎉 Добро пожаловать в VIP группу, {user.first_name}!\n\n✨ Ты успешно прошёл верификацию!",
  "welcome_media_url": "https://example.com/vip-welcome.jpg",
  "welcome_media_type": "PHOTO",
  "welcome_buttons": [
    [
      {"text": "👑 VIP правила", "url": "https://example.com/vip-rules"},
      {"text": "💎 Наши привилегии", "url": "https://example.com/benefits"}
    ]
  ],
  "join_captcha_enabled": true
}
```

**Шаг 2: Настроить одобрение по критериям**

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/auto-approval`

```json
{
  "auto_approval_mode": "CRITERIA",
  "approval_criteria": {
    "required_channels": [-1001111111111, -1002222222222]
  }
}
```

**Процесс:**
1. Пользователь отправляет заявку
2. Бот проверяет подписки на каналы
3. Если подписан - отправляет капчу
4. Если капча пройдена - одобряет заявку
5. Отправляет VIP приветствие с фото и кнопками

---

### 1️⃣4️⃣ Простой open-доступ

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

```json
{
  "welcome_enabled": true,
  "welcome_message": "👋 Привет, {user.first_name}! Добро пожаловать!",
  "join_captcha_enabled": false
}
```

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/auto-approval`

```json
{
  "auto_approval_mode": "AUTO"
}
```

**Процесс:**
1. Пользователь отправляет заявку
2. Заявка одобряется сразу
3. Бот отправляет простое приветствие

---

### 1️⃣5️⃣ Максимальная защита

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/welcome`

```json
{
  "welcome_enabled": true,
  "welcome_message": "✅ Добро пожаловать в защищённую группу, {user.first_name}!\n\nТы прошёл все проверки безопасности.",
  "join_captcha_enabled": true
}
```

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/auto-approval`

```json
{
  "auto_approval_mode": "CRITERIA",
  "approval_criteria": {
    "required_channels": [-1001111111111]
  }
}
```

**Дополнительно:** Создай триггер для мута новых участников

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

```json
{
  "name": "Мут новых участников на 10 минут",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "MUTE_USER",
  "action_data": {
    "duration_minutes": 10
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Процесс:**
1. Пользователь отправляет заявку
2. Проверяется подписка на каналы
3. Отправляется капча
4. После успешной капчи - одобрение
5. При вступлении - временный мут на 10 минут
6. Приветствие после всех проверок

---

## 📊 Проверка настроек

### Получить все настройки бота:

**GET:** `https://lamaplanner.com/api/bots/{bot_id}`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token"
}
```

**Ответ покажет:**
- `welcome_enabled` - включено ли приветствие
- `join_captcha_enabled` - включена ли капча
- `auto_approval_mode` - режим одобрения (MANUAL/AUTO/CRITERIA)
- И всё остальное

---

## 🔧 Полезные команды

### Проверка логов капчи:
```bash
docker logs lama-backend --tail 100 | grep -i "captcha"
```

### Проверка логов приветствия:
```bash
docker logs lama-backend --tail 100 | grep -i "welcome"
```

### Проверка pending заявок:
```sql
docker exec -it lama-postgres psql -U lama -d lama -c "SELECT * FROM pending_approvals WHERE is_approved = false;"
```

### Проверка pending подписок:
```sql
docker exec -it lama-postgres psql -U lama -d lama -c "SELECT * FROM pending_join_approvals;"
```

---

## 📝 Доступные шорткоды

В тексте приветствия можно использовать:

- `{user.first_name}` - Имя пользователя
- `{user.username}` - Username пользователя (если есть)
- `{user.id}` - ID пользователя в Telegram
- `{bot.first_name}` - Имя бота

**Пример:**
```
Привет, {user.first_name}!

Это бот {bot.first_name}.
Твой ID: {user.id}
Username: @{user.username}
```

---

## 🎯 Порядок тестирования

### Базовый тест:
1. ✅ Создай группу с ограниченным доступом (Settings → Manage Group → Join Requests)
2. ✅ Добавь бота в группу админом
3. ✅ Включи приветствие (`welcome_enabled: true`)
4. ✅ Создай заявку на вступление с другого аккаунта
5. ✅ Одобри вручную
6. ✅ Проверь, пришло ли приветствие

### Тест капчи:
1. ✅ Включи капчу (`join_captcha_enabled: true`)
2. ✅ Создай заявку
3. ✅ Получи капчу в ЛС бота
4. ✅ Реши правильно
5. ✅ Заявка одобрится автоматически
6. ✅ Придёт приветствие

### Тест критериев:
1. ✅ Создай 2 тестовых канала
2. ✅ Добавь бота в каналы админом
3. ✅ Узнай ID каналов
4. ✅ Установи `auto_approval_mode: CRITERIA`
5. ✅ Укажи `required_channels`
6. ✅ Создай заявку (не подписываясь)
7. ✅ Получишь сообщение со ссылками
8. ✅ Подпишись на каналы
9. ✅ Заявка одобрится автоматически

---

## 🚨 Частые проблемы

### Капча не отправляется
- ✅ Проверь: `join_captcha_enabled: true`
- ✅ Проверь: `auto_approval_mode: MANUAL`
- ✅ Убедись, что бот может писать в ЛС (пользователь должен сначала написать `/start` боту)

### Приветствие не отправляется
- ✅ Проверь: `welcome_enabled: true`
- ✅ Убедись, что бот админ группы
- ✅ Проверь логи: `docker logs lama-backend -f`

### Автоодобрение не работает
- ✅ Проверь режим: `auto_approval_mode` должен быть `AUTO` или `CRITERIA`
- ✅ Для CRITERIA: проверь, что ID каналов правильные (с минусом!)
- ✅ Убедись, что бот админ в этих каналах

### Медиа не отправляется
- ✅ URL должен быть публичным (https://)
- ✅ Проверь тип медиа (`PHOTO`, `VIDEO`, `DOCUMENT`)
- ✅ Файл должен быть доступен для скачивания

---

## 🚀 Готово!

Теперь у тебя есть полное руководство по настройке капчи и приветствия! 🎉

**Рекомендуемая конфигурация для старта:**
- ✅ Приветствие: включено
- ✅ Капча: включена
- ✅ Автоодобрение: MANUAL
- ✅ Триггеры: MEMBER_JOINED, CAPTCHA_PASSED

Удачи! 🍀

