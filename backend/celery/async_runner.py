"""Утилиты для запуска async-кода внутри синхронных Celery-задач."""

from __future__ import annotations

import asyncio
from typing import Awaitable, TypeVar


T = TypeVar("T")

loop: asyncio.AbstractEventLoop | None = None


def run(coro: Awaitable[T]) -> T:
    """Запустить awaitable на стабильном event loop и вернуть результат."""

    global loop
    if loop is None or loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        from backend.database import celery_state
        celery_state["factory"] = None
        celery_state["engine"] = None
    return loop.run_until_complete(coro)
