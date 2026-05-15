"""Celery-приложение и конфигурация очередей/периодических задач."""

from __future__ import annotations

from datetime import timedelta

from celery import Celery
from celery.schedules import crontab
from kombu import Queue

from backend.celery.config import load_celery_config
from backend.models import load_models

import backend.celery.signals  # noqa: F401


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
    worker_prefetch_multiplier=1,
    broker_heartbeat=20,
    broker_heartbeat_checkrate=3,
    broker_connection_retry_on_startup=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=300,
    task_soft_time_limit=270,
    result_expires=3600,
    task_default_queue="default",
    task_queues=(
        Queue("high"),
        Queue("default"),
        Queue("low"),
        Queue("autodelete"),
        Queue("moderation"),
    ),
    task_routes={
        "backend.celery.tasks.publish_publication": {"queue": "high"},
        "backend.celery.tasks.process_scheduled_publications": {"queue": "default"},
        "backend.celery.tasks.process_auto_delete": {"queue": "default"},
        "backend.celery.tasks.process_scheduled_triggers": {"queue": "default"},
        "backend.celery.tasks.process_recurring_messages": {"queue": "default"},
        "backend.celery.tasks.process_repeating_publications": {"queue": "default"},
        "backend.celery.tasks.process_backup_job": {"queue": "low"},
        "backend.celery.tasks.delete_publication_messages": {"queue": "default"},
        "backend.celery.tasks.republish_publication": {"queue": "default"},
        "backend.celery.tasks.delayed_delete_message": {"queue": "autodelete"},
        "backend.celery.tasks.apply_moderation_action": {"queue": "moderation"},
        "backend.celery.tasks.sync_message_metrics": {"queue": "low"},
        "backend.celery.tasks.take_channel_subscribers_snapshot": {"queue": "low"},
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
        "sync-message-metrics-nightly": {
            "task": "backend.celery.tasks.sync_message_metrics",
            "schedule": crontab(hour=22, minute=0),
        },
    },
)
