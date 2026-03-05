"""Polling-модуль для обработки обновлений пользовательских ботов."""

from backend.services.polling.dispatcher import PollingDispatcher, process_bot_updates

__all__ = ["PollingDispatcher", "process_bot_updates"]
