"""
Нагрузочный тест календаря.

Имитирует 10 пользователей, каждый дёргает 4 вида календаря раз в секунду.
Итого ~40 запросов/сек по разным месяцам, неделям и дням.
100 раундов = 4000 запросов.
"""

import asyncio
import random
import time
import httpx

BASE_URL = "https://lamaplanner.com/api"
TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc3MzYyMzM0NCwiaWF0IjoxNzczNTM2OTQ0LCJqdGkiOiJaNW10Q1JVeWcyX0toVU9BRF9zOXdnIn0."
    "yfSOwb2lWmTUDboosAiD_2JB9tFTfLPqITbLfkHpYRA"
)
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
TIMEOUT = httpx.Timeout(30.0)

USERS = 10
ROUNDS = 100

# Разные даты для разнообразия запросов
MONTHS = [
    (2025, 1), (2025, 6), (2025, 12),
    (2026, 1), (2026, 2), (2026, 3),
]
DAYS = [
    "2025-01-15", "2025-06-20", "2025-12-01",
    "2026-01-10", "2026-02-14", "2026-03-01",
    "2026-03-05", "2026-03-10", "2026-03-15",
]
WEEKS = [
    ("2025-01-06", "2025-01-12"),
    ("2025-06-16", "2025-06-22"),
    ("2025-12-01", "2025-12-07"),
    ("2026-01-05", "2026-01-11"),
    ("2026-02-09", "2026-02-15"),
    ("2026-03-09", "2026-03-15"),
]
STATUSES = ["scheduled", "published", "draft", None]


async def req_month_calendar(client: httpx.AsyncClient) -> dict:
    """GET /publications/calendar/{year}/{month}"""
    year, month = random.choice(MONTHS)
    resp = await client.get(
        f"{BASE_URL}/publications/calendar/{year}/{month}",
        params={"timezone": "Europe/Moscow"},
    )
    return {"endpoint": f"calendar/{year}/{month}", "status": resp.status_code, "ms": resp.elapsed.total_seconds() * 1000}


async def req_day_counts(client: httpx.AsyncClient) -> dict:
    """GET /publications/day-counts — весь месяц"""
    year, month = random.choice(MONTHS)
    start = f"{year}-{month:02d}-01T00:00:00"
    end = f"{year}-{month:02d}-28T23:59:59"
    resp = await client.get(
        f"{BASE_URL}/publications/day-counts",
        params={"start_date": start, "end_date": end, "mode": "scheduled"},
    )
    return {"endpoint": "day-counts", "status": resp.status_code, "ms": resp.elapsed.total_seconds() * 1000}


async def req_day_view(client: httpx.AsyncClient) -> dict:
    """GET /publications/ — один день, page_size=50"""
    day = random.choice(DAYS)
    resp = await client.get(
        f"{BASE_URL}/publications/",
        params={
            "start_date": f"{day}T00:00:00",
            "end_date": f"{day}T23:59:59",
            "page": 1,
            "page_size": 50,
            "date_mode": "scheduled",
        },
    )
    return {"endpoint": f"day/{day}", "status": resp.status_code, "ms": resp.elapsed.total_seconds() * 1000}


async def req_week_view(client: httpx.AsyncClient) -> dict:
    """GET /publications/ — неделя"""
    start, end = random.choice(WEEKS)
    resp = await client.get(
        f"{BASE_URL}/publications/",
        params={
            "start_date": f"{start}T00:00:00",
            "end_date": f"{end}T23:59:59",
            "page": 1,
            "page_size": 50,
            "date_mode": "scheduled",
        },
    )
    return {"endpoint": f"week/{start}", "status": resp.status_code, "ms": resp.elapsed.total_seconds() * 1000}


async def req_list_view(client: httpx.AsyncClient) -> dict:
    """GET /publications/ — список с фильтрами"""
    status = random.choice(STATUSES)
    page = random.randint(1, 5)
    params = {
        "page": page,
        "page_size": 30,
        "sort_order": random.choice(["asc", "desc"]),
        "date_mode": random.choice(["scheduled", "published"]),
    }
    if status:
        params["status"] = status
    resp = await client.get(f"{BASE_URL}/publications/", params=params)
    return {"endpoint": f"list/p{page}", "status": resp.status_code, "ms": resp.elapsed.total_seconds() * 1000}


ALL_REQUESTS = [req_month_calendar, req_day_counts, req_day_view, req_week_view, req_list_view]


async def user_session(user_id: int, results: list) -> None:
    """Один «пользователь» — делает запросы каждую секунду."""
    async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT) as client:
        for round_num in range(ROUNDS):
            req_fn = random.choice(ALL_REQUESTS)
            try:
                result = await req_fn(client)
                result["user"] = user_id
                result["round"] = round_num
                results.append(result)
                status_icon = "✓" if result["status"] == 200 else "✗"
                print(f"  [{status_icon}] user={user_id:2d}  {result['endpoint']:30s}  {result['ms']:6.0f}ms  HTTP {result['status']}")
            except Exception as e:
                print(f"  [✗] user={user_id:2d}  {req_fn.__name__:30s}  ERROR: {e}")
                results.append({
                    "user": user_id,
                    "round": round_num,
                    "endpoint": req_fn.__name__,
                    "status": 0,
                    "ms": 0,
                    "error": str(e),
                })
            await asyncio.sleep(1.0)


async def main():
    print(f"Нагрузочный тест календаря: {USERS} пользователей × {ROUNDS} раундов")
    print(f"~{USERS * ROUNDS} запросов, ~{USERS} запросов/сек\n")

    results: list[dict] = []
    t0 = time.monotonic()

    await asyncio.gather(*[user_session(i, results) for i in range(USERS)])

    elapsed = time.monotonic() - t0

    # Статистика
    ok = [r for r in results if r.get("status") == 200]
    errors = [r for r in results if r.get("status") != 200]
    times = [r["ms"] for r in ok]

    print(f"\n{'='*60}")
    print(f"Результаты ({elapsed:.1f}s):")
    print(f"  Всего запросов: {len(results)}")
    print(f"  Успешных (200): {len(ok)}")
    print(f"  Ошибок:         {len(errors)}")

    if times:
        times.sort()
        print(f"\n  Время ответа (мс):")
        print(f"    min:    {times[0]:.0f}")
        print(f"    median: {times[len(times)//2]:.0f}")
        print(f"    p95:    {times[int(len(times)*0.95)]:.0f}")
        print(f"    p99:    {times[int(len(times)*0.99)]:.0f}")
        print(f"    max:    {times[-1]:.0f}")
        print(f"    avg:    {sum(times)/len(times):.0f}")

    # По эндпоинтам
    endpoints: dict[str, list[float]] = {}
    for r in ok:
        ep = r["endpoint"].split("/")[0]
        endpoints.setdefault(ep, []).append(r["ms"])

    print(f"\n  По типу запроса:")
    for ep, ep_times in sorted(endpoints.items()):
        ep_times.sort()
        avg = sum(ep_times) / len(ep_times)
        p95 = ep_times[int(len(ep_times) * 0.95)] if len(ep_times) > 20 else ep_times[-1]
        print(f"    {ep:20s}  n={len(ep_times):4d}  avg={avg:6.0f}ms  p95={p95:6.0f}ms")

    if errors:
        print(f"\n  Первые 10 ошибок:")
        for e in errors[:10]:
            print(f"    user={e['user']} round={e['round']} {e.get('endpoint','')} "
                  f"status={e['status']} {e.get('error','')}")


if __name__ == "__main__":
    asyncio.run(main())
