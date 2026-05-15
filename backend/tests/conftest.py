"""Корневой conftest. `pytest_plugins` живёт только тут (pytest 8+ требует top-level)."""

pytest_plugins = ["pytest_asyncio"]
