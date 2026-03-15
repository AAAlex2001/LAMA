"""
Тест массовой публикации серий постов.

Серия A: 100 постов → каналы [9, 4, 3, 2, 1, 15]
Серия B: 20 постов  → канал [5]
Серия C: 20 постов  → канал [269]

Все три серии запускаются параллельно.
"""

import asyncio
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


async def fetch_drafts(client: httpx.AsyncClient) -> list[dict]:
    resp = await client.get(f"{BASE_URL}/publications/drafts", params={"page_size": 200})
    resp.raise_for_status()
    return resp.json()["items"]


async def create_series(client: httpx.AsyncClient, name: str) -> int:
    resp = await client.post(
        f"{BASE_URL}/publications/series",
        json={"name": name, "reply_to_previous": True},
    )
    resp.raise_for_status()
    series_id = resp.json()["id"]
    print(f"  Серия '{name}' создана: id={series_id}")
    return series_id


async def create_publication(
    client: httpx.AsyncClient,
    text: str,
    channel_ids: list[int],
    series_id: int,
    series_order: int,
) -> int:
    resp = await client.post(
        f"{BASE_URL}/publications/",
        json={
            "content_type": "text",
            "text_content": text,
            "channel_ids": channel_ids,
            "series_id": series_id,
            "series_order": series_order,
            "status": "draft",
        },
    )
    resp.raise_for_status()
    pub_id = resp.json()["id"]
    return pub_id


async def publish(client: httpx.AsyncClient, publication_id: int) -> None:
    resp = await client.post(f"{BASE_URL}/publications/{publication_id}/publish")
    resp.raise_for_status()


async def run_series(
    client: httpx.AsyncClient,
    name: str,
    count: int,
    channel_ids: list[int],
    drafts: list[dict],
) -> None:
    print(f"\n{'='*60}")
    print(f"[{name}] Создание серии из {count} постов → каналы {channel_ids}")

    series_id = await create_series(client, name)

    pub_ids: list[int] = []
    for i in range(count):
        draft = drafts[i % len(drafts)]
        text = draft.get("text_content") or f"Пост серии {name} #{i}"
        text = f"[{name} #{i}] {text}"

        pub_id = await create_publication(client, text, channel_ids, series_id, i)
        pub_ids.append(pub_id)

    print(f"[{name}] Создано {len(pub_ids)} публикаций: {pub_ids[0]}..{pub_ids[-1]}")

    print(f"[{name}] Отправка /publish на все {len(pub_ids)} постов...")
    for pub_id in pub_ids:
        await publish(client, pub_id)

    print(f"[{name}] Все /publish вызваны. Цепочка запущена.")


async def main():
    t0 = time.monotonic()

    async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT) as client:
        print("Загрузка черновиков...")
        drafts = await fetch_drafts(client)
        print(f"Найдено {len(drafts)} черновиков")

        if not drafts:
            drafts = [{"text_content": "Тестовый пост для серии"}]

        await asyncio.gather(
            run_series(client, "A-100", 100, [9, 4, 3, 2, 1], drafts),
            run_series(client, "B-20", 20, [5], drafts),
            run_series(client, "C-20", 20, [269], drafts),
        )

    elapsed = time.monotonic() - t0
    print(f"\n{'='*60}")
    print(f"Готово за {elapsed:.1f}s")
    print("Посты поставлены в очередь. Celery-воркеры начнут публикацию.")
    print("Серии будут идти строго последовательно (цепочка).")


if __name__ == "__main__":
    asyncio.run(main())
