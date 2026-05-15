import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.commands.find_by_text import FindCommandByText
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.features.commands.create_command_event import (
    CreateCommandEvent,
)
from backend.services.webhook.features.commands.fire_command_triggers import (
    FireCommandTriggers,
)
from backend.services.webhook.features.commands.normalize_command import NormalizeCommand
from backend.services.webhook.features.commands.execute_moderation_command import (
    ExecuteModerationCommand,
)
from backend.services.webhook.features.commands.send_claim_to_admin import (
    SendClaimToAdmin,
)
from backend.services.webhook.features.commands.send_command_response import (
    SendCommandResponse,
)
from backend.services.webhook.features.messages.save_system_message import (
    SaveSystemMessage,
)

logger = logging.getLogger(__name__)

MODERATION_COMMANDS = {
    "/admin",
    "/ban",
    "/unban",
    "/mute",
    "/unmute",
    "/delitetime",
}


class RouteBotCommand:
    """Главный диспатчер команд бота: /start, /guest, кастомные, модерационные."""

    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot

    async def execute(
        self,
        message: Message,
        text_content: str,
        chat_type: str | None,
    ) -> None:
        raw_command = text_content.split()[0]
        command_text = NormalizeCommand().execute(raw_command, self.bot_model)

        if command_text in MODERATION_COMMANDS:
            await ExecuteModerationCommand(self.db, self.bot_model, self.telegram_bot).execute(
                message,
                command_text,
                text_content,
            )
            return

        command = await self.get_command(message, command_text, chat_type)
        if not command:
            return

        await FireCommandTriggers(self.db, self.bot_model, self.telegram_bot).execute(
            message,
            command_text,
            text_content,
        )
        await self.create_command_event(message, command_text, text_content)

        action_type = getattr(command, "action_type", "MESSAGE") or "MESSAGE"
        if action_type == "CLAIM_ADMIN":
            await SendClaimToAdmin(self.db, self.bot_model, self.telegram_bot).execute(
                message,
                command,
                text_content,
            )
        else:
            await SendCommandResponse(self.db, self.bot_model, self.telegram_bot).execute(
                message,
                command,
            )

        if message.chat.type == "private":
            await SaveSystemMessage(self.db, self.bot_model).execute(
                chat_id=message.chat.id,
                text=f'Сработала команда "{command_text}"',
            )

    async def get_command(
        self,
        message: Message,
        command_text: str,
        chat_type: str | None,
    ):
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        return await FindCommandByText(self.db).execute(
            self.bot_model.id,
            command_text,
            chat_type=chat_type,
            channel_id=channel.id if channel else None,
        )

    async def create_command_event(
        self,
        message: Message,
        command_text: str,
        text_content: str,
    ) -> None:
        try:
            await CreateCommandEvent(self.db, self.bot_model).execute(
                message,
                command_text,
                text_content,
                handled=True,
            )
        except Exception as exc:
            logger.error(
                "Failed to create inbox event for custom command %s: %s",
                command_text,
                exc,
                exc_info=True,
            )
