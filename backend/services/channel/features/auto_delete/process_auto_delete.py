from typing import Optional

from aiogram.types import Message
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery.app import celery_app
from backend.models.channels import ChannelAutoDeleteSettings, ChannelGroup
from backend.services.channel.utils.message_utils import (
    is_command_message,
    is_join_message,
    is_media_message,
    is_system_message,
    is_text_only_message,
)


class ProcessAutoDelete:
    """Ставит входящее сообщение в очередь автоудаления, если настройки канала требуют."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, message: Message, bot_id: int) -> bool:
        """True если задача автоудаления отправлена в Celery."""
        if not message or not message.chat:
            return False

        settings = await find_settings(self.db, message.chat.id)
        if settings is None:
            return False

        if not should_delete(message, settings):
            return False

        celery_app.send_task(
            "backend.celery.tasks.delayed_delete_message",
            args=[bot_id, message.chat.id, message.message_id],
            countdown=settings.delete_delay_seconds or 0,
        )
        return True


async def find_settings(db: AsyncSession, telegram_id: int) -> Optional[ChannelAutoDeleteSettings]:
    """Настройки автоудаления канала по telegram_id (учитывает linked_chat_id)."""
    return (await db.execute(
        select(ChannelAutoDeleteSettings).join(ChannelGroup).where(or_(
            ChannelGroup.telegram_id == telegram_id,
            ChannelGroup.linked_chat_id == telegram_id,
        ))
    )).scalar_one_or_none()


def should_delete(message: Message, settings: ChannelAutoDeleteSettings) -> bool:
    """Решает, нужно ли автоудалять это сообщение."""
    if message.from_user and message.from_user.is_bot and not settings.delete_all_messages:
        return False

    is_system = is_system_message(message)

    if message.sender_chat and not is_system:
        return False

    if settings.delete_all_messages:
        return True

    if is_system:
        if settings.delete_system_messages:
            return True
        return bool(settings.delete_join_messages and is_join_message(message))

    if is_command_message(message):
        return bool(settings.delete_command_messages)

    if settings.delete_text_only and is_text_only_message(message):
        return True

    if settings.delete_media_only and is_media_message(message):
        return True

    return False
