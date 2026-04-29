from typing import Optional

from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost, ChannelGroup, PostRetransmission
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.retransmit.send_backed_post import send_backed_post
from backend.services.channel.utils.query_utils import get_channel


class RetransmitPost:
    """Ретранслирует бекапнутый пост в другой канал и пишет лог retransmission."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        post: BackedUpPost,
        target_channel_id: int,
        target_channel: Optional[ChannelGroup] = None,
        bot: Optional[Bot] = None,
    ) -> PostRetransmission:
        """Бросает ValueError если target_channel не найден."""
        if target_channel is None:
            target_channel = await get_channel(self.db, target_channel_id, load_bot=True)
            if target_channel is None:
                raise ValueError("Target channel not found")

        if bot is None:
            bot = await resolve_for_channel(self.db, target_channel)

        success = True
        error_message: Optional[str] = None
        target_message_id = 0

        try:
            sent = await send_backed_post(bot, target_channel.telegram_id, post)
            target_message_id = sent.message_id
        except Exception as exc:
            success = False
            error_message = str(exc)

        retransmission = PostRetransmission(
            original_post_id=post.id,
            target_channel_id=target_channel_id,
            target_message_id=target_message_id,
            success=success,
            error_message=error_message,
        )
        self.db.add(retransmission)
        await self.db.flush()
        await self.db.refresh(retransmission)
        return retransmission
