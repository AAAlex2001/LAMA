import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions

logger = logging.getLogger(__name__)


class UnlockCaptchaUser:
    async def execute(self, bot, chat_id: int, user_id: int) -> None:
        try:
            await bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=ChatPermissions(
                    can_send_messages=True,
                    can_send_audios=True,
                    can_send_documents=True,
                    can_send_photos=True,
                    can_send_videos=True,
                    can_send_video_notes=True,
                    can_send_voice_notes=True,
                    can_send_polls=True,
                    can_send_other_messages=True,
                    can_add_web_page_previews=True,
                    can_invite_users=True,
                ),
                use_independent_chat_permissions=True,
            )
        except TelegramAPIError as exc:
            logger.warning("Failed to unrestrict user %s in chat %s: %s", user_id, chat_id, exc)
