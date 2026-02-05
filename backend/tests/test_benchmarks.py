import os
import time
import uuid

import pytest

from backend.celery.tasks import publish_publication


def _unique_telegram_id() -> int:
    return int(time.time() * 1000) + (uuid.uuid4().int % 1000)


def _create_channel(client) -> int:
    payload = {
        "telegram_id": _unique_telegram_id(),
        "channel_type": "CHANNEL",
        "title": f"Benchmark Channel {uuid.uuid4().hex[:8]}",
        "username": None,
        "description": "benchmark channel",
    }
    response = client.post("/api/channels/", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _create_publication(client, channel_id: int) -> int:
    payload = {
        "content_type": "text",
        "text_content": f"Benchmark publication {uuid.uuid4().hex}",
        "status": "draft",
        "channel_ids": [channel_id],
        "tag_names": [],
        "disable_web_page_preview": True,
    }
    response = client.post("/api/publications/", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["id"]


@pytest.fixture(autouse=True)
def _disable_celery_apply_async(monkeypatch):
    monkeypatch.setattr(publish_publication, "apply_async", lambda *args, **kwargs: None)


@pytest.fixture()
def channel_id(client):
    return _create_channel(client)


def test_benchmark_create_channel(benchmark, client):
    def run():
        channel_id = _create_channel(client)
        assert channel_id is not None

    benchmark(run)


def test_benchmark_create_publication(benchmark, client, channel_id):
    def run():
        publication_id = _create_publication(client, channel_id)
        assert publication_id is not None

    benchmark(run)


def test_benchmark_create_100_publications(benchmark, client, channel_id):
    def run():
        ids = []
        for _ in range(100):
            publication_id = _create_publication(client, channel_id)
            ids.append(publication_id)
        assert len(ids) == 100

    benchmark(run)


def test_benchmark_publish_publication(benchmark, client, channel_id):
    def setup():
        publication_id = _create_publication(client, channel_id)
        return (publication_id,), {}

    def run(publication_id: int):
        response = client.post(f"/api/publications/{publication_id}/publish")
        assert response.status_code in (200, 202), response.text

    benchmark.pedantic(run, setup=setup, rounds=10, iterations=1)


def test_benchmark_sync_channel(benchmark, client):
    token = os.getenv("BENCH_SYNC_BOT_TOKEN")
    telegram_id = os.getenv("BENCH_SYNC_TELEGRAM_ID")
    username = os.getenv("BENCH_SYNC_USERNAME")
    invite_link = os.getenv("BENCH_SYNC_INVITE_LINK")

    if not token or not (telegram_id or username or invite_link):
        pytest.skip(
            "Set BENCH_SYNC_BOT_TOKEN and one of BENCH_SYNC_TELEGRAM_ID/"
            "BENCH_SYNC_USERNAME/BENCH_SYNC_INVITE_LINK to run this benchmark."
        )

    payload = {"token": token}
    if telegram_id:
        payload["telegram_id"] = int(telegram_id)
    if username:
        payload["username"] = username
    if invite_link:
        payload["invite_link"] = invite_link

    def run():
        response = client.post("/api/channels/sync", json=payload)
        assert response.status_code == 200, response.text
        data = response.json()
        assert data.get("success") is True

    benchmark(run)
