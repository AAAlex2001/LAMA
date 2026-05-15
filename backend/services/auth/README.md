# services/auth

Аутентификация пользователей и управление сессиями. Поддерживает три входа: Telegram-виджет (HMAC-подпись), вход через бота (одноразовый код или прямая регистрация по `telegram_id`), и email/password. Сессии живут как JWT-пара access+refresh, привязанная к строке в `user_sessions` — то есть logout может убить токен серверно.

## Точки входа

| HTTP | Route | Use-case |
|---|---|---|
| `POST /auth/telegram` | [routes/auth/telegram.py](../../routes/auth/telegram.py) | `AuthenticateTelegramWidget` — логин через Telegram Login Widget |
| `POST /auth/bot-login` | [routes/auth/bot.py](../../routes/auth/bot.py) | `AuthenticateBotUser` — логин когда бот сам зовёт API с подтверждёнными данными от Telegram |
| `POST /auth/bot-guest-token` | [routes/auth/bot.py](../../routes/auth/bot.py) | то же, но `registration_completed=false` — гостевой токен |
| `POST /auth/register` | [routes/auth/email.py](../../routes/auth/email.py) | `RegisterWithEmail` — email + пароль |
| `POST /auth/login` | [routes/auth/email.py](../../routes/auth/email.py) | `LoginWithEmail` — email + пароль |
| `POST /auth/me/add-email` | [routes/auth/email.py](../../routes/auth/email.py) | `AddEmailToUser` — досоздать email/пароль на telegram-only аккаунте |
| `POST /auth/refresh` | [routes/auth/tokens.py](../../routes/auth/tokens.py) | `RefreshTokenPair` — обновить access+refresh |
| `POST /auth/logout` | [routes/auth/tokens.py](../../routes/auth/tokens.py) | `LogoutSession` — пометить сессию `is_active=false` |
| `GET /auth/me` | [routes/auth/profile.py](../../routes/auth/profile.py) | возврат текущего юзера |
| `GET /auth/me/stats` | [routes/auth/profile.py](../../routes/auth/profile.py) | `GetUserStats` — счётчики ботов/каналов/публикаций/сессий |
| `GET /auth/me/sessions` | [routes/auth/profile.py](../../routes/auth/profile.py) | `ListUserSessions` |
| `DELETE /auth/me/sessions/{id}` | [routes/auth/profile.py](../../routes/auth/profile.py) | `RevokeUserSession` |
| `GET /auth/users/{id}` | [routes/auth/users.py](../../routes/auth/users.py) | admin: `GetUser` |
| `PUT /auth/users/{id}` | [routes/auth/users.py](../../routes/auth/users.py) | admin: `UpdateUser` (role / is_active) |
| `DELETE /auth/users/{id}` | [routes/auth/users.py](../../routes/auth/users.py) | admin: `DeleteUser` |
| `GET /auth/users/{id}/stats` | [routes/auth/users.py](../../routes/auth/users.py) | admin: `GetUserStats` для конкретного юзера |

`get_current_user` / `get_current_admin` ([routes/auth/dependencies.py](../../routes/auth/dependencies.py)) — DI-зависимости для остальных доменов. Парсят `Authorization: Bearer ...`, дёргают `VerifyAccessToken`.

## Поток данных

### Telegram-виджет

```
[ Frontend → Telegram Login Widget → POST /auth/telegram { id, hash, ... } ]
        ↓
AuthenticateTelegramWidget:
    VerifyTelegramWidget        ← проверяет HMAC(sha256(bot_token), data_check_string)
    UpsertTelegramUser          ← создаёт/обновляет User + TelegramAccount
    CreateAccessToken           ← JWT, type="access", TTL = access_token_expire_minutes
    CreateRefreshToken          ← JWT, type="refresh", TTL = refresh_token_expire_days
    CreateUserSession           ← пишет строку в user_sessions (нужна для серверного logout)
        ↓
{ access_token, refresh_token, user, expires_in, registration_completed }
```

### Логин через бота

`/auth/bot-login` — bot-side флоу: бот уже получил `telegram_id` от Telegram (например, через `/start`) и вызывает наш API. Никакой HMAC-проверки тут нет (бот доверенный — у него токен в env). Дальше — то же что и Telegram-виджет: upsert юзера + JWT-пара.

`/auth/bot-guest-token` отдаёт пару с `registration_completed=false` — фронтенд понимает, что нужно дораскрыть форму регистрации.

`CreateBotLoginCode` + `RedeemBotLoginCode` ([features/bot/](features/bot/)) — одноразовый код для логина: бот генерирует код, отправляет юзеру, юзер вводит на сайте. Срок жизни — 5 минут по умолчанию (configurable). Используется только в специальных сценариях.

### Email/password

```
[ POST /auth/register { email, password, agree_personal_data, agree_terms } ]
        ↓
RegisterWithEmail:
    bcrypt hash_password
    409 если email уже занят
    User(email=..., password_hash=..., agree_*=True)
    CreateAccessToken + CreateRefreshToken + CreateUserSession
        ↓
{ access_token, refresh_token, user }
```

`login_with_email` — проверка `bcrypt.checkpw`, отдача той же пары + сессии. Если у юзера `password_hash IS NULL` (telegram-only регистрация) — 400.

`AddEmailToUser` — досоздать email/пароль на уже существующем telegram-аккаунте. Тот же `bcrypt`, конфликт по email — 409.

### Refresh

```
[ POST /auth/refresh { refresh_token } ]
        ↓
RefreshTokenPair:
    decode JWT, type="refresh"
    найти UserSession по (user_id, refresh_token, is_active=True)
    выпустить новую пару access+refresh
    обновить session: access_token / refresh_token / expires_at / last_used_at
        ↓
{ access_token, refresh_token, user }
```

Старый access становится невалидным потому что в `UserSession.access_token` теперь лежит новый. Это серверный invalidation.

### Logout

`LogoutSession` помечает строку `user_sessions.is_active = False`. После этого `VerifyAccessToken` не найдёт активную сессию и вернёт 401 даже если JWT ещё не просрочен.

## Структура каталога

| Подпапка | Что |
|---|---|
| [features/telegram/](features/telegram/) | HMAC-проверка виджета + upsert юзера через `TelegramAccount` |
| [features/bot/](features/bot/) | Логин через бота: `AuthenticateBotUser` (прямой), `CreateBotLoginCode` + `RedeemBotLoginCode` (одноразовый код) |
| [features/email/](features/email/) | Регистрация / логин по email + `passwords.py` (bcrypt) + `AddEmailToUser` |
| [features/tokens/](features/tokens/) | `CreateAccessToken` / `CreateRefreshToken` / `VerifyAccessToken` / `RefreshTokenPair` / `LogoutSession` |
| [features/sessions/](features/sessions/) | `CreateUserSession` / `ListUserSessions` / `RevokeUserSession` |
| [features/users/](features/users/) | `GetUser` / `GetUserByEmail` / `GetUserByTelegramId` / `ListUsers` / `UpdateUser` / `DeleteUser` / `GetUserStats` |
| [settings.py](settings.py) | `AuthSettings` — `bot_token`, `jwt_secret`, `jwt_algorithm`, TTL access/refresh |
| [types.py](types.py) | `AuthResult` (user + tokens), `ClientContext` (user_agent + ip), `TelegramAuthData` |

## Особые места

### HMAC-проверка Telegram-виджета

`VerifyTelegramWidget.execute`:

1. Собираем все поля `auth_data` (кроме `hash`) в строку `key=value\n...` отсортированную по ключу.
2. `secret_key = sha256(bot_token).digest()`.
3. `computed_hash = HMAC-SHA256(secret_key, data_check_string).hexdigest()`.
4. `hmac.compare_digest(computed_hash, auth_data.hash)` — константное сравнение, защита от timing-атак.

Плюс проверка свежести: `auth_date` старше 24 часов → 401.

### Пароли — bcrypt

[features/email/passwords.py](features/email/passwords.py): `bcrypt.hashpw(password, bcrypt.gensalt())` для записи, `bcrypt.checkpw(...)` для проверки. `verify_password` ловит `TypeError/ValueError` и возвращает `False` — на случай битого hash в БД.

### JWT-структура

| Поле | Что |
|---|---|
| `sub` | `str(user_id)` |
| `type` | `"access"` или `"refresh"` |
| `exp` | UTC datetime, expiration |
| `iat` | UTC datetime, issued at |
| `jti` | `secrets.token_urlsafe(16)` — уникальный id токена |

Алгоритм — HS256 по умолчанию, secret — `JWT_SECRET` env. Подпись через `python-jose`.

### Серверная инвалидация через UserSession

Даже валидный JWT не пройдёт `VerifyAccessToken` если:
- `UserSession` с этим `access_token` не найдена (logout стёр or session не существовала)
- `UserSession.is_active == False`
- `UserSession.expires_at` уже прошло (тогда session дополнительно помечается `is_active=False`)
- `User.is_active == False`

То есть мы можем не дожидаясь expiry убить любую сессию: пометить `is_active=False` (logout) или удалить User-а (cascade удалит и сессии).

### Refresh инвалидирует старый access

`RefreshTokenPair` пишет новый `access_token` и `refresh_token` в **существующую** строку `user_sessions`, не создаёт новую. Старый access после этого не пройдёт `VerifyAccessToken` (там фильтр по `access_token == ...`).

### Bot-login (без HMAC)

`AuthenticateBotUser` доверяет вызывающему — это бот в той же сети с known `telegram_id`. HMAC-проверки нет. Защита: эндпоинт должен быть доступен только из внутренней сети (или с фильтром по `X-Bot-Secret`, если будет внедряться).

### Одноразовый код (`BotLoginCode`)

`CreateBotLoginCode` пишет 16-байт `secrets.token_urlsafe` с TTL 5 минут. `RedeemBotLoginCode` ищет по `code` + `is_used=False`, проверяет `expires_at`, помечает `is_used=True` и создаёт сессию. Идемпотентность: повторный redeem того же кода → 401 (потому что `is_used=True`).

### `agree_personal_data` / `agree_terms`

Без обоих флагов `True` — 400 на `/auth/register` и `/auth/me/add-email`. Если юзер пришёл через Telegram — он по умолчанию `False`, и фронт должен выкатить экран согласия перед `/auth/me/add-email`.

### `registration_completed` в ответе

[routes/auth/responses.py:registration_completed](../../routes/auth/responses.py): `bool(user.email AND agree_terms AND agree_personal_data)`. Фронт по этому полю показывает экран "довести регистрацию" или сразу пускает в приложение.

Гостевой токен `/auth/bot-guest-token` форсит `registration_completed=False` независимо от состояния юзера.

### Unit of Work

Все сервисы используют `await db.flush()`, не `db.commit()`. Транзакция управляется на уровне `get_db` зависимости в FastAPI. Это значит: HTTPException, поднятая в сервисе, автоматически откатывает всё что было — никаких полу-сохранённых юзеров.

### Identity map / `db.refresh`

`UpsertTelegramUser` после flush делает повторный `GetUser` чтобы вернуть юзера с `selectinload(telegram_account)` — иначе фронт не получит `telegram_account` в ответе. Тот же паттерн в `UpdateUser` / `RegisterWithEmail`.

## Что НЕ покрыто кодом (но важно знать)

- **Rate-limiting** на `/auth/login`, `/auth/telegram`, `/auth/refresh` — на уровне приложения нет. Если нужно — ставим перед FastAPI nginx/Cloudflare с лимитом на IP.
- **Account lockout** после N неудачных попыток — нет. Логин просто 401, без счётчика.
- **2FA** — не поддерживается.
- **Password reset** через email — нет. `AddEmailToUser` перезаписывает пароль без проверки старого, но требует валидного access-токена (то есть юзер уже залогинен).
- **Email verification** — поле `email_verified` есть в модели, но на запись нигде не выставляется. Текущий флоу полагается на то что регистрация через `/auth/register` создаёт `email_verified=False` и фронт это либо игнорирует, либо отправит на verify-flow в будущем.

## Ключевые env

- `TELEGRAM_BOT_TOKEN` — нужен для HMAC-проверки виджета. Без него HMAC не сойдётся.
- `JWT_SECRET` — секрет подписи JWT. Сменить в проде → инвалидирует все существующие токены.
- `JWT_ALGORITHM` — по умолчанию `HS256`.
- `ACCESS_TOKEN_EXPIRE_MINUTES` — 24×60 по умолчанию (1 день).
- `REFRESH_TOKEN_EXPIRE_DAYS` — 30 по умолчанию.
