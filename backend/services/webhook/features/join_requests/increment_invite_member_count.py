import logging

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChatInviteLink

logger = logging.getLogger(__name__)


class IncrementInviteMemberCount:
    async def execute(self, db: AsyncSession, invite_link_url: str) -> None:
        try:
            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == invite_link_url)
                .values(member_count=ChatInviteLink.member_count + 1)
            )
            result = await db.execute(stmt)
            if result.rowcount > 0:
                await db.flush()
                logger.info("Incremented member_count for %s", invite_link_url)
        except Exception as exc:
            logger.error("Failed to increment member_count: %s", exc)
