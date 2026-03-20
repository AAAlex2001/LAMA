"""Celery-сигналы для очистки ресурсов при шатдауне."""

import logging

from celery.signals import worker_shutdown

from backend.celery.async_runner import run as run_async
from backend.database import dispose_celery_engine
from backend.services.bot_provider import cleanup_bot_cache

logger = logging.getLogger(__name__)


@worker_shutdown.connect
def on_worker_shutdown(**kwargs):
    """Очистить DB engine и бот-сессии при остановке воркера."""
    logger.info("Celery worker shutdown: очистка ресурсов")
    try:
        run_async(dispose_celery_engine())
    except Exception as e:
        logger.warning("Не удалось закрыть celery engine: %s", e)
    try:
        run_async(cleanup_bot_cache())
    except Exception as e:
        logger.warning("Не удалось очистить бот-кеш: %s", e)
