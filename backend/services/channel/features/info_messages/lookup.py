from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import InformationalMessage
from backend.services.channel.utils.query_utils import find_channel_or_404

__all__ = ["find_channel_or_404", "find_info_message_or_404"]


async def find_info_message_or_404(
    db: AsyncSession, channel_id: int, message_id: int,
) -> InformationalMessage:
    """Возвращает информационное сообщение канала или бросает 404."""
    msg = (await db.execute(
        select(InformationalMessage).where(
            InformationalMessage.id == message_id,
            InformationalMessage.channel_id == channel_id,
        )
    )).scalar_one_or_none()
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return msg
