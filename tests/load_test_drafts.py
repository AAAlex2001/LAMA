"""
Нагрузочный тест: создание 100 черновиков + серия постов.
Использование:
    python tests/load_test_drafts.py

Переменные окружения:
    AUTH_TOKEN     - Bearer токен (из браузера, приоритет над email/password)
    API_BASE_URL   - базовый URL API (default: https://lamaplanner.com/api)
    AUTH_EMAIL     - email для логина (default: admin@lama.com)
    AUTH_PASSWORD  - пароль (default: admin123)
    CHANNEL_ID     - ID канала для серии (default: auto-discover первый канал)
"""

import asyncio
import aiohttp
import time
import random
import os
import sys
from datetime import datetime, timezone, timedelta

API_BASE = os.getenv("API_BASE_URL", "https://lamaplanner.com/api")
AUTH_TOKEN = os.getenv("AUTH_TOKEN", "")
EMAIL = os.getenv("AUTH_EMAIL", "admin@lama.com")
PASSWORD = os.getenv("AUTH_PASSWORD", "admin123")
CHANNEL_ID = int(os.getenv("CHANNEL_ID", "0"))  # 0 = auto-discover

HEADERS = {
    "Content-Type": "application/json",
}


async def login(session: aiohttp.ClientSession) -> str:
    if AUTH_TOKEN:
        HEADERS["Authorization"] = f"Bearer {AUTH_TOKEN}"
        async with session.get(f"{API_BASE}/auth/me", headers=HEADERS) as resp:
            if resp.status != 200:
                raise RuntimeError(f"AUTH_TOKEN invalid: {resp.status}")
            data = await resp.json()
            print(f"Авторизован (токен): user_id={data['id']}, telegram={data.get('telegram_account', {}).get('username') or data.get('email') or '?'}")
        return AUTH_TOKEN

    async with session.post(f"{API_BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}) as resp:
        if resp.status != 200:
            text = await resp.text()
            raise RuntimeError(f"Login failed: {resp.status} — {text}")
        data = await resp.json()
        token = data["access_token"]
        HEADERS["Authorization"] = f"Bearer {token}"
        print(f"Авторизован: user_id={data['user']['id']}, email={data['user']['email']}")
        return token

CONTENT_TYPES = ["text", "text_with_media", "poll"]
SAMPLE_TEXTS = [
    "Тестовый пост для нагрузочного теста #{i}",
    "Lorem ipsum dolor sit amet #{i}",
    "Проверка производительности системы #{i}",
    "Автоматический черновик #{i} — серия нагрузочных тестов",
    "Публикация #{i}: быстрый коричневый лис прыгает через ленивую собаку",
    "Пост #{i} с длинным текстом. " * 10,
    "Markdown: **жирный** _курсив_ `код` #{i}",
    "Пост с кнопками #{i}",
    "Опрос #{i}",
    "Текст с медиа #{i}",
]

SAMPLE_MEDIA = [
    "https://picsum.photos/800/600",
    "https://picsum.photos/1200/800",
    "https://picsum.photos/640/480",
]

stats = {
    "total": 0,
    "success": 0,
    "failed": 0,
    "times": [],
}


def rand_scheduled_time(date: datetime | None = None) -> str:
    if date:
        dt = date.replace(hour=random.randint(8, 22), minute=random.randint(0, 59), second=0)
    else:
        dt = datetime.now(timezone.utc) + timedelta(hours=random.randint(0, 23))
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def build_draft(i: int, date: datetime | None = None) -> dict:
    content_type = random.choice(CONTENT_TYPES)
    channels = [CHANNEL_ID] if CHANNEL_ID else []
    scheduled = rand_scheduled_time(date)

    if content_type == "poll":
        return {
            "content_type": "poll",
            "channel_ids": channels,
            "scheduled_time": scheduled,
            "poll_data": {
                "question": f"Тестовый опрос #{i}?",
                "options": [f"Вариант {j}" for j in range(1, random.randint(3, 5))],
                "is_anonymous": True,
            },
        }

    if content_type == "text_with_media":
        return {
            "content_type": "text_with_media",
            "channel_ids": channels,
            "scheduled_time": scheduled,
            "text_content": random.choice(SAMPLE_TEXTS).replace("#{i}", str(i)),
            "media_urls": random.sample(SAMPLE_MEDIA, k=random.randint(1, 3)),
        }

    base = {
        "content_type": "text",
        "channel_ids": channels,
        "scheduled_time": scheduled,
        "text_content": random.choice(SAMPLE_TEXTS).replace("#{i}", str(i)),
    }

    if random.random() < 0.3:
        base["inline_keyboard"] = {
            "buttons": [[
                {"text": "Кнопка 1", "type": "url", "url": "https://example.com"},
                {"text": "Кнопка 2", "type": "url", "url": "https://example.com/2"},
            ]]
        }

    return base


async def get_channel_id(session: aiohttp.ClientSession) -> int:
    async with session.get(f"{API_BASE}/channels/", headers=HEADERS) as resp:
        if resp.status != 200:
            text = await resp.text()
            raise RuntimeError(f"Failed to get channels: {resp.status} — {text}")
        data = await resp.json()
        channels = data.get("items", [])
        if not channels:
            print("  [WARN] Каналы не найдены — черновики будут созданы без канала")
            return 0
        channel = channels[0]
        print(f"Найден канал: id={channel['id']}, name={channel.get('name') or channel.get('title', '?')}")
        return channel["id"]


async def create_draft(session: aiohttp.ClientSession, i: int, date: datetime | None = None) -> dict | None:
    payload = build_draft(i, date)
    start = time.monotonic()
    try:
        async with session.post(f"{API_BASE}/publications/", json=payload, headers=HEADERS) as resp:
            elapsed = time.monotonic() - start
            stats["total"] += 1
            stats["times"].append(elapsed)
            if resp.status == 201:
                stats["success"] += 1
                data = await resp.json()
                return data
            else:
                stats["failed"] += 1
                text = await resp.text()
                print(f"  [FAIL] Draft #{i}: {resp.status} — {text[:200]}")
                return None
    except Exception as e:
        stats["failed"] += 1
        stats["total"] += 1
        print(f"  [ERROR] Draft #{i}: {e}")
        return None


async def create_series(session: aiohttp.ClientSession) -> int | None:
    payload = {"name": f"Нагрузочная серия {time.strftime('%H:%M:%S')}"}
    async with session.post(f"{API_BASE}/publications/series", json=payload, headers=HEADERS) as resp:
        if resp.status == 201:
            data = await resp.json()
            return data["id"]
        else:
            text = await resp.text()
            print(f"  [FAIL] Create series: {resp.status} — {text[:200]}")
            return None


async def publish_post(session: aiohttp.ClientSession, pub_id: int) -> bool:
    start = time.monotonic()
    async with session.post(f"{API_BASE}/publications/{pub_id}/publish", headers=HEADERS) as resp:
        elapsed = time.monotonic() - start
        if resp.status in (200, 202):
            print(f"  [OK] Published #{pub_id} in {elapsed:.3f}s")
            return True
        else:
            text = await resp.text()
            print(f"  [FAIL] Publish #{pub_id}: {resp.status} — {text[:200]}")
            return False


def print_stats():
    times = stats["times"]
    if not times:
        print("Нет данных")
        return

    times.sort()
    avg = sum(times) / len(times)
    p50 = times[len(times) // 2]
    p95 = times[int(len(times) * 0.95)]
    p99 = times[int(len(times) * 0.99)]

    print(f"\n{'=' * 50}")
    print(f"  Результаты нагрузочного теста")
    print(f"{'=' * 50}")
    print(f"  Всего запросов:    {stats['total']}")
    print(f"  Успешных:          {stats['success']}")
    print(f"  Ошибок:            {stats['failed']}")
    print(f"  Среднее время:     {avg:.3f}s")
    print(f"  Медиана (p50):     {p50:.3f}s")
    print(f"  p95:               {p95:.3f}s")
    print(f"  p99:               {p99:.3f}s")
    print(f"  Мин:               {min(times):.3f}s")
    print(f"  Макс:              {max(times):.3f}s")
    print(f"  RPS:               {len(times) / sum(times):.1f}")
    print(f"{'=' * 50}")


async def test_drafts(session: aiohttp.ClientSession, count: int = 100, date: datetime | None = None):
    label = date.strftime("%d.%m") if date else "сегодня"
    print(f"\n[1/3] Создание {count} черновиков [{label}] (конкурентно, батчи по 10)...")
    total_start = time.monotonic()

    for batch_start in range(0, count, 10):
        batch_end = min(batch_start + 10, count)
        tasks = [create_draft(session, i, date) for i in range(batch_start + 1, batch_end + 1)]
        await asyncio.gather(*tasks)
        print(f"  Батч {batch_start + 1}-{batch_end}: done")

    total_elapsed = time.monotonic() - total_start
    print(f"  Итого: {count} черновиков за {total_elapsed:.2f}s ({count / total_elapsed:.1f} drafts/s)")


async def test_month_drafts(session: aiohttp.ClientSession, year: int, month: int, per_day: int = 100):
    import calendar as cal
    total_days = cal.monthrange(year, month)[1]
    month_name = cal.month_name[month]
    total = total_days * per_day
    print(f"\n[{month_name.upper()} {year}] Создание {per_day} черновиков × {total_days} дней = {total} постов...")
    grand_start = time.monotonic()

    for day in range(1, total_days + 1):
        date = datetime(year, month, day, tzinfo=timezone.utc)
        print(f"  День {day:02d}.{month:02d}.{year} — создаю {per_day} черновиков...", end=" ", flush=True)
        day_start = time.monotonic()
        for batch_start in range(0, per_day, 20):
            batch_end = min(batch_start + 20, per_day)
            tasks = [create_draft(session, day * 1000 + i, date) for i in range(batch_start, batch_end)]
            await asyncio.gather(*tasks)
        elapsed = time.monotonic() - day_start
        print(f"done ({elapsed:.1f}s)")

    grand_elapsed = time.monotonic() - grand_start
    print(f"  Итого: {total} черновиков за {grand_elapsed:.1f}s ({total / grand_elapsed:.1f} drafts/s)")


async def test_series(session: aiohttp.ClientSession, post_count: int = 5):
    if not CHANNEL_ID:
        print("\n[2/3] Серия постов пропущена — нет канала")
        return
    print(f"\n[2/3] Создание серии из {post_count} постов для канала {CHANNEL_ID}...")

    series_id = await create_series(session)
    if not series_id:
        print("  Не удалось создать серию, пропускаю")
        return

    print(f"  Серия создана: id={series_id}")

    pub_ids = []
    for i in range(post_count):
        payload = {
            "content_type": "text",
            "text_content": f"Серия постов — часть {i + 1}/{post_count}. "
                           f"Тестирование серийной публикации в канал.",
            "channel_ids": [CHANNEL_ID],
            "series_id": series_id,
            "series_order": i,
        }
        async with session.post(f"{API_BASE}/publications/", json=payload, headers=HEADERS) as resp:
            if resp.status == 201:
                data = await resp.json()
                pub_ids.append(data["id"])
                print(f"  Создан пост серии: id={data['id']}, order={i}")
            else:
                text = await resp.text()
                print(f"  [FAIL] Пост серии #{i}: {resp.status} — {text[:200]}")

    if not pub_ids:
        print("  Нет постов для публикации")
        return

    print(f"\n[3/3] Публикация серии ({len(pub_ids)} постов)...")
    for pub_id in pub_ids:
        await publish_post(session, pub_id)
        await asyncio.sleep(0.5)


async def test_concurrent_load(session: aiohttp.ClientSession, count: int = 50):
    print(f"\n[BONUS] Конкурентная нагрузка: {count} запросов одновременно...")
    start = time.monotonic()
    tasks = [create_draft(session, 1000 + i) for i in range(count)]
    await asyncio.gather(*tasks)
    elapsed = time.monotonic() - start
    print(f"  {count} запросов за {elapsed:.2f}s ({count / elapsed:.1f} RPS)")


async def main():
    global CHANNEL_ID
    per_day = int(sys.argv[1]) if len(sys.argv) > 1 else 100

    connector = aiohttp.TCPConnector(limit=20)
    async with aiohttp.ClientSession(connector=connector) as session:
        print(f"API: {API_BASE}")

        await login(session)

        if CHANNEL_ID == 0:
            CHANNEL_ID = await get_channel_id(session)

        print(f"Channel ID: {CHANNEL_ID}")

        await test_month_drafts(session, 2026, 2, per_day)
        await test_month_drafts(session, 2026, 3, per_day)

        print_stats()


if __name__ == "__main__":
    asyncio.run(main())
