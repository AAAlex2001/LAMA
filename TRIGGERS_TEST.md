# 🔥 Тестирование триггеров LAMA

## 📋 Получить список ботов

**GET:** `https://lamaplanner.com/api/bots`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token"
}
```

**Ответ:** Запомни `id` своего бота (далее используется как `{bot_id}`)

---

## 1️⃣ Триггер: Заявка на вступление создана

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Приветствие при заявке",
  "trigger_type": "JOIN_REQUEST_CREATED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 Привет, {user.first_name}! Мы получили твою заявку на вступление. Скоро рассмотрим!"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Создай заявку на вступление в группу с ограниченным доступом.

---

## 2️⃣ Триггер: Заявка одобрена

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Сообщение после одобрения",
  "trigger_type": "JOIN_REQUEST_APPROVED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "✅ Поздравляем, {user.first_name}! Твоя заявка одобрена. Добро пожаловать в группу!"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Одобри заявку вручную или через автоодобрение.

---

## 3️⃣ Триггер: Заявка отклонена

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Уведомление об отклонении",
  "trigger_type": "JOIN_REQUEST_REJECTED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "❌ К сожалению, {user.first_name}, твоя заявка отклонена. Попробуй позже."
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Отклони заявку на вступление.

---

## 4️⃣ Триггер: Участник вступил

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Приветствие нового участника",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "🎉 Добро пожаловать, {user.first_name}!\n\nОзнакомься с правилами группы и не стесняйся задавать вопросы!",
    "buttons": [
      [
        {"text": "📖 Правила", "url": "https://example.com/rules"},
        {"text": "❓ FAQ", "url": "https://example.com/faq"}
      ]
    ]
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Добавь нового пользователя в группу.

---

## 5️⃣ Триггер: Участник покинул группу

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Логирование выхода",
  "trigger_type": "MEMBER_LEFT",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 {user.first_name} покинул группу. Надеемся увидеть снова!"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Удали участника из группы или пусть он выйдет сам.

---

## 6️⃣ Триггер: Капча пройдена

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Поздравление с прохождением капчи",
  "trigger_type": "CAPTCHA_PASSED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "✅ Отлично, {user.first_name}! Капча пройдена. Добро пожаловать!"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** 
1. Включи капчу для бота: `bot.join_captcha_enabled = true`
2. Создай заявку на вступление
3. Реши капчу правильно

---

## 7️⃣ Триггер: Капча не пройдена

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Предупреждение о неправильной капче",
  "trigger_type": "CAPTCHA_FAILED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "❌ Неправильный ответ, {user.first_name}. Попробуй ещё раз! (Попытка {attempts}/3)"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** 
1. Включи капчу для бота
2. Создай заявку на вступление
3. Ответь на капчу неправильно

---

## 8️⃣ Триггер: Пользователь написал сообщение

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Автоответ на сообщения",
  "trigger_type": "USER_MESSAGE",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 Привет, {user.first_name}! Я получил твоё сообщение. Скоро отвечу!"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Напиши боту любое текстовое сообщение в ЛС.

---

## 9️⃣ Триггер: Вызвана команда

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Логирование команд",
  "trigger_type": "COMMAND_CALLED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "✅ Команда выполнена, {user.first_name}!"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Создай кастомную команду (например `/help`) и вызови её.

---

## 🔟 Триггер: Отложенное приветствие (через 5 минут)

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Отложенное приветствие",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👋 Привет ещё раз, {user.first_name}! Как тебе наша группа? Если есть вопросы - спрашивай!"
  },
  "delay_minutes": 5,
  "is_active": true
}
```

**Тест:** Добавь нового участника и подожди 5 минут. Бот должен отправить второе сообщение.

---

## 1️⃣1️⃣ Триггер: С окном доставки (только с 9 до 21)

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Приветствие в рабочее время",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "🌞 Доброе утро/день, {user.first_name}! Добро пожаловать в нашу группу!"
  },
  "delay_minutes": 0,
  "delivery_window": {
    "start_hour": 9,
    "end_hour": 21,
    "timezone": "Europe/Moscow"
  },
  "is_active": true
}
```

**Тест:** 
- Если добавишь участника с 9 до 21 МСК - сообщение придёт сразу
- Если добавишь после 21:00 или до 9:00 - сообщение отложится до 9:00 следующего дня

---

## 1️⃣2️⃣ Триггер: С фильтрами (только для определённых чатов)

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Приветствие только в VIP группе",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MESSAGE",
  "action_data": {
    "text": "👑 Добро пожаловать в VIP группу, {user.first_name}!"
  },
  "delay_minutes": 0,
  "filters": {
    "chat_ids": [-1001234567890]
  },
  "is_active": true
}
```

**Тест:** Замени `chat_ids` на ID своей группы и добавь участника. Триггер сработает только в этой группе.

---

## 1️⃣3️⃣ Триггер: Отправка медиа (фото)

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Приветствие с картинкой",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "SEND_MEDIA",
  "action_data": {
    "text": "🎉 Добро пожаловать, {user.first_name}!",
    "media_url": "https://example.com/welcome.jpg",
    "media_type": "PHOTO"
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Загрузи изображение и укажи его URL. При добавлении участника бот отправит фото с подписью.

---

## 1️⃣4️⃣ Триггер: Заглушить пользователя при входе (на 10 минут)

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Временный мут новых участников",
  "trigger_type": "MEMBER_JOINED",
  "action_type": "MUTE_USER",
  "action_data": {
    "duration_minutes": 10
  },
  "delay_minutes": 0,
  "is_active": true
}
```

**Тест:** Добавь участника - он будет заглушен на 10 минут (бот должен быть админом).

---

## 1️⃣5️⃣ Триггер: Бан пользователя при неправильной капче (3 попытки)

**POST:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

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
  "name": "Бан за неправильную капчу",
  "trigger_type": "CAPTCHA_FAILED",
  "action_type": "BAN_USER",
  "action_data": {
    "duration_minutes": 1440
  },
  "delay_minutes": 0,
  "is_active": false
}
```

**Тест:** Включи триггер, создай заявку и 3 раза неправильно ответь на капчу. Пользователь будет забанен на 24 часа.

---

## 📊 Проверка триггеров

### Получить все триггеры бота:

**GET:** `https://lamaplanner.com/api/bots/{bot_id}/triggers`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token"
}
```

### Обновить триггер:

**PUT:** `https://lamaplanner.com/api/bots/{bot_id}/triggers/{trigger_id}`

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
  "is_active": false
}
```

### Удалить триггер:

**DELETE:** `https://lamaplanner.com/api/bots/{bot_id}/triggers/{trigger_id}`

**Headers:**
```json
{
  "Authorization": "Bearer твой_jwt_token"
}
```

---

## 🎯 Порядок тестирования

1. ✅ Получи `bot_id` из `/api/bots`
2. ✅ Создай триггеры 1-5 (основные события)
3. ✅ Протестируй каждый триггер отдельно
4. ✅ Создай отложенный триггер (#10) и проверь через 5 минут
5. ✅ Создай триггер с окном доставки (#11) и проверь в разное время
6. ✅ Включи капчу и протестируй триггеры #6 и #7
7. ✅ Проверь логи: `docker logs lama-backend -f`

---

## 🔧 Полезные команды

### Проверка логов:
```bash
docker logs lama-backend --tail 100 -f
```

### Проверка отложенных задач:
```sql
docker exec -it lama-postgres psql -U lama -d lama -c "SELECT * FROM scheduled_trigger_tasks WHERE is_executed = false;"
```

### Проверка триггеров в БД:
```sql
docker exec -it lama-postgres psql -U lama -d lama -c "SELECT id, name, trigger_type, is_active FROM bot_triggers;"
```

---

## 📝 Шорткоды

Доступные переменные в тексте сообщений:

- `{user.first_name}` - Имя пользователя
- `{user.username}` - Username пользователя
- `{user.id}` - ID пользователя
- `{bot.first_name}` - Имя бота

**Пример:**
```
Привет, {user.first_name}! Это бот {bot.first_name}.
```

---

## 🚀 Готово!

Теперь у тебя есть полный набор триггеров для тестирования всех возможностей LAMA! 🎉

