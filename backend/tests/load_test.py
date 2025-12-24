import asyncio
import os
import random
import string
import time
from statistics import mean
from datetime import datetime, timedelta, timezone

import httpx


BASE_URL = os.getenv("BASE_URL", "https://lamaplanner.com")
API_PREFIX = "/api"
TOTAL_REQUESTS = int(os.getenv("TOTAL_REQUESTS", "300"))  # 300 публикаций
CONCURRENCY = int(os.getenv("CONCURRENCY", "300"))  # 300 одновременных пользователей
# Канал 1: "Тест ламы 3"
CHANNEL_1_TELEGRAM_ID = os.getenv("CHANNEL_1_TELEGRAM_ID", "-1003209009153")
CHANNEL_1_ID = int(os.getenv("CHANNEL_1_ID", "2"))
CHANNEL_1_NAME = os.getenv("CHANNEL_1_NAME", "бебебебебебебебеб")

# Канал 2: "Тест лама 1"
CHANNEL_2_TELEGRAM_ID = os.getenv("CHANNEL_2_TELEGRAM_ID", "-1002657482202")
CHANNEL_2_ID = int(os.getenv("CHANNEL_2_ID", "1"))
CHANNEL_2_NAME = os.getenv("CHANNEL_2_NAME", "Тест лама 3")

# Канал 3: "Тест лама 2"
CHANNEL_3_TELEGRAM_ID = os.getenv("CHANNEL_3_TELEGRAM_ID", "-1003213582087")
CHANNEL_3_ID = int(os.getenv("CHANNEL_3_ID", "4"))
CHANNEL_3_NAME = os.getenv("CHANNEL_3_NAME", "Тест лама 2")

# Токен аутентификации (можно установить через переменную окружения TEST_AUTH_TOKEN или указать здесь)
# 
# Как получить токен:
# 1. Через Telegram Login Widget на https://lamaplanner.com
# 2. Или установить переменную окружения: export TEST_AUTH_TOKEN="ваш_токен"
AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2NjYxMDE5MiwiaWF0IjoxNzY2NTIzNzkyLCJqdGkiOiJmNzJ2SVlXTHJnYzdtR1liVlBvUzRnIn0.CNucaatcjWwS0WhBHEFqB8KgRjpihmmi6zfwfTPfl2M")


def random_text(prefix: str, length: int = 16) -> str:
    payload = "".join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{prefix}_{payload}"


def generate_realistic_publication(channel_ids: list[int], idx: int) -> dict:
    """Генерирует реалистичную публикацию с медиа, кнопками, форматированием и закреплением"""
    
    # Разнообразные заголовки
    headlines = [
        "📣 Большой релиз Lama Planner 2.0!",
        "🚀 Новые возможности в системе",
        "💡 Анонс важных обновлений",
        "✨ Встречайте новую версию",
        "🎉 Специальное предложение",
        "📢 Важное объявление",
        "🔥 Горячие новости",
        "💎 Эксклюзивный контент",
        "⚡ Мощные обновления",
        "🎯 Новые функции",
    ]
    
    # Разнообразные пункты списка
    list_items_variants = [
        ["Новый визуальный календарь", "Мгновенные шаблоны постов", "Поддержка автоудалений"],
        ["Улучшенная производительность", "Новый дизайн", "Расширенные возможности"],
        ["Быстрая обработка запросов", "Удобный интерфейс", "Мощная аналитика"],
        ["Автоматизация задач", "Интеграции с сервисами", "Умные уведомления"],
        ["Безопасность данных", "Резервное копирование", "Техническая поддержка"],
        ["Улучшенная скорость", "Оптимизация работы", "Новые интеграции"],
        ["Расширенная аналитика", "Детальные отчеты", "Гибкие настройки"],
    ]
    
    # Разнообразные призывы к действию
    call_to_actions = [
        "Жмём «Подробнее», чтобы увидеть демо, или сразу бронируем слот на консультацию 👇",
        "Узнайте больше на нашем сайте или свяжитесь с нами для демонстрации 🚀",
        "Записывайтесь на бесплатную консультацию или смотрите демо прямо сейчас 💫",
        "Начните использовать уже сегодня или посмотрите обзор возможностей 🎯",
        "Получите доступ к новым функциям или задайте вопросы нашим специалистам 📞",
        "Ознакомьтесь с новыми возможностями и улучшите свой рабочий процесс ⚡",
        "Попробуйте новые функции бесплатно или закажите персональную демонстрацию 🎁",
    ]
    
    # Разнообразные теги
    tag_variants = [
        ["релиз", "новости", "lama_planner"],
        ["обновление", "функции", "разработка"],
        ["анонс", "события", "продукт"],
        ["новинки", "технологии", "инновации"],
        ["спецпредложение", "акция", "промо"],
        ["обновления", "улучшения", "фичи"],
        ["релиз", "версия", "обновление"],
    ]
    
    # Медиа URL - одна фотка продублированная 2 раза для теста
    single_photo = "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&w=1200"
    media_urls_variants = [
        [single_photo, single_photo],  # Одна и та же фотка 2 раза
    ]
    
    # Выбираем варианты случайно
    headline = random.choice(headlines)
    list_items = random.choice(list_items_variants)
    cta = random.choice(call_to_actions)
    tags = random.choice(tag_variants)
    media_urls = random.choice(media_urls_variants)
    
    # Формируем текст
    text_content = f"{headline}\n\n— {'\n— '.join(list_items)}\n\n{cta}"
    
    # Форматированный контент
    formatted_content = {
        "blocks": [
            {
                "type": "header",
                "text": headline.replace("📣 ", "").replace("🚀 ", "").replace("💡 ", "").replace("✨ ", "").replace("🎉 ", "").replace("📢 ", "").replace("🔥 ", "").replace("💎 ", "").replace("⚡ ", "").replace("🎯 ", "")
            },
            {
                "type": "list",
                "style": "unordered",
                "items": list_items
            },
            {
                "type": "paragraph",
                "text": cta
            }
        ]
    }
    
    # Inline keyboard
    inline_keyboard = {
        "buttons": [
            [
                {
                    "text": random.choice(["🔗 Подробнее", "📖 Узнать больше", "🌐 Сайт", "🔍 Подробности"]),
                    "url": f"https://lama.app/releases/2-0-{idx}"
                },
                {
                    "text": random.choice(["🔥 Забронировать демо", "📅 Записаться", "💬 Связаться", "🎯 Демо"]),
                    "url": f"https://lama.app/demo-{idx}"
                }
            ],
            [
                {
                    "text": random.choice(["✉️ Написать менеджеру", "💼 Контакты", "📞 Связаться", "👤 Менеджер"]),
                    "callback_data": f"contact_manager_{idx}"
                }
            ]
        ]
    }
    
    # Создаем публикации на разные даты декабря 2025
    # Случайный день декабря (1-31)
    december_day = random.randint(1, 31)
    scheduled_time = datetime(2025, 12, december_day, 
                             hour=random.randint(9, 18),
                             minute=random.choice([0, 15, 30, 45]),
                             tzinfo=timezone.utc)
    
    # Режим: "draft" или "scheduled" (для календаря нужны scheduled)
    status_mode = os.getenv("PUBLICATION_STATUS", "scheduled")  # По умолчанию scheduled для календаря
    
    return {
        "status": status_mode,  # "draft" или "scheduled"
        "content_type": "text_with_media",  # С медиа
        "text_content": text_content,
        "formatted_content": formatted_content,
        "media_urls": media_urls,  # Добавляем медиа
        "media_blur": False,
        "inline_keyboard": inline_keyboard,
        "pin_message": False,  # Без закрепления сообщений
        "auto_delete_hours": random.choice([None, 24, 48, 72]),
        "scheduled_time": scheduled_time.isoformat(),  # Всегда есть scheduled_time
        "timezone": random.choice(["Europe/Moscow", "UTC", "America/New_York"]),
        "channel_ids": channel_ids,  # Список каналов для публикации
        "tag_names": tags
    }


async def get_or_verify_channel(
    client: httpx.AsyncClient, 
    channel_id: int, 
    telegram_id: str, 
    channel_name: str,
    token: str = None
) -> int:
    """Получить или проверить существование канала"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        raise ValueError("Authentication token is required! Set TEST_AUTH_TOKEN env var or update AUTH_TOKEN in script.")
    
    # Пытаемся получить канал по ID
    try:
        response = await client.get(
            f"{BASE_URL}{API_PREFIX}/channels/{channel_id}",
            headers=headers
        )
        if response.status_code == 200:
            channel_data = response.json()
            print(f"✅ Found existing channel: {channel_data.get('title', 'N/A')} (ID: {channel_id})")
            return channel_id
    except Exception:
        pass
    
    # Если не найден, пытаемся создать
    payload = {
        "telegram_id": int(telegram_id),
        "title": channel_name,
        "channel_type": "CHANNEL",
    }
    
    response = await client.post(
        f"{BASE_URL}{API_PREFIX}/channels/",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 401:
        raise ValueError(f"Authentication failed (401). Token may be expired. Response: {response.text[:200]}")
    
    response.raise_for_status()
    created_channel_id = response.json()["id"]
    print(f"✅ Created new channel: {channel_name} (ID: {created_channel_id})")
    return created_channel_id


async def create_publication(client: httpx.AsyncClient, channel_ids: list[int], idx: int, token: str = None, retries: int = 2) -> float:
    # Генерируем реалистичную публикацию с медиа, кнопками и форматированием
    payload = generate_realistic_publication(channel_ids, idx)
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    last_error = None
    for attempt in range(retries + 1):
        start = time.perf_counter()
        try:
            response = await client.post(
                f"{BASE_URL}{API_PREFIX}/publications/",
                json=payload,
                headers=headers
            )
            elapsed = time.perf_counter() - start
            
            if response.status_code == 201:
                # Проверяем, что статус правильно установлен
                created_pub = response.json()
                expected_status = payload.get("status", "draft")
                actual_status = created_pub.get("status")
                if expected_status != actual_status:
                    print(f"   ⚠️  Warning: Expected status '{expected_status}', got '{actual_status}' for pub {created_pub.get('id')}")
                return elapsed
            
            # Если это ошибка greenlet (400), пробуем повторить
            if response.status_code == 400 and "greenlet" in response.text.lower():
                if attempt < retries:
                    await asyncio.sleep(0)  # Экспоненциальная задержка
                    continue
            
            last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            response.raise_for_status()
            
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            if attempt < retries:
                await asyncio.sleep(0)
                continue
            raise
        except Exception as e:
            last_error = str(e)
            if attempt < retries:
                await asyncio.sleep(0)
                continue
            raise
    
    # Если все попытки не удались
    raise Exception(f"Failed after {retries + 1} attempts: {last_error}")


async def worker(task_id: int, client: httpx.AsyncClient, channel_ids: list[int], latencies: list[float], errors: list[str], token: str = None):
    try:
        latency = await create_publication(client, channel_ids, task_id, token)
        latencies.append(latency)
    except Exception as e:
        errors.append(str(e))


async def main() -> None:
    TARGET_RPS = 500  # Целевая скорость: 500 запросов в секунду (для справки)
    status_mode = os.getenv("PUBLICATION_STATUS", "scheduled")
    print(f"🔬 Load test started: {TOTAL_REQUESTS} requests with concurrency={CONCURRENCY}")
    print(f"📍 Target: {BASE_URL}{API_PREFIX}")
    print(f"📝 Creating {TOTAL_REQUESTS} publications for 3 channels:")
    print(f"   - Channel 1: '{CHANNEL_1_NAME}' (ID: {CHANNEL_1_ID})")
    print(f"   - Channel 2: '{CHANNEL_2_NAME}' (ID: {CHANNEL_2_ID})")
    print(f"   - Channel 3: '{CHANNEL_3_NAME}' (ID: {CHANNEL_3_ID})")
    print(f"   - Status: {status_mode}")
    print(f"   - Scheduled dates: December 2025 (random days 1-31)")
    print(f"⚡ Concurrency: {CONCURRENCY} parallel requests")
    
    # Get authentication token
    token = AUTH_TOKEN
    if not token:
        print("❌ No authentication token provided!")
        print("\nTo get a token:")
        print("1. Visit https://lamaplanner.com and login via Telegram")
        print("2. Get token from browser DevTools -> Application -> Local Storage")
        print("3. Set it as TEST_AUTH_TOKEN env var or update AUTH_TOKEN in script")
        print("\nExample:")
        print('  export TEST_AUTH_TOKEN="your_token_here"  # Linux/Mac')
        print('  set TEST_AUTH_TOKEN=your_token_here       # Windows CMD')
        print('  $env:TEST_AUTH_TOKEN="your_token_here"    # Windows PowerShell')
        return
    
    print(f"✅ Using authentication token (length: {len(token)})\n")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Ensure all channels exist and grab IDs
        try:
            channel_1_id = await get_or_verify_channel(client, CHANNEL_1_ID, CHANNEL_1_TELEGRAM_ID, CHANNEL_1_NAME, token)
            channel_2_id = await get_or_verify_channel(client, CHANNEL_2_ID, CHANNEL_2_TELEGRAM_ID, CHANNEL_2_NAME, token)
            channel_3_id = await get_or_verify_channel(client, CHANNEL_3_ID, CHANNEL_3_TELEGRAM_ID, CHANNEL_3_NAME, token)
            channel_ids = [channel_1_id, channel_2_id, channel_3_id]
            print(f"✅ Using channel IDs: {channel_ids}\n")
        except ValueError as exc:
            print(f"❌ {exc}")
            return
        except Exception as exc:
            print(f"❌ Cannot continue without channels: {exc}")
            if "401" in str(exc):
                print("\n💡 Tip: Your token may be expired. Get a new one from https://lamaplanner.com")
            return

        latencies: list[float] = []
        errors: list[str] = []

        start_ts = time.perf_counter()
        tasks = [
            asyncio.create_task(worker(i, client, channel_ids, latencies, errors, token))
            for i in range(TOTAL_REQUESTS)
        ]

        await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.perf_counter() - start_ts

        success_count = len(latencies)
        error_count = len(errors)

        print(f"\n✅ Completed {success_count}/{TOTAL_REQUESTS} requests in {total_time:.2f}s")
        print(f"📊 Success rate: {success_count/TOTAL_REQUESTS*100:.1f}%")
        
        if error_count > 0:
            print(f"❌ Errors: {error_count}")
            # Группируем ошибки по типу
            error_types = {}
            for err in errors[:10]:  # Первые 10 ошибок
                err_type = err.split(":")[0] if ":" in err else err[:50]
                error_types[err_type] = error_types.get(err_type, 0) + 1
            
            print(f"   Error breakdown:")
            for err_type, count in error_types.items():
                print(f"     - {err_type}: {count}")
            
            if len(errors) > 10:
                print(f"   ... and {len(errors) - 10} more errors")
        
        if latencies:
            throughput = success_count / total_time
            print(f"🚀 Performance:")
            print(f"   Throughput: {throughput:.2f} req/s")
            print(f"   Estimated time for 1000 posts: {1000/throughput:.1f}s")
            print(f"   Estimated time for 10000 posts: {10000/throughput:.1f}s")
            
            # Сравнение с целевой скоростью
            if throughput >= TARGET_RPS * 0.95:  # 95% от целевой скорости
                print(f"   ✅ Target achieved: {throughput/TARGET_RPS*100:.1f}% of {TARGET_RPS} req/s target")
            elif throughput >= TARGET_RPS * 0.8:
                print(f"   ⚠️  Target partially achieved: {throughput/TARGET_RPS*100:.1f}% of {TARGET_RPS} req/s target")
            else:
                print(f"   ℹ️  Current throughput: {throughput:.2f} req/s (target was {TARGET_RPS} req/s)")
            
            print(f"   Latency avg: {mean(latencies)*1000:.2f} ms")
            print(f"   Latency p50: {sorted(latencies)[len(latencies)//2]*1000:.2f} ms")
            print(f"   Latency p95: {sorted(latencies)[int(len(latencies)*0.95)]*1000:.2f} ms")
            print(f"   Latency p99: {sorted(latencies)[int(len(latencies)*0.99)]*1000:.2f} ms")
            print(f"   Latency min: {min(latencies)*1000:.2f} ms")
            print(f"   Latency max: {max(latencies)*1000:.2f} ms")


if __name__ == "__main__":
    asyncio.run(main())

