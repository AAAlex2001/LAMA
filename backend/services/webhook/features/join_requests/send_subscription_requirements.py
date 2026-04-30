import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

logger = logging.getLogger(__name__)


class SendSubscriptionRequirements:
    async def execute(
        self,
        telegram_bot,
        user_id: int,
        missing_channels: list[int],
    ) -> None:
        try:
            message_text = "Для вступления подпишитесь на каналы:\n\n"
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
                    logger.warning("Failed to get channel info", exc_info=True)
                    message_text += f"{index}. Канал ID: {channel_id}\n"

            await telegram_bot.send_message(
                chat_id=user_id,
                text=message_text,
                reply_markup=(
                    InlineKeyboardMarkup(inline_keyboard=buttons)
                    if buttons
                    else None
                ),
            )
        except TelegramAPIError as exc:
            logger.warning("Subscription requirements send failed: %s", exc)
