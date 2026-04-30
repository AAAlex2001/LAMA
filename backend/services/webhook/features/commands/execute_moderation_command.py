import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.bot.features.moderation.execute_command import (
    execute_moderation_command,
)
from backend.services.bot.features.moderation.target_extractor import extract_target
from backend.services.bot.features.moderation.time_parser import parse_time
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent
from backend.services.webhook.features.commands.create_command_event import (
    CreateCommandEvent,
)

logger = logging.getLogger(__name__)


class ExecuteModerationCommand:
    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot

    async def execute(
        self,
        message: Message,
        command_text: str,
        text_content: str,
    ) -> None:
        if not await self.is_enabled(message, command_text):
            return

        handled = await execute_moderation_command(
            command=command_text,
            message=message,
            telegram_bot=self.telegram_bot,
        )
        try:
            if command_text.lower() in ("/ban", "/mute", "/unban", "/unmute"):
                await self.create_ban_event(message, command_text)
            else:
                await CreateCommandEvent(self.db, self.bot_model).execute(
                    message,
                    command_text,
                    text_content,
                    handled,
                )
        except Exception as exc:
            logger.error(
                "Failed to create inbox event for command %s: %s",
                command_text,
                exc,
                exc_info=True,
            )

    async def is_enabled(self, message: Message, command_text: str) -> bool:
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        if not channel:
            return True
        if not channel.commands_enabled:
            return False

        command_name = command_text.lstrip("/").lower()
        return channel.enabled_commands is None or command_name in channel.enabled_commands

    async def create_ban_event(self, message: Message, command_text: str) -> None:
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        target_user_id, target_name = extract_target(message)
        command = command_text.lower()
        parts = message.text.split() if message.text else []
        duration_minutes = parse_time(parts[-1] if len(parts) > 1 else "0")
        is_unbanned = command in ("/unban", "/unmute")
        ban_type = "mute" if command in ("/mute", "/unmute") else "ban"

        await CreateInboxEvent(self.db).execute(
            InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.SYSTEM,
                entity_type=EntityType.CHANNEL,
                event_type=EventType.CHANNEL_BAN,
                bot_id=self.bot_model.id,
                channel_id=channel.id if channel else None,
                tg_user_id=target_user_id,
                tg_username=target_name,
                status=EventStatus.NEW,
                description=self.get_description(
                    command_text,
                    target_name,
                    target_user_id,
                    is_unbanned,
                    ban_type,
                ),
                payload={
                    "ban_type": ban_type,
                    "is_unbanned": is_unbanned,
                    "duration_minutes": duration_minutes,
                    "block_reason": f"Команда {command_text}",
                    "reason": f"Команда {command_text}",
                    "reason_source": "manual_command",
                    "command": command_text,
                    "chat_id": message.chat.id,
                    "message_id": message.message_id,
                    "issuer_user_id": message.from_user.id if message.from_user else None,
                    "issuer_username": message.from_user.username if message.from_user else None,
                },
            )
        )

    @staticmethod
    def get_description(
        command_text: str,
        target_name: str | None,
        target_user_id: int | None,
        is_unbanned: bool,
        ban_type: str,
    ) -> str:
        action = "Разбан" if is_unbanned else "Бан"
        kind = "(mute)" if ban_type == "mute" else ""
        target = target_name or target_user_id
        return f"{action} {kind} {target} командой {command_text}".strip()
