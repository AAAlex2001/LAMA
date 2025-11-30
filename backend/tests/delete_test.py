"""
Load test for deleting published publications from Telegram.
Tests the delete_telegram_messages endpoint under concurrent load.
Все опубликованные посты удаляются асинхронно одновременно.
"""
import asyncio
import os
import httpx
import time
from statistics import mean
from typing import List


BASE_URL = os.getenv("BASE_URL", "https://lamaplanner.com")
API_PREFIX = "/api"
CONCURRENCY = int(os.getenv("CONCURRENCY", "50"))  # 50 параллельных запросов на удаление

# Токен аутентификации (можно установить через переменную окружения TEST_AUTH_TOKEN или указать здесь)
AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2NDU0NjY0NywiaWF0IjoxNzY0NDYwMjQ3LCJqdGkiOiJqSm5LYl9OU3V4eHRnT21QVW1JMG53In0.JD3kmp8L8Z_ghuncZYBkhSMfK73f5voD4B1S9xN6WnM")


async def get_published_publications(client: httpx.AsyncClient, token: str = None) -> List[int]:
    """Get all published publication IDs"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    # Получаем все опубликованные публикации (может быть несколько страниц)
    all_publication_ids = []
    page = 1
    page_size = 100
    
    while True:
        response = await client.get(
            f"{BASE_URL}{API_PREFIX}/publications/",
            params={
                "status": "published",
                "page": page,
                "page_size": page_size
            },
            headers=headers
        )
        response.raise_for_status()
        data = response.json()
        
        items = data.get("items", [])
        if not items:
            break
            
        all_publication_ids.extend([pub["id"] for pub in items])
        
        # Если получили меньше запрошенного количества, значит это последняя страница
        if len(items) < page_size:
            break
            
        page += 1
    
    return all_publication_ids


async def delete_telegram_messages(
    client: httpx.AsyncClient, 
    publication_id: int, 
    token: str = None, 
    retries: int = 2
) -> float:
    """Delete published messages from Telegram and return latency"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    last_error = None
    for attempt in range(retries + 1):
        start = time.perf_counter()
        try:
            response = await client.delete(
                f"{BASE_URL}{API_PREFIX}/publications/{publication_id}/telegram-messages",
                headers=headers,
                timeout=60.0
            )
            elapsed = time.perf_counter() - start
            
            if response.status_code == 200:
                data = response.json()
                # Проверяем успешность удаления
                if data.get("success"):
                    return elapsed
                else:
                    # Если не успешно, но статус 200, все равно считаем успешным запрос
                    return elapsed
            
            # Если это ошибка, пробуем повторить
            if response.status_code in [400, 404, 429, 500, 502, 503, 504]:
                if attempt < retries:
                    wait_time = 0.5 * (attempt + 1)
                    print(f"   ⏳ Retry {attempt + 1}/{retries} for {publication_id} after {wait_time:.1f}s...")
                    await asyncio.sleep(wait_time)
                    continue
            
            last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            response.raise_for_status()
            
        except httpx.TimeoutException:
            last_error = "Request timeout"
            if attempt < retries:
                wait_time = 1.0 * (attempt + 1)
                print(f"   ⏳ Timeout, retry {attempt + 1}/{retries} for {publication_id} after {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                continue
            raise
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            if attempt < retries and e.response.status_code in [400, 404, 429, 500, 502, 503, 504]:
                wait_time = 0.5 * (attempt + 1)
                print(f"   ⏳ Retry {attempt + 1}/{retries} for {publication_id} after {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                continue
            raise
        except Exception as e:
            last_error = str(e)
            if attempt < retries:
                wait_time = 0.5 * (attempt + 1)
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
    results: List[dict],
    token: str = None
):
    """Worker that deletes a single publication's Telegram messages"""
    async with semaphore:
        try:
            latency = await delete_telegram_messages(client, publication_id, token)
            latencies.append(latency)
            results.append({"publication_id": publication_id, "success": True, "latency": latency})
            print(f"✅ Deleted messages for publication {publication_id} in {latency*1000:.0f}ms")
        except Exception as e:
            errors.append(str(e))
            results.append({"publication_id": publication_id, "success": False, "error": str(e)})
            print(f"❌ Failed to delete messages for publication {publication_id}: {e}")


async def main() -> None:
    print(f"🔬 Delete test started with concurrency={CONCURRENCY}")
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
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Get all published publications
        print("📋 Fetching published publications...")
        try:
            publication_ids = await get_published_publications(client, token)
        except Exception as exc:
            print(f"❌ Cannot continue: {exc}")
            return
        
        if not publication_ids:
            print("⚠️  No published publications found. Nothing to delete!")
            return
        
        total_count = len(publication_ids)
        print(f"📊 Found {total_count} published publications to delete\n")
        
        semaphore = asyncio.Semaphore(CONCURRENCY)
        latencies: List[float] = []
        errors: List[str] = []
        results: List[dict] = []
        
        start_ts = time.perf_counter()
        tasks = [
            asyncio.create_task(worker(i, client, pub_id, semaphore, latencies, errors, results, token))
            for i, pub_id in enumerate(publication_ids)
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.perf_counter() - start_ts
        
        success_count = len(latencies)
        error_count = len(errors)
        
        print(f"\n{'='*60}")
        print(f"📊 DELETE RESULTS")
        print(f"{'='*60}")
        print(f"✅ Deleted {success_count}/{total_count} publications in {total_time:.2f}s")
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
            print(f"   Throughput: {success_count / total_time:.2f} del/s")
            print(f"   Latency avg: {mean(latencies)*1000:.2f} ms")
            print(f"   Latency p50: {sorted(latencies)[len(latencies)//2]*1000:.2f} ms")
            print(f"   Latency p95: {sorted(latencies)[int(len(latencies)*0.95)]*1000:.2f} ms")
            print(f"   Latency p99: {sorted(latencies)[int(len(latencies)*0.99)]*1000:.2f} ms")
            print(f"   Latency min: {min(latencies)*1000:.2f} ms")
            print(f"   Latency max: {max(latencies)*1000:.2f} ms")
        
        # Статистика по каналам
        successful_results = [r for r in results if r.get("success")]
        if successful_results:
            print(f"\n📈 Successfully deleted messages from {len(successful_results)} publications")
        
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())

