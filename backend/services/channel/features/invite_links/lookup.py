from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChatInviteLink


async def find_invite_link_or_404(
    db: AsyncSession,
    link_id: int,
    channel_id: int,
) -> ChatInviteLink:
    """Возвращает ссылку канала по ID или 404."""
    link = (await db.execute(
        select(ChatInviteLink).where(
            ChatInviteLink.id == link_id,
            ChatInviteLink.channel_id == channel_id,
        )
    )).scalar_one_or_none()

    if link is None:
        raise HTTPException(status_code=404, detail="Invite link not found")
    return link


def to_expire_timestamp(expire_date) -> int | None:
    """Конвертирует datetime в Unix timestamp или возвращает None."""
    return int(expire_date.timestamp()) if expire_date else None
