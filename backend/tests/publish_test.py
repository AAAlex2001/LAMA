"""
Load test for publishing created publications to Telegram.
Tests the publish_now endpoint under concurrent load.
"""
import asyncio
import os
import httpx
import time
from statistics import mean
from typing import List


BASE_URL = os.getenv("BASE_URL", "https://lamaplanner.com")
API_PREFIX = "/api"
CONCURRENCY = int(os.getenv("CONCURRENCY", "5"))  # Низкая параллельность для Telegram API (rate limits)

# Токен аутентификации (можно установить через переменную окружения TEST_AUTH_TOKEN или указать здесь)
AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2NDU0NjY0NywiaWF0IjoxNzY0NDYwMjQ3LCJqdGkiOiJqSm5LYl9OU3V4eHRnT21QVW1JMG53In0.JD3kmp8L8Z_ghuncZYBkhSMfK73f5voD4B1S9xN6WnM")


def random_text(prefix: str, length: int) -> str:
    import random
    import string
    suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{prefix}_{suffix}"


async def get_draft_publications(client: httpx.AsyncClient, token: str = None) -> List[int]:
    """Get all draft publication IDs"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    response = await client.get(
        f"{BASE_URL}{API_PREFIX}/publications/drafts",
        headers=headers
    )
    response.raise_for_status()
    data = response.json()
    return [pub["id"] for pub in data["items"]]


async def publish_publication(client: httpx.AsyncClient, publication_id: int, token: str = None, retries: int = 3) -> float:
    """Publish a single publication and return latency"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    last_error = None
    for attempt in range(retries + 1):
        start = time.perf_counter()
        try:
            response = await client.post(
                f"{BASE_URL}{API_PREFIX}/publications/{publication_id}/publish",
                headers=headers,
                timeout=150.0  # Увеличен таймаут для публикации в Telegram
            )
            elapsed = time.perf_counter() - start
            
            if response.status_code == 200:
                return elapsed
            
            # Если это ошибка greenlet, rate limit или timeout, пробуем повторить
            if response.status_code in [400, 429, 504]:
                if attempt < retries:
                    wait_time = 1.0 * (attempt + 1)  # Увеличена задержка для retry
                    print(f"   ⏳ Retry {attempt + 1}/{retries} for {publication_id} after {wait_time:.1f}s...")
                    await asyncio.sleep(wait_time)
                    continue
            
            last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            response.raise_for_status()
            
        except httpx.TimeoutException:
            last_error = "Request timeout (публикация в Telegram занимает слишком много времени)"
            if attempt < retries:
                wait_time = 2.0 * (attempt + 1)
                print(f"   ⏳ Timeout, retry {attempt + 1}/{retries} for {publication_id} after {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                continue
            raise
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            if attempt < retries and e.response.status_code in [400, 429, 504]:
                wait_time = 1.0 * (attempt + 1)
                print(f"   ⏳ Retry {attempt + 1}/{retries} for {publication_id} after {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                continue
            raise
        except Exception as e:
            last_error = str(e)
            if attempt < retries:
                wait_time = 1.0 * (attempt + 1)
                await asyncio.sleep(wait_time)
                continue
            raise
    
    raise Exception(f"Failed after {retries + 1} attempts: {last_error}")


async def worker(
    task_id: int,
    client: httpx.AsyncClient,
    publication_id: int,
    semaphore: asyncio.Semaphore,
    latencies: List[float],
    errors: List[str],
    token: str = None
):
    """Worker that publishes a single publication"""
    async with semaphore:
        try:
            latency = await publish_publication(client, publication_id, token)
            latencies.append(latency)
            print(f"✅ Published {publication_id} in {latency*1000:.0f}ms")
        except Exception as e:
            errors.append(str(e))
            print(f"❌ Failed to publish {publication_id}: {e}")


async def main() -> None:
    print(f"🔬 Publish test started with concurrency={CONCURRENCY}")
    print(f"📍 Target: {BASE_URL}{API_PREFIX}\n")
    
    # Get authentication token
    token = AUTH_TOKEN
    if not token:
        print("❌ No authentication token provided!")
        print("\nTo get a token:")
        print("1. Visit https://lamaplanner.com and login via Telegram")
        print("2. Get token from browser DevTools -> Application -> Local Storage")
        print("3. Set it as TEST_AUTH_TOKEN env var or update AUTH_TOKEN in script")
        return
    
    print(f"✅ Using authentication token (length: {len(token)})\n")
    
    async with httpx.AsyncClient(timeout=150.0) as client:
        # Get all draft publications
        print("📋 Fetching draft publications...")
        try:
            publication_ids = await get_draft_publications(client, token)
        except Exception as exc:
            print(f"❌ Cannot continue: {exc}")
            return
        
        if not publication_ids:
            print("⚠️  No draft publications found. Run load_test.py first!")
            return
        
        total_count = len(publication_ids)
        print(f"📊 Found {total_count} draft publications\n")
        
        semaphore = asyncio.Semaphore(CONCURRENCY)
        latencies: List[float] = []
        errors: List[str] = []
        
        start_ts = time.perf_counter()
        tasks = [
            asyncio.create_task(worker(i, client, pub_id, semaphore, latencies, errors, token))
            for i, pub_id in enumerate(publication_ids)
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.perf_counter() - start_ts
        
        success_count = len(latencies)
        error_count = len(errors)
        
        print(f"\n{'='*60}")
        print(f"📊 PUBLISH RESULTS")
        print(f"{'='*60}")
        print(f"✅ Published {success_count}/{total_count} publications in {total_time:.2f}s")
        print(f"📊 Success rate: {success_count/total_count*100:.1f}%")
        
        if error_count > 0:
            print(f"❌ Errors: {error_count}")
            # Группируем ошибки по типу
            error_types = {}
            for err in errors[:10]:
                err_type = err.split(":")[0] if ":" in err else err[:50]
                error_types[err_type] = error_types.get(err_type, 0) + 1
            
            print(f"   Error breakdown:")
            for err_type, count in error_types.items():
                print(f"     - {err_type}: {count}")
            
            if len(errors) > 10:
                print(f"   ... and {len(errors) - 10} more errors")
        
        if latencies:
            print(f"🚀 Performance:")
            print(f"   Throughput: {success_count / total_time:.2f} pub/s")
            print(f"   Latency avg: {mean(latencies)*1000:.2f} ms")
            print(f"   Latency p50: {sorted(latencies)[len(latencies)//2]*1000:.2f} ms")
            print(f"   Latency p95: {sorted(latencies)[int(len(latencies)*0.95)]*1000:.2f} ms")
            print(f"   Latency p99: {sorted(latencies)[int(len(latencies)*0.99)]*1000:.2f} ms")
            print(f"   Latency min: {min(latencies)*1000:.2f} ms")
            print(f"   Latency max: {max(latencies)*1000:.2f} ms")
        
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())



