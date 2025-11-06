import asyncio
import os
import random
import string
import time
from statistics import mean

import httpx


BASE_URL = os.getenv("BASE_URL", "http://193.42.125.13:8000")
TOTAL_REQUESTS = int(os.getenv("TOTAL_REQUESTS", "100"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "20"))
CHANNEL_TELEGRAM_ID = os.getenv("CHANNEL_TELEGRAM_ID", "-1003209009153")
CHANNEL_NAME = os.getenv("CHANNEL_NAME", "Load Test Channel")


def random_text(prefix: str, length: int = 16) -> str:
    payload = "".join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{prefix}_{payload}"


async def ensure_channel(client: httpx.AsyncClient) -> int:
    telegram_id = CHANNEL_TELEGRAM_ID or f"-100{random.randint(10**8, 10**9 - 1)}"
    payload = {
        "telegram_id": telegram_id,
        "name": f"{CHANNEL_NAME} {telegram_id[-4:]}",
        "username": None,
    }
    response = await client.post(f"{BASE_URL}/publications/channels", json=payload)
    response.raise_for_status()
    return response.json()["id"]


async def create_publication(client: httpx.AsyncClient, channel_id: int, idx: int) -> float:
    payload = {
        "content_type": "text",
        "text_content": random_text("load_test", 64),
        "channel_ids": [channel_id],
        "tag_names": ["load-test", f"batch-{idx % 10}"],
    }
    start = time.perf_counter()
    response = await client.post(f"{BASE_URL}/publications/", json=payload)
    elapsed = time.perf_counter() - start
    if response.status_code != 201:
        print(f"❌ Error {response.status_code}: {response.text}")
    response.raise_for_status()
    return elapsed


async def worker(task_id: int, client: httpx.AsyncClient, channel_id: int, semaphore: asyncio.Semaphore, latencies: list[float], errors: list[str]):
    async with semaphore:
        try:
            latency = await create_publication(client, channel_id, task_id)
            latencies.append(latency)
        except Exception as e:
            errors.append(str(e))


async def main() -> None:
    print(f"🔬 Load test started: {TOTAL_REQUESTS} requests with concurrency={CONCURRENCY}")
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Ensure channel exists and grab ID
        try:
            channel_id = await ensure_channel(client)
        except Exception as exc:
            print(f"⚠️  Cannot continue without channel: {exc}")
            return

        semaphore = asyncio.Semaphore(CONCURRENCY)
        latencies: list[float] = []
        errors: list[str] = []

        start_ts = time.perf_counter()
        tasks = [
            asyncio.create_task(worker(i, client, channel_id, semaphore, latencies, errors))
            for i in range(TOTAL_REQUESTS)
        ]

        await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.perf_counter() - start_ts

        success_count = len(latencies)
        error_count = len(errors)

        print(f"\n✅ Completed {success_count}/{TOTAL_REQUESTS} requests in {total_time:.2f}s")
        if error_count > 0:
            print(f"❌ Errors: {error_count}")
            print(f"   First error: {errors[0] if errors else 'N/A'}")
        if latencies:
            print(f"   Throughput: {success_count / total_time:.2f} req/s")
            print(f"   Latency avg: {mean(latencies)*1000:.2f} ms")
            print(f"   Latency min: {min(latencies)*1000:.2f} ms")
            print(f"   Latency max: {max(latencies)*1000:.2f} ms")


if __name__ == "__main__":
    asyncio.run(main())

