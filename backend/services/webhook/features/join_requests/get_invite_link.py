from aiogram.types import ChatJoinRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChatInviteLink


class GetInviteLink:
    async def execute(
        self,
        db: AsyncSession,
        join_request: ChatJoinRequest,
    ) -> ChatInviteLink | None:
        invite_link = getattr(join_request, "invite_link", None)
        if not invite_link:
            return None

        result = await db.execute(
            select(ChatInviteLink).where(
                ChatInviteLink.invite_link == invite_link.invite_link
            )
        )
        return result.scalar_one_or_none()
