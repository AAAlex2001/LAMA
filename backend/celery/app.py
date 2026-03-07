"""Celery-приложение и конфигурация очередей/периодических задач."""

from __future__ import annotations

from datetime import timedelta

from celery import Celery
from kombu import Queue

from backend.celery.config import load_celery_config
from backend.models import load_models


load_models()

config = load_celery_config()

celery_app = Celery(
    "lama",
    broker=config.broker_url,
    backend=config.result_backend,
    include=["backend.celery.tasks"],
)

celery_app.conf.update(
    timezone=config.timezone,
    enable_utc=config.enable_utc,
    task_default_queue="default",
    task_queues=(
        Queue("high"),
        Queue("default"),
        Queue("low"),
    ),
    task_routes={
        "backend.celery.tasks.publish_publication": {"queue": "high"},
        "backend.celery.tasks.process_scheduled_publications": {"queue": "default"},
        "backend.celery.tasks.process_auto_delete": {"queue": "default"},
        "backend.celery.tasks.process_scheduled_triggers": {"queue": "default"},
        "backend.celery.tasks.process_recurring_messages": {"queue": "default"},
        "backend.celery.tasks.process_repeating_publications": {"queue": "default"},
        "backend.celery.tasks.process_instant_backups": {"queue": "low"},
        "backend.celery.tasks.delete_publication_messages": {"queue": "default"},
        "backend.celery.tasks.republish_publication": {"queue": "default"},
    },
    beat_schedule={
        "process-scheduled-publications": {
            "task": "backend.celery.tasks.process_scheduled_publications",
            "schedule": timedelta(seconds=30),
        },
        "process-auto-delete": {
            "task": "backend.celery.tasks.process_auto_delete",
            "schedule": timedelta(seconds=30),
        },
        "process-instant-backups": {
            "task": "backend.celery.tasks.process_instant_backups",
            "schedule": timedelta(minutes=2),
        },
        "process-scheduled-triggers": {
            "task": "backend.celery.tasks.process_scheduled_triggers",
            "schedule": timedelta(seconds=30),
        },
        "process-recurring-messages": {
            "task": "backend.celery.tasks.process_recurring_messages",
            "schedule": timedelta(minutes=1),
        },
        "process-repeating-publications": {
            "task": "backend.celery.tasks.process_repeating_publications",
            "schedule": timedelta(seconds=30),
        },
    },
)
