"""
Entry point для Celery — обработка обновлений polling-ботов.

Вся логика вынесена в backend.services.polling:
  - dispatcher.py   — PollingDispatcher (fetch bots, get updates, route)
  - message.py      — PollingMessageHandler (команды, автоответы, ночной режим)
  - callback.py     — PollingCallbackHandler (капча)
  - join_request.py — PollingJoinRequestHandler (заявки на вступление)
  - schemas.py      — Pydantic-схемы (ShortcodeContext, BotResponse)
  - base.py         — утилиты (bot_session, approve_join_request)
"""

from backend.services.polling.dispatcher import process_bot_updates

__all__ = ["process_bot_updates"]
