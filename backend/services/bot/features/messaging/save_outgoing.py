"""Save outgoing BotMessage rows."""

from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage, MessageType


class SaveOutgoingMessage:
    """Insert an outgoing BotMessage with supplied Telegram metadata."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        telegram_message_id: int,
        chat_id: int,
        user_id: Optional[int],
        message_type: MessageType,
        text_content: Optional[str],
        media_file_id: Optional[str],
        media_url: Optional[str],
        is_incoming: bool,
        raw_data: Optional[Dict[str, Any]],
        reply_to_message_id: Optional[int] = None,
    ) -> BotMessage:
        message = BotMessage(
            bot_id=bot_id,
            telegram_message_id=telegram_message_id,
            chat_id=chat_id,
            user_id=user_id,
            message_type=message_type,
            text_content=text_content,
            media_file_id=media_file_id,
            media_url=media_url,
            is_incoming=is_incoming,
            raw_data=raw_data,
            reply_to_message_id=reply_to_message_id,
        )
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return message