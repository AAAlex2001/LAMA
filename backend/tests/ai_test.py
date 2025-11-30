"""
Load test for AI generation and editing endpoints.
Tests DeepSeek API integration under concurrent load.
"""
import asyncio
import httpx
import time
from statistics import mean
from typing import List, Dict, Any
import random


BASE_URL = "http://193.42.125.13:8000"
CONCURRENCY = 5  # Lower concurrency for AI API limits

# Test prompts for generation
GENERATION_PROMPTS = [
    "Напиши пост о важности здорового образа жизни",
    "Создай мотивирующий пост о достижении целей",
    "Напиши пост о новых технологиях в IT",
    "Создай пост о путешествиях и приключениях",
    "Напиши пост о саморазвитии и обучении",
    "Создай пост о важности командной работы",
    "Напиши пост о креативности и творчестве",
    "Создай пост о балансе работы и личной жизни",
    "Напиши пост о финансовой грамотности",
    "Создай пост о важности общения",
]

# Edit instructions
EDIT_INSTRUCTIONS = [
    "Сделай текст более эмоциональным и вдохновляющим",
    "Добавь больше конкретных примеров",
    "Сократи текст до 2-3 предложений",
    "Сделай текст более профессиональным",
    "Добавь призыв к действию в конце",
    "Перепиши в более дружелюбном тоне",
    "Добавь статистику или факты",
    "Сделай текст более структурированным",
]


async def generate_post(client: httpx.AsyncClient, prompt: str) -> tuple[float, int]:
    """Generate a post with AI and return (latency, publication_id)"""
    payload = {
        "prompt": prompt,
        "content_type": "text"
    }
    
    start = time.perf_counter()
    response = await client.post(f"{BASE_URL}/publications/ai/generate", json=payload)
    elapsed = time.perf_counter() - start
    
    if response.status_code != 201:
        print(f"❌ Generate error {response.status_code}: {response.text[:100]}")
        raise Exception(f"Generate failed: {response.status_code}")
    
    data = response.json()
    return elapsed, data["id"]


async def edit_post(client: httpx.AsyncClient, publication_id: int, instruction: str) -> float:
    """Edit a post with AI and return latency"""
    payload = {
        "instruction": instruction
    }
    
    start = time.perf_counter()
    response = await client.post(
        f"{BASE_URL}/publications/{publication_id}/ai/edit",
        json=payload
    )
    elapsed = time.perf_counter() - start
    
    if response.status_code != 200:
        print(f"❌ Edit error {response.status_code} for pub {publication_id}: {response.text[:100]}")
        raise Exception(f"Edit failed: {response.status_code}")
    
    return elapsed


async def generation_worker(
    task_id: int,
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    results: List[Dict[str, Any]]
):
    """Worker that generates a post"""
    async with semaphore:
        prompt = random.choice(GENERATION_PROMPTS)
        try:
            latency, pub_id = await generate_post(client, prompt)
            results.append({
                "type": "generate",
                "success": True,
                "latency": latency,
                "publication_id": pub_id
            })
            print(f"✅ Generated post {pub_id} in {latency:.2f}s")
        except Exception as e:
            results.append({
                "type": "generate",
                "success": False,
                "error": str(e)
            })
            print(f"❌ Generation failed: {e}")


async def edit_worker(
    task_id: int,
    client: httpx.AsyncClient,
    publication_id: int,
    semaphore: asyncio.Semaphore,
    results: List[Dict[str, Any]]
):
    """Worker that edits a post"""
    async with semaphore:
        instruction = random.choice(EDIT_INSTRUCTIONS)
        try:
            latency = await edit_post(client, publication_id, instruction)
            results.append({
                "type": "edit",
                "success": True,
                "latency": latency,
                "publication_id": publication_id
            })
            print(f"✅ Edited post {publication_id} in {latency:.2f}s")
        except Exception as e:
            results.append({
                "type": "edit",
                "success": False,
                "error": str(e),
                "publication_id": publication_id
            })
            print(f"❌ Edit failed for {publication_id}: {e}")


async def get_random_publications(client: httpx.AsyncClient, count: int) -> List[int]:
    """Get random publication IDs"""
    response = await client.get(f"{BASE_URL}/publications/", params={"limit": count})
    response.raise_for_status()
    data = response.json()
    return [pub["id"] for pub in data["items"]]


async def test_generation(client: httpx.AsyncClient, count: int) -> Dict[str, Any]:
    """Test AI generation"""
    print(f"\n{'='*60}")
    print(f"🤖 AI GENERATION TEST: {count} posts with concurrency={CONCURRENCY}")
    print(f"{'='*60}\n")
    
    semaphore = asyncio.Semaphore(CONCURRENCY)
    results: List[Dict[str, Any]] = []
    
    start_ts = time.perf_counter()
    tasks = [
        asyncio.create_task(generation_worker(i, client, semaphore, results))
        for i in range(count)
    ]
    
    await asyncio.gather(*tasks, return_exceptions=True)
    total_time = time.perf_counter() - start_ts
    
    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]
    
    stats = {
        "total": count,
        "success": len(successful),
        "failed": len(failed),
        "total_time": total_time,
        "throughput": len(successful) / total_time if total_time > 0 else 0,
    }
    
    if successful:
        latencies = [r["latency"] for r in successful]
        stats["latency_avg"] = mean(latencies)
        stats["latency_min"] = min(latencies)
        stats["latency_max"] = max(latencies)
    
    return stats


async def test_editing(client: httpx.AsyncClient, count: int) -> Dict[str, Any]:
    """Test AI editing"""
    print(f"\n{'='*60}")
    print(f"✏️  AI EDITING TEST: {count} edits with concurrency={CONCURRENCY}")
    print(f"{'='*60}\n")
    
    # Get random publications to edit
    print("📋 Fetching publications to edit...")
    try:
        publication_ids = await get_random_publications(client, count)
    except Exception as e:
        print(f"⚠️  Cannot fetch publications: {e}")
        return {"error": str(e)}
    
    if len(publication_ids) < count:
        print(f"⚠️  Only {len(publication_ids)} publications available")
        count = len(publication_ids)
    
    semaphore = asyncio.Semaphore(CONCURRENCY)
    results: List[Dict[str, Any]] = []
    
    start_ts = time.perf_counter()
    tasks = [
        asyncio.create_task(edit_worker(i, client, publication_ids[i], semaphore, results))
        for i in range(count)
    ]
    
    await asyncio.gather(*tasks, return_exceptions=True)
    total_time = time.perf_counter() - start_ts
    
    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]
    
    stats = {
        "total": count,
        "success": len(successful),
        "failed": len(failed),
        "total_time": total_time,
        "throughput": len(successful) / total_time if total_time > 0 else 0,
    }
    
    if successful:
        latencies = [r["latency"] for r in successful]
        stats["latency_avg"] = mean(latencies)
        stats["latency_min"] = min(latencies)
        stats["latency_max"] = max(latencies)
    
    return stats


def print_stats(title: str, stats: Dict[str, Any]):
    """Print test statistics"""
    print(f"\n{'='*60}")
    print(f"📊 {title}")
    print(f"{'='*60}")
    
    if "error" in stats:
        print(f"❌ Error: {stats['error']}")
        return
    
    print(f"✅ Success: {stats['success']}/{stats['total']}")
    
    if stats['failed'] > 0:
        print(f"❌ Failed: {stats['failed']}")
    
    print(f"⏱️  Total time: {stats['total_time']:.2f}s")
    print(f"🚀 Throughput: {stats['throughput']:.2f} req/s")
    
    if "latency_avg" in stats:
        print(f"📈 Latency:")
        print(f"   - Average: {stats['latency_avg']:.2f}s")
        print(f"   - Min: {stats['latency_min']:.2f}s")
        print(f"   - Max: {stats['latency_max']:.2f}s")
    
    print(f"{'='*60}")


async def main() -> None:
    print("🔬 AI Load Test Started\n")
    
    # Configuration
    GENERATE_COUNT = 20  # Generate 20 new posts
    EDIT_COUNT = 30      # Edit 30 existing posts
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Test 1: AI Generation
        gen_stats = await test_generation(client, GENERATE_COUNT)
        print_stats("GENERATION RESULTS", gen_stats)
        
        # Small delay between tests
        await asyncio.sleep(2)
        
        # Test 2: AI Editing
        edit_stats = await test_editing(client, EDIT_COUNT)
        print_stats("EDITING RESULTS", edit_stats)
        
        # Overall summary
        print(f"\n{'='*60}")
        print("🎯 OVERALL SUMMARY")
        print(f"{'='*60}")
        print(f"Generated: {gen_stats.get('success', 0)}/{gen_stats.get('total', 0)}")
        print(f"Edited: {edit_stats.get('success', 0)}/{edit_stats.get('total', 0)}")
        
        total_success = gen_stats.get('success', 0) + edit_stats.get('success', 0)
        total_requests = gen_stats.get('total', 0) + edit_stats.get('total', 0)
        total_time = gen_stats.get('total_time', 0) + edit_stats.get('total_time', 0)
        
        print(f"Total: {total_success}/{total_requests} successful")
        print(f"Overall throughput: {total_success / total_time:.2f} req/s")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())



