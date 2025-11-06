# 🚀 Быстрый старт

## Вариант 1: Запуск с Docker Compose (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Настройка .env
Отредактируй файл `.env` и добавь свой Telegram Bot Token:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

Токен можно получить у [@BotFather](https://t.me/BotFather) в Telegram.

### Шаг 2: Запуск всего стека
```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL базу данных на порту 5432
- FastAPI приложение на порту 8000

### Шаг 3: Проверка
```bash
curl http://localhost:8000/health
```

API документация: http://localhost:8000/docs

---

## Вариант 2: Локальный запуск (без Docker)

### Шаг 1: Установить PostgreSQL
Скачай и установи PostgreSQL с официального сайта или через пакетный менеджер:

**Windows:**
- Скачай с https://www.postgresql.org/download/windows/
- Установи с дефолтными настройками

**Mac:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Шаг 2: Создай базу данных
```bash
psql -U postgres
CREATE DATABASE publications_db;
CREATE USER user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE publications_db TO user;
\q
```

### Шаг 3: Настрой .env
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/publications_db
TELEGRAM_BOT_TOKEN=твой_токен_от_BotFather
```

### Шаг 4: Установи зависимости
```bash
cd backend
pip install -r requirements.txt
```

### Шаг 5: Запусти приложение
```bash
python main.py
```

или

```bash
uvicorn backend.main:app --reload
```

---

## Вариант 3: Только база данных в Docker

Если хочешь запустить только PostgreSQL в Docker, а приложение локально:

### Шаг 1: Запусти только БД
```bash
docker-compose up -d db
```

### Шаг 2: Запусти приложение локально
```bash
cd backend
python main.py
```

---

## 🎯 Быстрый тест

### 1. Создай канал
```bash
curl -X POST http://localhost:8000/publications/channels \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_id": "-1001234567890",
    "name": "Test Channel",
    "username": "test_channel"
  }'
```

### 2. Создай публикацию
```bash
curl -X POST http://localhost:8000/publications/ \
  -H "Content-Type: application/json" \
  -d '{
    "content_type": "text",
    "text_content": "Привет из API! 🚀",
    "channel_ids": [1]
  }'
```

### 3. Опубликуй
```bash
curl -X POST http://localhost:8000/publications/1/publish
```

---

## 📝 Получение Telegram Bot Token

1. Открой Telegram и найди [@BotFather](https://t.me/BotFather)
2. Отправь команду `/newbot`
3. Следуй инструкциям (придумай имя и username для бота)
4. Получи токен вида `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. Добавь этот токен в `.env` файл

## 📺 Получение Telegram Channel ID

1. Создай канал в Telegram
2. Добавь своего бота как администратора канала
3. Отправь любое сообщение в канал
4. Открой https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
5. Найди `"chat":{"id":-1001234567890}` - это и есть channel_id

---

## 🛠 Полезные команды

**Остановить всё:**
```bash
docker-compose down
```

**Посмотреть логи:**
```bash
docker-compose logs -f backend
```

**Перезапустить:**
```bash
docker-compose restart backend
```

**Очистить всё (включая базу данных):**
```bash
docker-compose down -v
```

---

## ❗ Возможные проблемы

### Ошибка: Connection refused
- Проверь, что PostgreSQL запущен
- Проверь DATABASE_URL в .env

### Ошибка: Unauthorized (Telegram)
- Проверь TELEGRAM_BOT_TOKEN
- Убедись что бот добавлен в канал как администратор

### Ошибка: Module not found
```bash
pip install -r backend/requirements.txt
```

---

## 📚 Документация

После запуска доступны:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

