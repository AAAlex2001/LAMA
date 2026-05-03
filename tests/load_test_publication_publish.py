"""Load test publication creation and publish queueing.

Environment:
  API_BASE_URL=https://lamaplanner.com/api
  LAMA_ACCESS_TOKEN=...
  CHANNEL_IDS=303,292,291,290,289,281
  POSTS_PER_SECOND=50
  DURATION_SECONDS=1
  TOTAL_POSTS=50
  CREATE_CONCURRENCY=50
  PUBLISH_CONCURRENCY=25
  WAIT_AFTER_SECONDS=20
"""

from __future__ import annotations

import json
import os
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any


API_BASE_URL = os.getenv("API_BASE_URL", "https://lamaplanner.com/api").rstrip("/")
ACCESS_TOKEN = (
    os.getenv("LAMA_ACCESS_TOKEN")
    or os.getenv("ACCESS_TOKEN")
    or os.getenv("AUTH_TOKEN")
    or os.getenv("TOKEN")
)
CHANNEL_IDS = [
    int(item.strip())
    for item in os.getenv("CHANNEL_IDS", "303,292,291,290,289,281").split(",")
    if item.strip()
]
POSTS_PER_SECOND = int(os.getenv("POSTS_PER_SECOND", "50"))
DURATION_SECONDS = float(os.getenv("DURATION_SECONDS", "1"))
TOTAL_POSTS = int(os.getenv("TOTAL_POSTS", str(max(1, int(POSTS_PER_SECOND * DURATION_SECONDS)))))
CREATE_CONCURRENCY = int(os.getenv("CREATE_CONCURRENCY", str(POSTS_PER_SECOND)))
PUBLISH_CONCURRENCY = int(os.getenv("PUBLISH_CONCURRENCY", "25"))
WAIT_AFTER_SECONDS = float(os.getenv("WAIT_AFTER_SECONDS", "20"))


def request_json(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> tuple[int, dict[str, Any] | str, float]:
    if not ACCESS_TOKEN:
        raise RuntimeError("Set LAMA_ACCESS_TOKEN or ACCESS_TOKEN")

    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE_URL}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            elapsed = time.perf_counter() - started
            return response.status, json.loads(raw) if raw else {}, elapsed
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        elapsed = time.perf_counter() - started
        return exc.code, raw[:500], elapsed


def create_publication(index: int) -> dict[str, Any]:
    stamp = datetime.now(timezone.utc).isoformat()
    status, data, elapsed = request_json(
        "POST",
        "/publications/",
        {
            "content_type": "text",
            "text_content": f"load-test publish #{index} utc={stamp}",
            "status": "draft",
            "channel_ids": CHANNEL_IDS,
            "tag_names": ["load-test", "publish"],
            "disable_web_page_preview": True,
        },
        timeout=30.0,
    )
    ok = status == 201 and isinstance(data, dict) and data.get("id")
    return {
        "ok": ok,
        "phase": "create",
        "index": index,
        "status": status,
        "publication_id": data.get("id") if isinstance(data, dict) else None,
        "elapsed": elapsed,
        "error": None if ok else data,
    }


def publish_publication(publication_id: int) -> dict[str, Any]:
    status, data, elapsed = request_json(
        "POST",
        f"/publications/{publication_id}/publish",
        timeout=30.0,
    )
    ok = status in (200, 202)
    return {
        "ok": ok,
        "phase": "publish",
        "publication_id": publication_id,
        "status": status,
        "elapsed": elapsed,
        "error": None if ok else data,
    }


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    index = min(len(values) - 1, int(len(values) * pct))
    return values[index]


def print_phase(name: str, results: list[dict[str, Any]], elapsed: float) -> None:
    ok = [item for item in results if item["ok"]]
    failed = [item for item in results if not item["ok"]]
    times = [item["elapsed"] for item in results]
    codes: dict[int, int] = {}
    for item in results:
        codes[item["status"]] = codes.get(item["status"], 0) + 1

    print()
    print("=" * 56)
    print(name)
    print("=" * 56)
    print(f"Total:   {len(results)}")
    print(f"Success: {len(ok)}")
    print(f"Failed:  {len(failed)}")
    print(f"Elapsed: {elapsed:.2f}s")
    print(f"RPS:     {len(results) / elapsed:.1f}" if elapsed > 0 else "RPS:     n/a")
    print(f"Codes:   {codes}")
    if times:
        print(f"Avg:     {statistics.mean(times):.3f}s")
        print(f"p50:     {percentile(times, 0.50):.3f}s")
        print(f"p95:     {percentile(times, 0.95):.3f}s")
        print(f"p99:     {percentile(times, 0.99):.3f}s")
        print(f"Max:     {max(times):.3f}s")
    if failed:
        print("First errors:")
        for item in failed[:5]:
            print(f"  {item}")


def create_at_rate() -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    interval = 1.0 / max(POSTS_PER_SECOND, 1)
    started = time.perf_counter()
    futures = []
    with ThreadPoolExecutor(max_workers=CREATE_CONCURRENCY) as executor:
        for index in range(1, TOTAL_POSTS + 1):
            target_time = started + (index - 1) * interval
            delay = target_time - time.perf_counter()
            if delay > 0:
                time.sleep(delay)
            futures.append(executor.submit(create_publication, index))

        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if len(results) % 10 == 0 or len(results) == TOTAL_POSTS:
                print(f"  created responses {len(results)}/{TOTAL_POSTS}")
    return results


def publish_all(publication_ids: list[int]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=PUBLISH_CONCURRENCY) as executor:
        futures = [executor.submit(publish_publication, pub_id) for pub_id in publication_ids]
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if len(results) % 10 == 0 or len(results) == len(publication_ids):
                print(f"  publish responses {len(results)}/{len(publication_ids)}")
    return results


def main() -> None:
    print("Publication create + publish load test")
    print(f"API: {API_BASE_URL}")
    print(f"Channels: {CHANNEL_IDS}")
    print(f"Total posts: {TOTAL_POSTS}")
    print(f"Create rate: {POSTS_PER_SECOND}/sec")
    print(f"Create concurrency: {CREATE_CONCURRENCY}")
    print(f"Publish concurrency: {PUBLISH_CONCURRENCY}")
    print(f"Telegram target operations: up to {TOTAL_POSTS * len(CHANNEL_IDS)}")

    create_started = time.perf_counter()
    create_results = create_at_rate()
    create_elapsed = time.perf_counter() - create_started
    print_phase("Create publications", create_results, create_elapsed)

    publication_ids = [
        int(item["publication_id"])
        for item in create_results
        if item["ok"] and item.get("publication_id")
    ]
    if not publication_ids:
        raise SystemExit("No publications created; skipping publish")

    publish_started = time.perf_counter()
    publish_results = publish_all(publication_ids)
    publish_elapsed = time.perf_counter() - publish_started
    print_phase("Queue publish", publish_results, publish_elapsed)

    if WAIT_AFTER_SECONDS > 0:
        print()
        print(f"Waiting {WAIT_AFTER_SECONDS:.1f}s for Celery publish tasks...")
        time.sleep(WAIT_AFTER_SECONDS)

    print()
    print("Check logs: docker compose logs --tail=300 celery-worker backend postgres")


if __name__ == "__main__":
    main()
