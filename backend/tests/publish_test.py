"""
Load test for publishing created publications to Telegram.
Tests the publish_now endpoint under concurrent load.
"""
import asyncio
import httpx
import time
from statistics import mean
from typing import List


BASE_URL = "http://193.42.125.13:8000"
CONCURRENCY = 10  # Lower concurrency for Telegram API limits


def random_text(prefix: str, length: int) -> str:
    import random
    import string
    suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{prefix}_{suffix}"


async def get_draft_publications(client: httpx.AsyncClient) -> List[int]:
    """Get all draft publication IDs"""
    response = await client.get(f"{BASE_URL}/publications/drafts")
    response.raise_for_status()
    data = response.json()
    return [pub["id"] for pub in data["items"]]


async def publish_publication(client: httpx.AsyncClient, publication_id: int) -> float:
    """Publish a single publication and return latency"""
    start = time.perf_counter()
    response = await client.post(f"{BASE_URL}/publications/{publication_id}/publish")
    elapsed = time.perf_counter() - start
    
    if response.status_code != 200:
        print(f"❌ Error {response.status_code} for publication {publication_id}: {response.text}")
    
    response.raise_for_status()
    return elapsed


async def worker(
    task_id: int,
    client: httpx.AsyncClient,
    publication_id: int,
    semaphore: asyncio.Semaphore,
    latencies: List[float],
    errors: List[str]
):
    """Worker that publishes a single publication"""
    async with semaphore:
        try:
            latency = await publish_publication(client, publication_id)
            latencies.append(latency)
            print(f"✅ Published {publication_id} in {latency*1000:.0f}ms")
        except Exception as e:
            errors.append(str(e))
            print(f"❌ Failed to publish {publication_id}: {e}")


async def main() -> None:
    print(f"🔬 Publish test started with concurrency={CONCURRENCY}\n")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Get all draft publications
        print("📋 Fetching draft publications...")
        try:
            publication_ids = await get_draft_publications(client)
        except Exception as exc:
            print(f"⚠️  Cannot continue: {exc}")
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
            asyncio.create_task(worker(i, client, pub_id, semaphore, latencies, errors))
            for i, pub_id in enumerate(publication_ids)
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.perf_counter() - start_ts
        
        success_count = len(latencies)
        error_count = len(errors)
        
        print(f"\n{'='*60}")
        print(f"✅ Published {success_count}/{total_count} publications in {total_time:.2f}s")
        
        if error_count > 0:
            print(f"❌ Errors: {error_count}")
            print(f"   First error: {errors[0] if errors else 'N/A'}")
        
        if latencies:
            print(f"   Throughput: {success_count / total_time:.2f} pub/s")
            print(f"   Latency avg: {mean(latencies)*1000:.2f} ms")
            print(f"   Latency min: {min(latencies)*1000:.2f} ms")
            print(f"   Latency max: {max(latencies)*1000:.2f} ms")
        
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())


