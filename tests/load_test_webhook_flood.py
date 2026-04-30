"""
Нагрузочный тест webhook/flood/moderation.

Использование:
    python tests/load_test_webhook_flood.py

Минимально нужно:
    WEBHOOK_BOT_TOKEN=123:abc
    CHAT_IDS=-100111,-100222

Переменные окружения:
    API_BASE_URL          - базовый URL API (default: https://lamaplanner.com/api)
    WEBHOOK_BOT_TOKEN     - токен бота из БД, используется в URL webhook
    WEBHOOK_SECRET        - X-Telegram-Bot-Api-Secret-Token, если включен
    CHAT_IDS              - telegram_id/linked_chat_id каналов через запятую
    CHANNELS              - сколько chat_id использовать из CHAT_IDS (default: все)
    USERS_PER_CHANNEL     - сколько пользователей на канал (default: 100)
    MESSAGES_PER_USER     - сколько сообщений от каждого пользователя (default: 5)
    CONCURRENCY           - параллельные HTTP запросы (default: 100)
    HOT_USER              - 1 = один пользователь спамит в каждом канале (default: 0)
    MESSAGE_ID_START      - стартовый message_id, лучше высокий, чтобы не задеть реальные сообщения (default: 2000000000)
    TEXT_PREFIX           - текст сообщения (default: flood-load)
    WAIT_AFTER_SECONDS    - пауза после отправки, чтобы backend доработал background tasks (default: 10)

Сценарии:
    distributed: много пользователей по многим каналам, проверяет общий throughput.
    hot_user: один пользователь быстро пишет в канал, проверяет hot row channel_flood_states.
"""

import asyncio
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from statistics import mean

API_BASE = os.getenv("API_BASE_URL", "https://lamaplanner.com/api").rstrip("/")
BOT_TOKEN = os.getenv("WEBHOOK_BOT_TOKEN", "")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
CHAT_IDS_RAW = os.getenv("CHAT_IDS", "")
CHANNELS = int(os.getenv("CHANNELS", "0"))
USERS_PER_CHANNEL = int(os.getenv("USERS_PER_CHANNEL", "100"))
MESSAGES_PER_USER = int(os.getenv("MESSAGES_PER_USER", "5"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "100"))
HOT_USER = os.getenv("HOT_USER", "0") == "1"
MESSAGE_ID_START = int(os.getenv("MESSAGE_ID_START", "2000000000"))
TEXT_PREFIX = os.getenv("TEXT_PREFIX", "flood-load")
WAIT_AFTER_SECONDS = float(os.getenv("WAIT_AFTER_SECONDS", "10"))


@dataclass
class Stats:
    total: int = 0
    success: int = 0
    failed: int = 0
    status_codes: dict[int, int] = field(default_factory=dict)
    times: list[float] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def add_response(self, status: int, elapsed: float) -> None:
        self.total += 1
        self.times.append(elapsed)
        self.status_codes[status] = self.status_codes.get(status, 0) + 1
        if 200 <= status < 300:
            self.success += 1
        else:
            self.failed += 1

    def add_error(self, error: Exception) -> None:
        self.total += 1
        self.failed += 1
        self.errors.append(str(error))


stats = Stats()


def get_chat_ids() -> list[int]:
    chat_ids = [int(item.strip()) for item in CHAT_IDS_RAW.split(",") if item.strip()]
    if CHANNELS > 0:
        chat_ids = chat_ids[:CHANNELS]
    if not chat_ids:
        raise RuntimeError("CHAT_IDS is required, example: CHAT_IDS=-100111,-100222")
    return chat_ids


def get_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if WEBHOOK_SECRET:
        headers["X-Telegram-Bot-Api-Secret-Token"] = WEBHOOK_SECRET
    return headers


def build_update(update_id: int, chat_id: int, user_id: int, message_id: int) -> dict:
    username = f"load_user_{user_id}"
    return {
        "update_id": update_id,
        "message": {
            "message_id": message_id,
            "date": int(time.time()),
            "chat": {
                "id": chat_id,
                "type": "supergroup",
                "title": f"Load chat {chat_id}",
            },
            "from": {
                "id": user_id,
                "is_bot": False,
                "first_name": f"Load{user_id}",
                "username": username,
            },
            "text": f"{TEXT_PREFIX} chat={chat_id} user={user_id} msg={message_id}",
        },
    }


def build_jobs(chat_ids: list[int]) -> list[tuple[int, int, int, int]]:
    jobs = []
    update_id = int(time.time() * 1000)
    message_id = MESSAGE_ID_START

    for chat_index, chat_id in enumerate(chat_ids):
        for user_index in range(USERS_PER_CHANNEL):
            user_id = 900_000_000 + chat_index * 1_000_000 + user_index
            if HOT_USER:
                user_id = 900_000_000 + chat_index

            for _ in range(MESSAGES_PER_USER):
                jobs.append((update_id, chat_id, user_id, message_id))
                update_id += 1
                message_id += 1

    random.shuffle(jobs)
    return jobs


async def send_update(
    semaphore: asyncio.Semaphore,
    executor: ThreadPoolExecutor,
    headers: dict[str, str],
    job: tuple[int, int, int, int],
) -> None:
    update_id, chat_id, user_id, message_id = job
    payload = build_update(update_id, chat_id, user_id, message_id)
    url = f"{API_BASE}/telegram/webhook/{BOT_TOKEN}"

    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            status, elapsed = await loop.run_in_executor(
                executor,
                post_json,
                url,
                headers,
                payload,
            )
            stats.add_response(status, elapsed)
    except Exception as exc:
        stats.add_error(exc)


def post_json(url: str, headers: dict[str, str], payload: dict) -> tuple[int, float]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    start = time.monotonic()

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
            return response.status, time.monotonic() - start
    except urllib.error.HTTPError as exc:
        exc.read()
        return exc.code, time.monotonic() - start


async def run_load() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("WEBHOOK_BOT_TOKEN is required")

    chat_ids = get_chat_ids()
    jobs = build_jobs(chat_ids)
    headers = get_headers()
    semaphore = asyncio.Semaphore(CONCURRENCY)

    print("Webhook flood load test")
    print(f"API: {API_BASE}")
    print(f"Channels: {len(chat_ids)}")
    print(f"Users/channel: {USERS_PER_CHANNEL}")
    print(f"Messages/user: {MESSAGES_PER_USER}")
    print(f"Total updates: {len(jobs)}")
    print(f"Concurrency: {CONCURRENCY}")
    print(f"Mode: {'hot_user' if HOT_USER else 'distributed'}")

    started = time.monotonic()

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        tasks = [send_update(semaphore, executor, headers, job) for job in jobs]
        for done_count, batch_start in enumerate(range(0, len(tasks), CONCURRENCY), start=1):
            batch = tasks[batch_start:batch_start + CONCURRENCY]
            await asyncio.gather(*batch)
            sent = min(batch_start + CONCURRENCY, len(tasks))
            print(f"  sent {sent}/{len(tasks)}")

    elapsed = time.monotonic() - started
    print_stats(elapsed)

    if WAIT_AFTER_SECONDS > 0:
        print(f"\nWaiting {WAIT_AFTER_SECONDS:.1f}s for backend background tasks...")
        await asyncio.sleep(WAIT_AFTER_SECONDS)
        print("Check backend/postgres logs for PendingRollbackError, timeout and flood counters.")


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    index = min(int(len(values) * pct), len(values) - 1)
    return sorted(values)[index]


def print_stats(elapsed: float) -> None:
    print("\n" + "=" * 56)
    print("Webhook HTTP results")
    print("=" * 56)
    print(f"Total:        {stats.total}")
    print(f"Success:      {stats.success}")
    print(f"Failed:       {stats.failed}")
    print(f"Elapsed:      {elapsed:.2f}s")
    print(f"RPS:          {stats.total / elapsed:.1f}")
    print(f"Status codes: {stats.status_codes}")

    if stats.times:
        print(f"Avg:          {mean(stats.times):.3f}s")
        print(f"p50:          {percentile(stats.times, 0.50):.3f}s")
        print(f"p95:          {percentile(stats.times, 0.95):.3f}s")
        print(f"p99:          {percentile(stats.times, 0.99):.3f}s")
        print(f"Max:          {max(stats.times):.3f}s")

    if stats.errors:
        print("\nErrors:")
        for error in stats.errors[:10]:
            print(f"  {error}")
    print("=" * 56)


if __name__ == "__main__":
    try:
        asyncio.run(run_load())
    except KeyboardInterrupt:
        print("\nStopped")
        sys.exit(130)
