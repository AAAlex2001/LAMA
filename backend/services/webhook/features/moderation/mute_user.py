import asyncio
from datetime import datetime, timedelta, timezone

from aiogram.types import ChatPermissions, Message

from backend.services.webhook.types import TELEGRAM_API_TIMEOUT


class MuteUser:
    async def execute(self, bot, message: Message, mute_duration: int | None) -> None:
        if not message.from_user:
            return

        until_date = None
        if mute_duration:
            until_date = datetime.now(timezone.utc) + timedelta(minutes=mute_duration)

        await asyncio.wait_for(
            bot.restrict_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
                permissions=self.get_permissions(),
                until_date=until_date,
            ),
            timeout=TELEGRAM_API_TIMEOUT,
        )

    @staticmethod
    def get_permissions() -> ChatPermissions:
        return ChatPermissions(
            can_send_messages=False,
            can_send_media_messages=False,
            can_send_polls=False,
            can_send_other_messages=False,
            can_add_web_page_previews=False,
            can_pin_messages=False,
            can_change_info=False,
            can_invite_users=False,
        )
