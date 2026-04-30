import asyncio

from aiogram.types import ChatPermissions, Message

from backend.services.webhook.types import TELEGRAM_API_TIMEOUT


class UnmuteUser:
    async def execute(self, bot, message: Message) -> None:
        if not message.from_user:
            return

        await asyncio.wait_for(
            bot.restrict_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
                permissions=self.get_permissions(),
            ),
            timeout=TELEGRAM_API_TIMEOUT,
        )

    @staticmethod
    def get_permissions() -> ChatPermissions:
        return ChatPermissions(
            can_send_messages=True,
            can_send_media_messages=True,
            can_send_polls=True,
            can_send_other_messages=True,
            can_add_web_page_previews=True,
            can_pin_messages=False,
            can_change_info=False,
            can_invite_users=True,
        )
