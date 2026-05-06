from aiogram.types import ChatMemberUpdated

from backend.services.channel.features.flood import clear_banned

UNBANNED_STATUSES = ("member", "administrator", "creator")
RESTRICTED_STATUSES = ("kicked", "restricted", "left")


class ClearBanLockOnUnban:
    """Очистить ban-lock когда юзер разбанен/разрестрикчен в Telegram."""

    async def execute(self, chat_member: ChatMemberUpdated) -> None:
        old_status = chat_member.old_chat_member.status
        new_status = chat_member.new_chat_member.status
        if old_status in RESTRICTED_STATUSES and new_status in UNBANNED_STATUSES:
            user = chat_member.new_chat_member.user
            await clear_banned(chat_member.chat.id, user.id)
