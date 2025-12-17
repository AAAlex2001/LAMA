# Отладка приветствий в топиках

## 🔍 Как узнать ID топика

### Способ 1: Через API Telegram
1. Отправьте сообщение в нужный топик
2. Сделайте запрос к API бота:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```
3. Найдите `message_thread_id` в ответе

### Способ 2: Через логи
1. Добавьте участника в топик
2. Проверьте логи вашего бота:
```
Welcome thread_id logic: bot_setting=1, message_thread=999, final=1
```
- `bot_setting` - что у вас в БД
- `message_thread` - реальный ID топика из сообщения
- `final` - куда отправится приветствие

---

## 📊 Логика работы (текущая)

```python
if welcome_message_thread_id is None:
    # Отправить в тот же топик, куда добавили участника
    use_thread_from_message()
else:
    # Отправить в конкретный топик из настроек
    use_thread_from_settings()
```

### Таблица поведения:

| `welcome_message_thread_id` в БД | Участника добавили в топик | Приветствие придет в топик |
|----------------------------------|----------------------------|----------------------------|
| `null` | 5 | 5 (тот же) |
| `null` | 10 | 10 (тот же) |
| `null` | без топика | без топика (общий чат) |
| `1` | 5 | **1** (фиксированный) |
| `1` | 10 | **1** (фиксированный) |
| `1` | без топика | **1** (фиксированный) |

---

## 🛠️ Решение проблем

### Проблема 1: Приветствие не отправляется вообще

**Проверьте:**
1. `welcome_enabled: true` в настройках
2. `welcome_message` заполнен
3. Webhook работает (проверьте логи)
4. Бот добавлен в группу с правами администратора

**Тест:**
```json
PUT /bots/{bot_id}/welcome
{
  "welcome_enabled": true,
  "welcome_message": "Тест {user.first_name}",
  "welcome_media_url": null,
  "welcome_media_type": null,
  "welcome_buttons": null,
  "welcome_message_thread_id": null,
  "join_captcha_enabled": false
}
```

### Проблема 2: Приветствие идет не в тот топик

**Причина:** Вы указали `welcome_message_thread_id: 1`, но реальный ID топика другой

**Решение 1:** Узнайте реальный ID топика (см. выше) и используйте его:
```json
{
  "welcome_message_thread_id": 999  // реальный ID
}
```

**Решение 2:** Используйте автоопределение:
```json
{
  "welcome_message_thread_id": null  // автоматически в тот же топик
}
```

### Проблема 3: Хочу всегда в один топик "Приветствия"

1. Создайте топик "Приветствия" в группе
2. Узнайте его ID (см. выше)
3. Установите в настройках:
```json
{
  "welcome_message_thread_id": 12345  // ID топика "Приветствия"
}
```

### Проблема 4: Хочу в тот топик, куда добавили

```json
{
  "welcome_message_thread_id": null  // будет автоматически
}
```

---

## 🧪 Тестирование

### Тест 1: Автоопределение топика
```bash
# 1. Установите null
PUT /bots/{bot_id}/welcome
{
  "welcome_enabled": true,
  "welcome_message": "Привет, {user.first_name}! Топик: {chat.title}",
  "welcome_message_thread_id": null
}

# 2. Добавьте участника в топик
# 3. Проверьте: приветствие должно быть в том же топике
```

### Тест 2: Фиксированный топик
```bash
# 1. Узнайте ID топика (например, 12345)
# 2. Установите его
PUT /bots/{bot_id}/welcome
{
  "welcome_enabled": true,
  "welcome_message": "Привет в специальном топике!",
  "welcome_message_thread_id": 12345
}

# 3. Добавьте участника в ЛЮБОЙ топик
# 4. Проверьте: приветствие должно быть в топике 12345
```

---

## 📝 Проверка через логи

Добавьте в код отладочное логирование:

```python
# backend/services/webhook/welcome.py, строка ~70
logger.info(
    f"🔍 DEBUG Welcome: "
    f"enabled={self.bot_model.welcome_enabled}, "
    f"message={bool(self.bot_model.welcome_message)}, "
    f"bot_thread_id={self.bot_model.welcome_message_thread_id}, "
    f"msg_thread_id={getattr(message, 'message_thread_id', None)}, "
    f"final_thread_id={message_thread_id}, "
    f"user={new_member_user.id}, "
    f"chat={message.chat.id}"
)
```

Перезапустите бота и проверьте логи после добавления участника.

---

## 🎯 Быстрая диагностика

Выполните по порядку:

1. **Проверьте webhook:**
```bash
curl "https://193.42.125.13/api/webhook/status"
```

2. **Проверьте настройки бота:**
```bash
GET https://193.42.125.13/api/bots/{bot_id}/welcome
```

3. **Установите простое приветствие БЕЗ топика:**
```json
{
  "welcome_enabled": true,
  "welcome_message": "ТЕСТ {user.first_name}",
  "welcome_message_thread_id": null
}
```

4. **Добавьте участника в группу (не в топик, а в общий чат)**
   - Если приветствие пришло → всё работает, проблема в топиках
   - Если не пришло → проблема в webhook или правах бота

5. **Если п.4 работает, добавьте участника в топик**
   - Проверьте логи на наличие `message_thread_id`
   - Если топик определился → всё ОК
   - Если нет → группа без топиков или webhook не получает это поле

---

## 💡 Рекомендации

### Для большинства случаев:
```json
{
  "welcome_message_thread_id": null
}
```
Приветствие придет туда, куда добавили участника.

### Если нужен специальный топик "Приветствия":
1. Создайте топик
2. Узнайте его ID
3. Укажите в настройках

### Если топики не работают:
1. Проверьте, что в группе включены топики (Forums)
2. Проверьте права бота (должен быть админом)
3. Проверьте webhook - приходит ли `message_thread_id`

