from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.webhook.features.messages.save_outgoing_if_direct import (
    SaveOutgoingIfDirect,
)
from backend.services.webhook.features.messages.send_bot_response import SendBotResponse
from backend.services.webhook.types import GetShortcodeContext


class SendAutoReply:
    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot

    async def execute(self, message: Message, auto_reply) -> None:
        context = GetShortcodeContext().execute(message, self.bot_model)
        text = ShortcodeProcessor.process(auto_reply.response_text, context)
        sent_message = await SendBotResponse().execute(
            telegram_bot=self.telegram_bot,
            chat_id=message.chat.id,
            text=text,
            media_url=auto_reply.response_media_url,
            media_urls=getattr(auto_reply, "response_media_urls", None),
            media_type=auto_reply.response_media_type,
            buttons=auto_reply.response_buttons,
        )
        await SaveOutgoingIfDirect(self.db, self.bot_model).execute(
            chat_id=message.chat.id,
            tg_message=sent_message,
            fallback_type=auto_reply.response_media_type or MessageType.TEXT,
            fallback_media_url=auto_reply.response_media_url,
        )
