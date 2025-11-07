# Модуль Публикаций для Telegram

Профессиональный модуль для управления публикациями в Telegram каналах с поддержкой отложенных публикаций, AI-генерации контента и мультипостинга.

## Возможности

### CRUD операции
- Создание, чтение, обновление и удаление публикаций
- Поддержка черновиков
- Фильтрация и поиск по статусу, типу контента, тегам

### Типы контента
- Текст с форматированием (HTML)
- Текст с медиа (с поддержкой блюра/spoiler)
- Изображения
- Видео
- Аудио
- Документы
- Ссылки с превью
- Опросы и викторины
- Inline-кнопки

### Публикация
- Мгновенная публикация
- Отложенные публикации по расписанию
- Мультипостинг в несколько каналов
- Автозакрепление сообщений
- Автоудаление (1, 24, 36, 48, 60, 72 часа)

### Календарь и планирование
- Визуальный календарь публикаций
- Поддержка часовых поясов
- Перенос публикаций
- Серии публикаций

### AI функции
- Автогенерация контента с OpenAI GPT-4
- Редактирование текста с помощью AI
- Настройка тона и длины контента

### Уведомления
- Уведомления об успехе/ошибке публикации
- История всех операций

### Редактирование
- Редактирование уже опубликованных сообщений через Telegram API
- Удаление опубликованных сообщений

## Технологии

- **FastAPI** - современный асинхронный веб-фреймворк
- **PostgreSQL** - надежная реляционная БД
- **SQLAlchemy 2.0** - async ORM
- **aiogram 3.x** - Telegram Bot API
- **APScheduler** - планировщик задач
- **Pydantic** - валидация данных

## Установка

1. Установите зависимости:

```bash
pip install -r requirements.txt
```

2. Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

3. Настройте переменные окружения в `.env`:
   - `DATABASE_URL` - строка подключения к PostgreSQL
   - `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота
   - `OPENAI_API_KEY` - API ключ OpenAI (опционально)

4. База данных создастся автоматически при первом запуске

## Запуск

```bash
python backend/main.py
```

Или через uvicorn:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

API будет доступно по адресу: `http://localhost:8000`

Документация API: `http://localhost:8000/docs`

## Структура проекта

```
backend/
├── main.py                      # Главный файл приложения
├── models/
│   └── publications.py         # Модели базы данных
├── schemas/
│   └── publications.py         # Pydantic схемы для валидации
├── services/
│   └── publications.py         # Бизнес-логика
├── routes/
│   └── publications.py         # API эндпоинты
├── requirements.txt            # Зависимости
├── .env.example               # Пример конфигурации
└── README.md                  # Документация
```

## API Endpoints

### Публикации

- `POST /publications/` - Создать публикацию (черновик)
- `GET /publications/` - Получить список публикаций с фильтрацией
- `GET /publications/{id}` - Получить публикацию по ID
- `PUT /publications/{id}` - Обновить публикацию
- `DELETE /publications/{id}` - Удалить публикацию
- `POST /publications/{id}/publish` - Опубликовать сейчас
- `POST /publications/{id}/reschedule` - Перенести публикацию
- `POST /publications/{id}/edit-published` - Редактировать опубликованное
- `DELETE /publications/{id}/telegram-messages` - Удалить из Telegram

### Календарь

- `GET /publications/calendar/{year}/{month}` - Календарь публикаций

### Черновики и планирование

- `GET /publications/drafts` - Получить все черновики
- `GET /publications/scheduled` - Получить запланированные

### AI

- `POST /publications/ai/generate` - Сгенерировать контент с AI
- `POST /publications/ai/edit` - Редактировать с помощью AI

### Каналы и серии

- `POST /publications/channels` - Добавить канал
- `POST /publications/series` - Создать серию публикаций

## Примеры использования

### Создание текстовой публикации

```json
POST /publications/
{
  "content_type": "text",
  "text_content": "Привет! Это тестовая публикация 🚀",
  "channel_ids": [1],
  "tag_names": ["тест", "новости"],
  "scheduled_time": "2024-12-01T12:00:00Z"
}
```

### Создание публикации с изображением

```json
POST /publications/
{
  "content_type": "image",
  "text_content": "Красивое изображение",
  "media_urls": ["https://example.com/image.jpg"],
  "media_blur": true,
  "pin_message": true,
  "channel_ids": [1, 2]
}
```

### Создание опроса

```json
POST /publications/
{
  "content_type": "poll",
  "poll_data": {
    "question": "Какой язык программирования лучший?",
    "options": ["Python", "JavaScript", "Go", "Rust"],
    "is_anonymous": true,
    "allows_multiple_answers": false
  },
  "channel_ids": [1]
}
```

### Публикация с inline-кнопками

```json
POST /publications/
{
  "content_type": "text",
  "text_content": "Выберите действие:",
  "inline_keyboard": {
    "buttons": [
      [
        {"text": "Открыть сайт", "url": "https://example.com"},
        {"text": "Подробнее", "callback_data": "more_info"}
      ]
    ]
  },
  "channel_ids": [1]
}
```

### Генерация контента с AI

```json
POST /publications/ai/generate
{
  "prompt": "Напиши пост про важность здорового питания",
  "content_type": "text",
  "tone": "дружелюбный",
  "max_length": 500
}
```

## Автоматические процессы

### Отложенные публикации
Проверяются каждые 30 секунд. Публикации со статусом `scheduled` и временем `scheduled_time <= now` автоматически публикуются.

### Автоудаление
Проверяется каждые 5 минут. Публикации с установленным `auto_delete_hours` удаляются из каналов после истечения времени.

## Производительность

- **Асинхронная архитектура** - все операции неблокирующие
- **Connection pooling** - пул из 20 подключений к БД + 40 overflow
- **Batch operations** - поддержка мультипостинга
- **Efficient queries** - использование selectinload для избежания N+1
- **Background jobs** - отдельный планировщик для тяжелых задач

## Безопасность

- Валидация всех входных данных через Pydantic
- Защита от SQL-инъекций через ORM
- CORS middleware для API
- Graceful shutdown для корректного завершения процессов

## Мониторинг

- `GET /health` - Проверка состояния приложения
- Логирование всех операций
- Уведомления об ошибках в БД

## Поддержка

Для вопросов и предложений создавайте Issue в репозитории проекта.


