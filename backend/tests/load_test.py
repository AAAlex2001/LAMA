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
CHANNEL_TELEGRAM_ID = os.getenv("CHANNEL_TELEGRAM_ID", "-1002657482202")  # Канал "Тест ламы 3"
CHANNEL_ID = int(os.getenv("CHANNEL_ID", "1"))  # ID канала в базе
CHANNEL_NAME = os.getenv("CHANNEL_NAME", "Тест ламы 3")

# Токен аутентификации (можно установить через переменную окружения TEST_AUTH_TOKEN или указать здесь)
# 
# Как получить токен:
# 1. Через Telegram Login Widget на https://lamaplanner.com
# 2. Или установить переменную окружения: export TEST_AUTH_TOKEN="ваш_токен"
AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2NDU0NjY0NywiaWF0IjoxNzY0NDYwMjQ3LCJqdGkiOiJqSm5LYl9OU3V4eHRnT21QVW1JMG53In0.JD3kmp8L8Z_ghuncZYBkhSMfK73f5voD4B1S9xN6WnM")


def random_text(prefix: str, length: int = 16) -> str:
    payload = "".join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{prefix}_{payload}"


def generate_realistic_publication(channel_id: int, idx: int) -> dict:
    """Генерирует реалистичную публикацию с медиа, кнопками и форматированием"""
    
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
    ]
    
    # Разнообразные пункты списка
    list_items_variants = [
        ["Новый визуальный календарь", "Мгновенные шаблоны постов", "Поддержка автоудалений"],
        ["Улучшенная производительность", "Новый дизайн", "Расширенные возможности"],
        ["Быстрая обработка запросов", "Удобный интерфейс", "Мощная аналитика"],
        ["Автоматизация задач", "Интеграции с сервисами", "Умные уведомления"],
        ["Безопасность данных", "Резервное копирование", "Техническая поддержка"],
    ]
    
    # Разнообразные призывы к действию
    call_to_actions = [
        "Жмём «Подробнее», чтобы увидеть демо, или сразу бронируем слот на консультацию 👇",
        "Узнайте больше на нашем сайте или свяжитесь с нами для демонстрации 🚀",
        "Записывайтесь на бесплатную консультацию или смотрите демо прямо сейчас 💫",
        "Начните использовать уже сегодня или посмотрите обзор возможностей 🎯",
        "Получите доступ к новым функциям или задайте вопросы нашим специалистам 📞",
    ]
    
    # Изображения для медиа
    media_urls_list = [
        [
            "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&w=1200",
            "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&w=1200"
        ],
        [
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&w=1200",
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&w=1200"
        ],
        [
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&w=1200",
            "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&w=1200"
        ],
        [
            "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&w=1200",
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&w=1200"
        ],
    ]
    
    # Разнообразные теги
    tag_variants = [
        ["релиз", "новости", "lama_planner"],
        ["обновление", "функции", "разработка"],
        ["анонс", "события", "продукт"],
        ["новинки", "технологии", "инновации"],
        ["спецпредложение", "акция", "промо"],
    ]
    
    # Выбираем варианты случайно
    headline = random.choice(headlines)
    list_items = random.choice(list_items_variants)
    cta = random.choice(call_to_actions)
    media_urls = random.choice(media_urls_list)
    tags = random.choice(tag_variants)
    
    # Формируем текст
    text_content = f"{headline}\n\n— {'\n— '.join(list_items)}\n\n{cta}"
    
    # Форматированный контент
    formatted_content = {
        "blocks": [
            {
                "type": "header",
                "text": headline.replace("📣 ", "").replace("🚀 ", "").replace("💡 ", "").replace("✨ ", "").replace("🎉 ", "").replace("📢 ", "").replace("🔥 ", "").replace("💎 ", "")
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
    
    # Случайное время публикации (в будущем, но не слишком далеко)
    scheduled_time = datetime.now(timezone.utc) + timedelta(
        days=random.randint(0, 7),
        hours=random.randint(9, 18),
        minutes=random.choice([0, 15, 30, 45])
    )
    
    return {
        "status": "draft",
        "content_type": "text_with_media",
        "text_content": text_content,
        "formatted_content": formatted_content,
        "media_urls": media_urls,
        "media_blur": random.choice([True, False]),
        "inline_keyboard": inline_keyboard,
        "pin_message": random.choice([True, False]),
        "auto_delete_hours": random.choice([None, 24, 48, 72]),
        "scheduled_time": scheduled_time.isoformat(),
        "timezone": random.choice(["Europe/Moscow", "UTC", "America/New_York"]),
        "channel_ids": [channel_id],
        "tag_names": tags
    }


async def get_or_verify_channel(client: httpx.AsyncClient, token: str = None) -> int:
    """Получить или проверить существование канала"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        raise ValueError("Authentication token is required! Set TEST_AUTH_TOKEN env var or update AUTH_TOKEN in script.")
    
    # Пытаемся получить канал по ID
    try:
        response = await client.get(
            f"{BASE_URL}{API_PREFIX}/channels/{CHANNEL_ID}",
            headers=headers
        )
        if response.status_code == 200:
            channel_data = response.json()
            print(f"✅ Found existing channel: {channel_data.get('title', 'N/A')} (ID: {CHANNEL_ID})")
            return CHANNEL_ID
    except Exception:
        pass
    
    # Если не найден, пытаемся создать
    telegram_id = CHANNEL_TELEGRAM_ID or f"-100{random.randint(10**8, 10**9 - 1)}"
    payload = {
        "telegram_id": int(telegram_id),
        "title": CHANNEL_NAME,
        "channel_type": "SUPERGROUP",
    }
    
    response = await client.post(
        f"{BASE_URL}{API_PREFIX}/channels/",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 401:
        raise ValueError(f"Authentication failed (401). Token may be expired. Response: {response.text[:200]}")
    
    response.raise_for_status()
    channel_id = response.json()["id"]
    print(f"✅ Created new channel: {CHANNEL_NAME} (ID: {channel_id})")
    return channel_id


async def create_publication(client: httpx.AsyncClient, channel_id: int, idx: int, token: str = None, retries: int = 2) -> float:
    # Генерируем реалистичную публикацию с медиа, кнопками и форматированием
    payload = generate_realistic_publication(channel_id, idx)
    
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
                return elapsed
            
            # Если это ошибка greenlet (400), пробуем повторить
            if response.status_code == 400 and "greenlet" in response.text.lower():
                if attempt < retries:
                    await asyncio.sleep(0.1 * (attempt + 1))  # Экспоненциальная задержка
                    continue
            
            last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            response.raise_for_status()
            
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            if attempt < retries:
                await asyncio.sleep(0.1 * (attempt + 1))
                continue
            raise
        except Exception as e:
            last_error = str(e)
            if attempt < retries:
                await asyncio.sleep(0.1 * (attempt + 1))
                continue
            raise
    
    # Если все попытки не удались
    raise Exception(f"Failed after {retries + 1} attempts: {last_error}")


async def worker(task_id: int, client: httpx.AsyncClient, channel_id: int, semaphore: asyncio.Semaphore, latencies: list[float], errors: list[str], token: str = None):
    async with semaphore:
        try:
            latency = await create_publication(client, channel_id, task_id, token)
            latencies.append(latency)
        except Exception as e:
            errors.append(str(e))


async def main() -> None:
    TARGET_RPS = 500  # Целевая скорость: 500 запросов в секунду (для справки)
    print(f"🔬 Load test started: {TOTAL_REQUESTS} requests with concurrency={CONCURRENCY}")
    print(f"📍 Target: {BASE_URL}{API_PREFIX}")
    print(f"📝 Creating {TOTAL_REQUESTS} publications in channel 'Тест ламы 3'")
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
        # Ensure channel exists and grab ID
        try:
            channel_id = await get_or_verify_channel(client, token)
            print(f"✅ Using channel ID: {channel_id}\n")
        except ValueError as exc:
            print(f"❌ {exc}")
            return
        except Exception as exc:
            print(f"❌ Cannot continue without channel: {exc}")
            if "401" in str(exc):
                print("\n💡 Tip: Your token may be expired. Get a new one from https://lamaplanner.com")
            return

        semaphore = asyncio.Semaphore(CONCURRENCY)
        latencies: list[float] = []
        errors: list[str] = []

        start_ts = time.perf_counter()
        tasks = [
            asyncio.create_task(worker(i, client, channel_id, semaphore, latencies, errors, token))
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

