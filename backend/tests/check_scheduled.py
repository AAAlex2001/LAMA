"""
Проверка запланированных публикаций в базе.
Показывает сколько публикаций со статусом SCHEDULED есть в декабре 2025.
"""
import asyncio
import os
import httpx
from datetime import datetime


BASE_URL = os.getenv("BASE_URL", "https://lamaplanner.com")
API_PREFIX = "/api"

AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2NDU0NjY0NywiaWF0IjoxNzY0NDYwMjQ3LCJqdGkiOiJqSm5LYl9OU3V4eHRnT21QVW1JMG53In0.JD3kmp8L8Z_ghuncZYBkhSMfK73f5voD4B1S9xN6WnM")


async def check_all_publications(client: httpx.AsyncClient, token: str):
    """Проверить все публикации (все статусы)"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Проверяем все статусы
    statuses = ["draft", "scheduled", "published", "partial_success", "failed", "deleted"]
    
    all_publications_by_status = {}
    
    for status in statuses:
        print(f"📋 Checking {status} publications...")
        
        page = 1
        page_size = 100
        all_publications = []
        max_pages = 5  # Ограничиваем количество страниц для быстрой проверки
        
        try:
            while page <= max_pages:
                response = await client.get(
                    f"{BASE_URL}{API_PREFIX}/publications/",
                    params={
                        "status": status,
                        "page": page,
                        "page_size": page_size
                    },
                    headers=headers,
                    timeout=120.0
                )
                
                if response.status_code != 200:
                    print(f"   ⚠️  Error: {response.status_code}")
                    break
                
                data = response.json()
                items = data.get("items", [])
                
                if not items:
                    break
                
                all_publications.extend(items)
                
                if len(items) < page_size:
                    break
                
                page += 1
        except httpx.TimeoutException:
            print(f"   ⚠️  Timeout after {len(all_publications)} publications")
        except Exception as e:
            print(f"   ⚠️  Error: {e}")
        
        all_publications_by_status[status] = all_publications
        print(f"   ✅ Found {len(all_publications)} {status} publications (checked {page} pages)")
    
    print(f"\n📊 Summary by status:")
    for status, pubs in all_publications_by_status.items():
        print(f"   {status}: {len(pubs)}")
    
    # Теперь проверяем scheduled и draft (возможно они создаются как draft)
    scheduled_pubs = all_publications_by_status.get("scheduled", [])
    draft_pubs = all_publications_by_status.get("draft", [])
    
    print(f"\n🔍 Checking December 2025 publications...")
    
    # Проверяем и scheduled, и draft публикации
    all_to_check = scheduled_pubs + draft_pubs
    
    # Группируем по месяцам
    december_2025 = []
    other_months = []
    no_date = []
    
    for pub in all_to_check:
        scheduled_time = pub.get("scheduled_time")
        if not scheduled_time:
            no_date.append(pub)
            continue
        
        try:
            dt = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
            if dt.year == 2025 and dt.month == 12:
                december_2025.append(pub)
            else:
                other_months.append((dt.strftime("%Y-%m"), pub))
        except Exception as e:
            print(f"⚠️  Error parsing date {scheduled_time}: {e}")
            no_date.append(pub)
    
    print(f"📅 December 2025: {len(december_2025)} publications")
    print(f"📅 Other months: {len(other_months)} publications")
    print(f"⚠️  No date: {len(no_date)} publications\n")
    
    # Показываем распределение по дням декабря
    if december_2025:
        print("📊 Distribution by day in December 2025:")
        days_count = {}
        for pub in december_2025:
            dt = datetime.fromisoformat(pub["scheduled_time"].replace('Z', '+00:00'))
            day = dt.day
            days_count[day] = days_count.get(day, 0) + 1
        
        for day in sorted(days_count.keys()):
            print(f"   Day {day:2d}: {days_count[day]} publications")
        
        print(f"\n   Total days with publications: {len(days_count)}")
    
    # Показываем статусы декабря
    if december_2025:
        print(f"\n📊 Status breakdown for December 2025:")
        statuses = {}
        for pub in december_2025:
            status = pub.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        
        for status, count in statuses.items():
            print(f"   {status}: {count}")
    
    # Показываем примеры публикаций декабря
    if december_2025:
        print(f"\n📋 Sample December 2025 publications (first 10):")
        for pub in december_2025[:10]:
            dt = datetime.fromisoformat(pub["scheduled_time"].replace('Z', '+00:00'))
            print(f"   ID {pub['id']}: {dt.strftime('%Y-%m-%d %H:%M')} UTC - Status: {pub.get('status')}")
    else:
        print("\n⚠️  No publications found in December 2025!")
        print(f"\n💡 Check: Are publications created with status='scheduled'?")
        print(f"   Draft publications: {len(draft_pubs)}")
        print(f"   Scheduled publications: {len(scheduled_pubs)}")
        
        if draft_pubs:
            print(f"\n📋 Sample draft publications with dates (first 5):")
            for pub in draft_pubs[:5]:
                scheduled_time = pub.get("scheduled_time", "No date")
                print(f"   ID {pub['id']}: {scheduled_time} - Status: {pub.get('status')}")


async def main():
    token = AUTH_TOKEN
    if not token:
        print("❌ No token provided!")
        return
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        await check_all_publications(client, token)


if __name__ == "__main__":
    asyncio.run(main())

