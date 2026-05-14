"""
Load test for calendar endpoint.
Tests the calendar/{year}/{month} endpoint with different parameters.
"""
import asyncio
import os
import httpx
import time
from statistics import mean
from typing import List, Dict, Any
from datetime import datetime, timedelta


BASE_URL = os.getenv("BASE_URL", "https://lamaplanner.com")
API_PREFIX = "/api"
CONCURRENCY = int(os.getenv("CONCURRENCY", "50"))  # 50 параллельных запросов

# Токен аутентификации (можно установить через переменную окружения TEST_AUTH_TOKEN или указать здесь)
AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2NDU0NjY0NywiaWF0IjoxNzY0NDYwMjQ3LCJqdGkiOiJqSm5LYl9OU3V4eHRnT21QVW1JMG53In0.JD3kmp8L8Z_ghuncZYBkhSMfK73f5voD4B1S9xN6WnM")


async def get_calendar(
    client: httpx.AsyncClient,
    year: int,
    month: int,
    timezone: str = "UTC",
    token: str = None
) -> tuple[float, Dict[str, Any]]:
    """Get calendar for a specific month and return (latency, data)"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    start = time.perf_counter()
    response = await client.get(
        f"{BASE_URL}{API_PREFIX}/publications/calendar/{year}/{month}",
        params={"timezone": timezone},
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
    year: int,
    month: int,
    timezone: str,
    semaphore: asyncio.Semaphore,
    latencies: List[float],
    results: List[Dict[str, Any]],
    errors: List[str],
    token: str = None
):
    """Worker that fetches calendar"""
    async with semaphore:
        try:
            latency, data = await get_calendar(client, year, month, timezone, token)
            latencies.append(latency)
            
            # Подсчитываем статистику
            # Формат ответа: {"calendar": [{"date": "2024-01-01", "publications": [...]}, ...]}
            calendar_entries = data.get("calendar", [])
            total_publications = sum(len(entry.get("publications", [])) for entry in calendar_entries)
            days_with_pubs = len([entry for entry in calendar_entries if entry.get("publications")])
            
            results.append({
                "year": year,
                "month": month,
                "timezone": timezone,
                "latency": latency,
                "total_publications": total_publications,
                "days_with_pubs": days_with_pubs,
                "total_days": len(calendar_entries)
            })
            
            print(f"✅ Calendar {year}-{month:02d} ({timezone}): {total_publications} publications, {days_with_pubs} days, {latency*1000:.0f}ms")
        except Exception as e:
            errors.append(str(e))
            print(f"❌ Failed calendar {year}-{month:02d} ({timezone}): {e}")


async def test_calendar_month(
    client: httpx.AsyncClient,
    year: int,
    month: int,
    timezones: List[str],
    concurrency: int,
    token: str
) -> Dict[str, Any]:
    """Test calendar endpoint for a specific month with different timezones"""
    print(f"\n{'='*60}")
    print(f"📅 CALENDAR TEST: {year}-{month:02d}")
    print(f"   Timezones: {', '.join(timezones)}")
    print(f"   Concurrency: {concurrency}")
    print(f"{'='*60}\n")
    
    semaphore = asyncio.Semaphore(concurrency)
    latencies: List[float] = []
    results: List[Dict[str, Any]] = []
    errors: List[str] = []
    
    start_ts = time.perf_counter()
    
    # Создаем задачи для каждого timezone
    tasks = []
    for tz in timezones:
        tasks.append(
            asyncio.create_task(
                worker(len(tasks), client, year, month, tz, semaphore, latencies, results, errors, token)
            )
        )
    
    await asyncio.gather(*tasks, return_exceptions=True)
    total_time = time.perf_counter() - start_ts
    
    return {
        "year": year,
        "month": month,
        "timezones_tested": len(timezones),
        "total_requests": len(tasks),
        "success": len(results),
        "failed": len(errors),
        "total_time": total_time,
        "throughput": len(results) / total_time if total_time > 0 else 0,
        "latencies": latencies,
        "results": results,
        "errors": errors
    }


async def test_multiple_months(
    client: httpx.AsyncClient,
    months: List[tuple[int, int]],  # [(year, month), ...]
    timezones: List[str],
    concurrency: int,
    token: str
) -> Dict[str, Any]:
    """Test calendar for multiple months"""
    print(f"\n{'='*60}")
    print(f"📅 MULTI-MONTH CALENDAR TEST")
    print(f"   Months: {len(months)}")
    print(f"   Timezones per month: {len(timezones)}")
    print(f"   Total requests: {len(months) * len(timezones)}")
    print(f"   Concurrency: {concurrency}")
    print(f"{'='*60}\n")
    
    all_results = []
    all_latencies: List[float] = []
    all_errors: List[str] = []
    
    start_ts = time.perf_counter()
    
    semaphore = asyncio.Semaphore(concurrency)
    tasks = []
    
    for year, month in months:
        for tz in timezones:
            latencies: List[float] = []
            results: List[Dict[str, Any]] = []
            errors: List[str] = []
            
            tasks.append(
                asyncio.create_task(
                    worker(len(tasks), client, year, month, tz, semaphore, latencies, results, errors, token)
                )
            )
    
    await asyncio.gather(*tasks, return_exceptions=True)
    total_time = time.perf_counter() - start_ts
    
    return {
        "months_tested": len(months),
        "timezones_per_month": len(timezones),
        "total_requests": len(tasks),
        "total_time": total_time,
        "throughput": len(tasks) / total_time if total_time > 0 else 0
    }


async def main() -> None:
    print("🔬 Calendar Load Test Started\n")
    print("ℹ️  Note: Calendar shows only SCHEDULED or PUBLISHED publications")
    print("   To see publications in calendar, create them with status='scheduled'")
    print("   Example: PUBLICATION_STATUS=scheduled python load_test.py\n")
    
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
        # Текущая дата
        now = datetime.now()
        current_year = now.year
        current_month = now.month
        
        # Тест 1: Текущий месяц с разными timezone
        print("📅 TEST 1: Current month with different timezones")
        timezones = ["UTC", "Europe/Moscow", "America/New_York", "Asia/Tokyo", "Europe/London"]
        stats1 = await test_calendar_month(client, current_year, current_month, timezones, CONCURRENCY, token)
        
        print(f"\n{'='*60}")
        print(f"📊 TEST 1 RESULTS")
        print(f"{'='*60}")
        print(f"✅ Success: {stats1['success']}/{stats1['total_requests']}")
        print(f"❌ Failed: {stats1['failed']}")
        print(f"⏱️  Total time: {stats1['total_time']:.2f}s")
        print(f"🚀 Throughput: {stats1['throughput']:.2f} req/s")
        
        if stats1['latencies']:
            print(f"📈 Latency:")
            print(f"   - Average: {mean(stats1['latencies'])*1000:.2f} ms")
            print(f"   - Min: {min(stats1['latencies'])*1000:.2f} ms")
            print(f"   - Max: {max(stats1['latencies'])*1000:.2f} ms")
        
        if stats1['results']:
            total_pubs = sum(r['total_publications'] for r in stats1['results'])
            print(f"📅 Calendar data:")
            print(f"   - Total publications: {total_pubs}")
            for r in stats1['results']:
                print(f"     {r['year']}-{r['month']:02d} ({r['timezone']}): {r['total_publications']} pubs in {r['days_with_pubs']} days")
        
        # Небольшая задержка между тестами
        await asyncio.sleep(1)
        
        # Тест 2: Несколько месяцев подряд (текущий, следующий, предыдущий)
        print("\n📅 TEST 2: Multiple months (current, next, previous)")
        months = [
            (current_year, current_month),
            (current_year, current_month + 1 if current_month < 12 else 1),
            (current_year, current_month - 1 if current_month > 1 else 12),
        ]
        # Нормализуем год для следующего/предыдущего месяца
        normalized_months = []
        for year, month in months:
            if month > 12:
                year += 1
                month = 1
            elif month < 1:
                year -= 1
                month = 12
            normalized_months.append((year, month))
        
        stats2 = await test_multiple_months(client, normalized_months, ["UTC", "Europe/Moscow"], CONCURRENCY, token)
        
        print(f"\n{'='*60}")
        print(f"📊 TEST 2 RESULTS")
        print(f"{'='*60}")
        print(f"📅 Months tested: {stats2['months_tested']}")
        print(f"⏱️  Total time: {stats2['total_time']:.2f}s")
        print(f"🚀 Throughput: {stats2['throughput']:.2f} req/s")
        
        # Тест 3: Нагрузочный тест - много параллельных запросов одного месяца
        print("\n📅 TEST 3: Stress test - many concurrent requests for same month")
        stress_timezones = ["UTC"] * 50  # 50 запросов одного месяца
        stats3 = await test_calendar_month(client, current_year, current_month, stress_timezones, CONCURRENCY, token)
        
        print(f"\n{'='*60}")
        print(f"📊 TEST 3 RESULTS (STRESS TEST)")
        print(f"{'='*60}")
        print(f"✅ Success: {stats3['success']}/{stats3['total_requests']}")
        print(f"❌ Failed: {stats3['failed']}")
        print(f"⏱️  Total time: {stats3['total_time']:.2f}s")
        print(f"🚀 Throughput: {stats3['throughput']:.2f} req/s")
        
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
        total_requests = stats1['total_requests'] + stats2['total_requests'] + stats3['total_requests']
        total_success = stats1['success'] + stats2.get('total_requests', 0) + stats3['success']
        total_time_all = stats1['total_time'] + stats2['total_time'] + stats3['total_time']
        print(f"Total requests: {total_requests}")
        print(f"Total success: {total_success}")
        print(f"Overall throughput: {total_requests / total_time_all:.2f} req/s")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())

