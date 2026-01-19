"""Загрузка конфигурации Celery из переменных окружения."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class CeleryConfig:
    """Конфигурация Celery на время выполнения."""

    broker_url: str
    result_backend: str
    timezone: str
    enable_utc: bool


def load_celery_config() -> CeleryConfig:
    """Загрузить конфигурацию Celery из переменных окружения."""

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    timezone = os.getenv("TZ", "UTC")
    return CeleryConfig(
        broker_url=redis_url,
        result_backend=redis_url,
        timezone=timezone,
        enable_utc=True,
    )
