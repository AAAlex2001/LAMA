import logging

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChatInviteLink

logger = logging.getLogger(__name__)


class UpdateInviteLinkMetrics:
    """Обновляет метрики invite-ссылки: clicks + last_used_at."""

    async def execute(self, db: AsyncSession, invite_link_url: str) -> None:
        try:
            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == invite_link_url)
                .values(
                    pending_join_request_count=(
                        ChatInviteLink.pending_join_request_count + 1
                    )
                )
            )
            await db.execute(stmt)
            await db.flush()
            logger.info("Updated invite link metrics: %s", invite_link_url)
        except Exception as exc:
            logger.warning("Failed to update invite link metrics: %s", exc)
