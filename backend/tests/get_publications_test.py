"""
Load test for GET /publications/ endpoint.
Tests paginated retrieval of publications with different page sizes and concurrency.
"""
import asyncio
import os
import httpx
import time
from statistics import mean
from typing import List, Dict, Any


BASE_URL = os.getenv("BASE_URL", "https://lamaplanner.com")
API_PREFIX = "/api"
CONCURRENCY = int(os.getenv("CONCURRENCY", "50"))  # 50 параллельных запросов
PAGE_SIZE = int(os.getenv("PAGE_SIZE", "50"))  # Размер страницы

# Токен аутентификации
AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2NDU0NjY0NywiaWF0IjoxNzY0NDYwMjQ3LCJqdGkiOiJqSm5LYl9OU3V4eHRnT21QVW1JMG53In0.JD3kmp8L8Z_ghuncZYBkhSMfK73f5voD4B1S9xN6WnM")


async def get_publications_page(
    client: httpx.AsyncClient,
    page: int,
    page_size: int,
    token: str = None,
    status: str = None
) -> tuple[float, Dict[str, Any]]:
    """Получить страницу публикаций и вернуть (latency, data)"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    params = {
        "page": page,
        "page_size": page_size
    }
    if status:
        params["status"] = status
    
    start = time.perf_counter()
    response = await client.get(
        f"{BASE_URL}{API_PREFIX}/publications/",
        params=params,
        headers=headers
    )
    elapsed = time.perf_counter() - start
    
    if response.status_code != 200:
        raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")
    
    data = response.json()
    return elapsed, data


async def worker(
    task_id: int,
    client: httpx.AsyncClient,
    page: int,
    page_size: int,
    status: str,
    semaphore: asyncio.Semaphore,
    latencies: List[float],
    results: List[Dict[str, Any]],
    errors: List[str],
    token: str = None
):
    """Worker that fetches a page of publications"""
    async with semaphore:
        try:
            latency, data = await get_publications_page(client, page, page_size, token, status)
            latencies.append(latency)
            
            items_count = len(data.get("items", []))
            total = data.get("total", 0)
            
            results.append({
                "page": page,
                "status": status,
                "latency": latency,
                "items_count": items_count,
                "total": total,
                "page_size": page_size
            })
            
            print(f"✅ Page {page} ({status or 'all'}): {items_count} items, total: {total}, {latency*1000:.0f}ms")
        except Exception as e:
            errors.append(str(e))
            print(f"❌ Failed page {page} ({status or 'all'}): {e}")


async def test_pagination(
    client: httpx.AsyncClient,
    total_pages: int,
    page_size: int,
    status: str = None,
    concurrency: int = 50,
    token: str = None
) -> Dict[str, Any]:
    """Тест пагинации"""
    status_label = status or "all"
    print(f"\n{'='*60}")
    print(f"📄 PAGINATION TEST: {total_pages} pages, page_size={page_size}, status={status_label}")
    print(f"   Concurrency: {concurrency}")
    print(f"{'='*60}\n")
    
    semaphore = asyncio.Semaphore(concurrency)
    latencies: List[float] = []
    results: List[Dict[str, Any]] = []
    errors: List[str] = []
    
    start_ts = time.perf_counter()
    
    tasks = [
        asyncio.create_task(
            worker(i, client, i + 1, page_size, status, semaphore, latencies, results, errors, token)
        )
        for i in range(total_pages)
    ]
    
    await asyncio.gather(*tasks, return_exceptions=True)
    total_time = time.perf_counter() - start_ts
    
    return {
        "total_pages": total_pages,
        "page_size": page_size,
        "status": status,
        "total_requests": len(tasks),
        "success": len(results),
        "failed": len(errors),
        "total_time": total_time,
        "throughput": len(results) / total_time if total_time > 0 else 0,
        "latencies": latencies,
        "results": results,
        "errors": errors
    }


async def test_all_pages_sequential(
    client: httpx.AsyncClient,
    page_size: int,
    status: str = None,
    token: str = None
) -> Dict[str, Any]:
    """Тест последовательного получения всех страниц"""
    print(f"\n{'='*60}")
    print(f"📄 SEQUENTIAL ALL PAGES TEST: page_size={page_size}, status={status or 'all'}")
    print(f"{'='*60}\n")
    
    latencies: List[float] = []
    all_items = []
    page = 1
    total_items = 0
    
    start_ts = time.perf_counter()
    
    while True:
        try:
            latency, data = await get_publications_page(client, page, page_size, token, status)
            latencies.append(latency)
            
            items = data.get("items", [])
            if not items:
                break
            
            all_items.extend(items)
            total_items = data.get("total", 0)
            
            print(f"✅ Page {page}: {len(items)} items, {latency*1000:.0f}ms")
            
            if len(items) < page_size:
                break
            
            page += 1
            
        except Exception as e:
            print(f"❌ Failed page {page}: {e}")
            break
    
    total_time = time.perf_counter() - start_ts
    
    return {
        "page_size": page_size,
        "status": status,
        "total_pages": page,
        "total_items": len(all_items),
        "expected_total": total_items,
        "total_time": total_time,
        "throughput": len(all_items) / total_time if total_time > 0 else 0,
        "latencies": latencies
    }


async def main() -> None:
    print("🔬 GET Publications Load Test Started\n")
    
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
        # Тест 1: Параллельное получение первых 10 страниц (разные статусы)
        print("📄 TEST 1: Parallel pagination - first 10 pages")
        stats1_all = await test_pagination(client, 10, PAGE_SIZE, None, CONCURRENCY, token)
        await asyncio.sleep(1)
        
        stats1_draft = await test_pagination(client, 10, PAGE_SIZE, "draft", CONCURRENCY, token)
        await asyncio.sleep(1)
        
        stats1_scheduled = await test_pagination(client, 10, PAGE_SIZE, "scheduled", CONCURRENCY, token)
        
        print(f"\n{'='*60}")
        print(f"📊 TEST 1 RESULTS")
        print(f"{'='*60}")
        print(f"✅ All status: {stats1_all['success']}/{stats1_all['total_requests']} pages")
        print(f"   Throughput: {stats1_all['throughput']:.2f} pages/s")
        print(f"   Latency avg: {mean(stats1_all['latencies'])*1000:.2f} ms")
        print(f"   Latency min: {min(stats1_all['latencies'])*1000:.2f} ms")
        print(f"   Latency max: {max(stats1_all['latencies'])*1000:.2f} ms")
        
        print(f"\n✅ Draft status: {stats1_draft['success']}/{stats1_draft['total_requests']} pages")
        print(f"   Throughput: {stats1_draft['throughput']:.2f} pages/s")
        print(f"   Latency avg: {mean(stats1_draft['latencies'])*1000:.2f} ms")
        
        print(f"\n✅ Scheduled status: {stats1_scheduled['success']}/{stats1_scheduled['total_requests']} pages")
        print(f"   Throughput: {stats1_scheduled['throughput']:.2f} pages/s")
        print(f"   Latency avg: {mean(stats1_scheduled['latencies'])*1000:.2f} ms")
        
        # Тест 2: Последовательное получение всех страниц (draft)
        await asyncio.sleep(1)
        print("\n📄 TEST 2: Sequential - all pages (draft)")
        stats2 = await test_all_pages_sequential(client, PAGE_SIZE, "draft", token)
        
        print(f"\n{'='*60}")
        print(f"📊 TEST 2 RESULTS")
        print(f"{'='*60}")
        print(f"✅ Total pages: {stats2['total_pages']}")
        print(f"✅ Total items retrieved: {stats2['total_items']}")
        print(f"✅ Expected total: {stats2['expected_total']}")
        print(f"⏱️  Total time: {stats2['total_time']:.2f}s")
        print(f"🚀 Throughput: {stats2['throughput']:.2f} items/s")
        
        if stats2['latencies']:
            print(f"📈 Latency:")
            print(f"   - Average: {mean(stats2['latencies'])*1000:.2f} ms")
            print(f"   - Min: {min(stats2['latencies'])*1000:.2f} ms")
            print(f"   - Max: {max(stats2['latencies'])*1000:.2f} ms")
            print(f"   - p50: {sorted(stats2['latencies'])[len(stats2['latencies'])//2]*1000:.2f} ms")
            print(f"   - p95: {sorted(stats2['latencies'])[int(len(stats2['latencies'])*0.95)]*1000:.2f} ms")
        
        # Тест 3: Стресс-тест - много параллельных запросов одной страницы
        await asyncio.sleep(1)
        print("\n📄 TEST 3: Stress test - 50 parallel requests to page 1")
        stats3 = await test_pagination(client, 1, PAGE_SIZE, None, 50, token)
        # Но делаем 50 запросов к одной странице
        tasks = [
            asyncio.create_task(
                worker(i, client, 1, PAGE_SIZE, None, asyncio.Semaphore(50), 
                      stats3['latencies'], stats3['results'], stats3['errors'], token)
            )
            for i in range(50)
        ]
        start_stress = time.perf_counter()
        await asyncio.gather(*tasks, return_exceptions=True)
        stress_time = time.perf_counter() - start_stress
        
        print(f"\n{'='*60}")
        print(f"📊 TEST 3 RESULTS (STRESS TEST)")
        print(f"{'='*60}")
        print(f"✅ Success: {len(stats3['results'])}/50")
        print(f"⏱️  Total time: {stress_time:.2f}s")
        print(f"🚀 Throughput: {50 / stress_time:.2f} req/s")
        
        if stats3['latencies']:
            latencies = stats3['latencies']
            print(f"📈 Latency:")
            print(f"   - Average: {mean(latencies)*1000:.2f} ms")
            print(f"   - p50: {sorted(latencies)[len(latencies)//2]*1000:.2f} ms")
            print(f"   - p95: {sorted(latencies)[int(len(latencies)*0.95)]*1000:.2f} ms")
            print(f"   - p99: {sorted(latencies)[int(len(latencies)*0.99)]*1000:.2f} ms")
            print(f"   - Min: {min(latencies)*1000:.2f} ms")
            print(f"   - Max: {max(latencies)*1000:.2f} ms")
        
        # Общая сводка
        print(f"\n{'='*60}")
        print("🎯 OVERALL SUMMARY")
        print(f"{'='*60}")
        total_requests = stats1_all['total_requests'] + stats1_draft['total_requests'] + stats1_scheduled['total_requests'] + stats2['total_pages'] + 50
        print(f"Total requests: {total_requests}")
        print(f"Average latency (all tests): {mean(stats1_all['latencies'] + stats1_draft['latencies'] + stats1_scheduled['latencies'] + stats2['latencies'])*1000:.2f} ms")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())


