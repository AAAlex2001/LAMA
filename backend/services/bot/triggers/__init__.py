"""
Пакет триггеров — обработка событий и действий бота
"""
from backend.services.bot.triggers.service import TriggerService
from backend.services.bot.triggers.crud import (
    create_trigger,
    get_trigger,
    get_triggers,
    update_trigger,
    delete_trigger,
    get_triggers_for_event,
)
from backend.services.bot.triggers.filters import (
    check_chat_type,
    check_filters,
    check_delivery_window,
)
from backend.services.bot.triggers.executor import (
    send_message,
    send_media,
    mute_user,
    ban_user,
)
from backend.services.bot.triggers.scheduler import (
    schedule_trigger,
    schedule_for_next_window,
    get_pending_tasks,
    execute_scheduled_task,
)

__all__ = [
    # Главный сервис
    "TriggerService",
    # CRUD
    "create_trigger",
    "get_trigger",
    "get_triggers",
    "update_trigger",
    "delete_trigger",
    "get_triggers_for_event",
    # Фильтры
    "check_chat_type",
    "check_filters",
    "check_delivery_window",
    # Executor
    "send_message",
    "send_media",
    "mute_user",
    "ban_user",
    # Scheduler
    "schedule_trigger",
    "schedule_for_next_window",
    "get_pending_tasks",
    "execute_scheduled_task",
]
