from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotMessage
from backend.models.channels import InformationalMessage
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.info_messages.info_message_sender import (
    SentInfoMessage,
    send_info_message,
)
from backend.services.channel.features.info_messages.lookup import (
    find_channel_or_404,
    find_info_message_or_404,
)


class PublishInfoMessage:
    """Публикует информационное сообщение канала в Telegram."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, channel_id: int, message_id: int, owner_id: int,
    ) -> InformationalMessage:
        """Бросает 400 если у канала нет telegram_id или сообщение пусто."""
        channel = await find_channel_or_404(self.db, channel_id, owner_id)
        if not channel.telegram_id:
            raise HTTPException(status_code=400, detail="Channel has no Telegram ID")

        msg = await find_info_message_or_404(self.db, channel_id, message_id)

        bot = await resolve_for_channel(self.db, channel)
        result = await send_info_message(bot, channel.telegram_id, msg)
        if result is None:
            raise HTTPException(status_code=400, detail="Message has no content to publish")

        self.db.add(make_outgoing_bot_message(channel.bot_id, channel.telegram_id, msg, result))
        await self.db.flush()
        return msg


def make_outgoing_bot_message(
    bot_id: int,
    chat_id: int,
    msg: InformationalMessage,
    result: SentInfoMessage,
) -> BotMessage:
    """Лог отправленного info-сообщения для истории бота."""
    return BotMessage(
        bot_id=bot_id,
        telegram_message_id=result.sent.message_id,
        chat_id=chat_id,
        user_id=None,
        message_type=result.type,
        text_content=result.text or msg.text,
        media_url=result.media_url,
        is_incoming=False,
        is_system=False,
        raw_data={**result.sent.model_dump(mode="json"), "calendar_source": "INFO_MESSAGE"},
    )
