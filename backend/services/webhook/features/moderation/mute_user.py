from datetime import datetime, timedelta, timezone

from aiogram.types import ChatPermissions

MUTE_PERMISSIONS = ChatPermissions(
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
)


class MuteUser:
    """Замьютить пользователя в чате на mute_duration минут (или бессрочно)."""

    async def execute(self, bot, chat_id: int, user_id: int, mute_duration: int | None) -> None:
        until_date = None
        if mute_duration:
            until_date = datetime.now(timezone.utc) + timedelta(minutes=mute_duration)
        await bot.restrict_chat_member(
            chat_id=chat_id,
            user_id=user_id,
            permissions=MUTE_PERMISSIONS,
            until_date=until_date,
        )
