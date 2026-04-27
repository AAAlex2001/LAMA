from backend.models.channels import ChannelGroup
from backend.services.telegram_client import RateLimitedBot


async def refresh_channel_photo(bot: RateLimitedBot, channel: ChannelGroup) -> None:
    """Подтягивает поля фото канала из ``get_chat`` после обновления через Telegram API."""
    chat = await bot.get_chat(channel.telegram_id)
    if not chat.photo:
        return

    try:
        photo_file = await bot.get_file(chat.photo.big_file_id)
        channel.photo_url = f"https://api.telegram.org/file/bot{bot.bot.token}/{photo_file.file_path}"
        channel.photo_small_file_id = chat.photo.small_file_id
        channel.photo_small_file_unique_id = chat.photo.small_file_unique_id
        channel.photo_big_file_id = chat.photo.big_file_id
        channel.photo_big_file_unique_id = chat.photo.big_file_unique_id
    except Exception:
        pass
