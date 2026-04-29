"""Извлечение цели модерации из reply_to или @username аргумента."""

from typing import Optional

from aiogram.types import Message


def extract_target(message: Message) -> tuple[Optional[int], Optional[str]]:
    """(user_id, display_name) из reply_to_message или из @username; (None, @username) если только имя."""
    if message.reply_to_message and message.reply_to_message.from_user:
        user = message.reply_to_message.from_user
        return user.id, user.first_name

    parts = (message.text or "").split()
    if len(parts) > 1 and parts[1].startswith("@"):
        return None, parts[1]

    return None, None
