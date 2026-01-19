"""Интеграция Celery для backend-сервиса Lama."""

from backend.celery.app import celery_app

__all__ = ["celery_app"]
