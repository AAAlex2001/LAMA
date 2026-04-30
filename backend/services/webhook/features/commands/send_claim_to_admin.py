import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery.tasks import send_claim_messages, send_claim_to_admins
from backend.models.bots import Bot as BotModel, MessageType
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel, get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent
from backend.services.webhook.features.messages.save_outgoing_if_direct import (
    SaveOutgoingIfDirect,
)

logger = logging.getLogger(__name__)


class SendClaimToAdmin:
    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot

    async def execute(self, message: Message, command, text_content: str) -> None:
        claim_text = self.get_claim_text(message, command, text_content)
        claim_target = getattr(command, "claim_target", None) or "SPECIFIC_CHANNEL"
        claim_channel_ids = getattr(command, "claim_channel_ids", None) or []

        try:
            if claim_target == "SPECIFIC_CHANNEL":
                await self.enqueue_channel_claims(claim_channel_ids, claim_text)
            elif claim_target == "ADMINS":
                self.enqueue_admin_claim(message, claim_text)
            else:
                await self.create_claim_event(
                    message,
                    command,
                    text_content,
                    claim_target,
                    claim_channel_ids,
                )

            sent_message = await self.telegram_bot.send_message(
                chat_id=message.chat.id,
                text="Жалоба отправлена администраторам.",
            )
            await SaveOutgoingIfDirect(self.db, self.bot_model).execute(
                chat_id=message.chat.id,
                tg_message=sent_message,
                fallback_type=MessageType.TEXT,
                fallback_media_url=None,
            )
        except Exception as exc:
            logger.error("Failed to send claim: %s", exc, exc_info=True)

    async def enqueue_channel_claims(
        self,
        channel_ids: list[int],
        claim_text: str,
    ) -> None:
        target_chat_ids: list[int] = []
        for channel_id in channel_ids:
            channel = await get_channel(self.db, channel_id)
            if channel and channel.telegram_id:
                target_chat_ids.append(int(channel.telegram_id))

        if target_chat_ids:
            send_claim_messages.apply_async(
                args=[self.bot_model.id, target_chat_ids, claim_text],
                queue="default",
            )

    def enqueue_admin_claim(self, message: Message, claim_text: str) -> None:
        reporter = message.from_user
        if not (reporter and reporter.id):
            return
        send_claim_to_admins.apply_async(
            args=[
                self.bot_model.id,
                int(message.chat.id),
                int(reporter.id),
                int(message.message_id),
                claim_text,
            ],
            queue="default",
        )

    async def create_claim_event(
        self,
        message: Message,
        command,
        text_content: str,
        claim_target: str,
        claim_channel_ids: list[int],
    ) -> None:
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        await CreateInboxEvent(self.db).execute(
            InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.AUTOMATION,
                entity_type=EntityType.BOT,
                event_type=EventType.BOT_COMMAND,
                bot_id=self.bot_model.id,
                channel_id=channel.id if channel else None,
                tg_user_id=message.from_user.id if message.from_user else None,
                tg_username=message.from_user.username if message.from_user else None,
                status=EventStatus.NEW,
                description=f"Жалоба по команде {command.command}",
                payload={
                    "chat_id": message.chat.id,
                    "message_id": message.message_id,
                    "claim_target": claim_target,
                    "claim_channel_ids": claim_channel_ids,
                    "command": command.command,
                    "full_text": text_content,
                },
            )
        )

    @staticmethod
    def get_claim_text(message: Message, command, text_content: str) -> str:
        reporter = message.from_user
        reporter_username = (
            reporter.username
            if reporter and reporter.username
            else str(reporter.id if reporter else "unknown")
        )
        chat_title = (
            message.chat.title
            if message.chat and getattr(message.chat, "title", None)
            else str(message.chat.id if message.chat else "")
        )
        return (
            f"Жалоба по команде {command.command}\n"
            f"От: @{reporter_username}\n"
            f"Чат: {chat_title}\n"
            f"Сообщение: {text_content[:3500]}"
        )
