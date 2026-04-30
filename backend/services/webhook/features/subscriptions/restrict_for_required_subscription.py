import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatMemberUpdated, ChatPermissions, InlineKeyboardButton, InlineKeyboardMarkup, User
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, PendingJoinApproval

logger = logging.getLogger(__name__)


class RestrictForRequiredSubscription:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        telegram_bot,
        chat_member: ChatMemberUpdated,
        member: User,
        missing_channels: list[int],
    ) -> None:
        try:
            await self.restrict_user(telegram_bot, chat_member.chat.id, member.id)
            self.db.add(
                PendingJoinApproval(
                    bot_id=self.bot_model.id,
                    user_id=member.id,
                    chat_id=chat_member.chat.id,
                    missing_channels=missing_channels,
                )
            )
            await self.db.flush()
            await self.send_requirements(telegram_bot, member, missing_channels)
        except Exception as exc:
            logger.error("restrict for subscription failed: %s", exc, exc_info=True)

    async def restrict_user(self, telegram_bot, chat_id: int, user_id: int) -> None:
        try:
            await telegram_bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=ChatPermissions(
                    can_send_messages=False,
                    can_send_audios=False,
                    can_send_documents=False,
                    can_send_photos=False,
                    can_send_videos=False,
                    can_send_video_notes=False,
                    can_send_voice_notes=False,
                    can_send_polls=False,
                    can_send_other_messages=False,
                    can_add_web_page_previews=False,
                ),
                use_independent_chat_permissions=True,
            )
        except TelegramAPIError as exc:
            logger.error("Failed to restrict user %s for subscription: %s", user_id, exc)

    async def send_requirements(
        self,
        telegram_bot,
        member: User,
        missing_channels: list[int],
    ) -> None:
        first_name = member.first_name or "Пользователь"
        message_text = (
            f"{first_name}, для участия подпишитесь на каналы:\n\n"
        )
        buttons = []

        for index, channel_id in enumerate(missing_channels, 1):
            try:
                chat = await telegram_bot.get_chat(channel_id)
                title = chat.title or f"Канал {index}"
                if chat.username:
                    message_text += f"{index}. {title}\n"
                    buttons.append(
                        [
                            InlineKeyboardButton(
                                text=title,
                                url=f"https://t.me/{chat.username}",
                            )
                        ]
                    )
                else:
                    message_text += f"{index}. {title} (приватный)\n"
            except TelegramAPIError:
                logger.warning("Failed to get channel info for %s", channel_id)
                message_text += f"{index}. Канал ID: {channel_id}\n"

        message_text += "\nПосле подписки ограничения будут сняты автоматически."
        await telegram_bot.send_message(
            chat_id=member.id,
            text=message_text,
            reply_markup=(
                InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None
            ),
        )
