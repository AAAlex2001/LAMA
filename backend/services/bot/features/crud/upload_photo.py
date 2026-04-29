"""Загрузка фото профиля бота через Telegram API + сохранение URL в БД."""

from datetime import datetime, timezone

from aiogram.exceptions import TelegramAPIError
from aiogram.types import BufferedInputFile, InputProfilePhotoStatic
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot_provider import resolve_by_token
from backend.services.telegram_client import RateLimitedBot


class UploadBotPhoto:
    """set_my_profile_photo + получение URL загруженного файла."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, owner_id: int, data: bytes, filename: str,
    ) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        telegram_bot = resolve_by_token(bot.token).bot
        try:
            await upload_to_telegram(telegram_bot, data, filename)
            bot.photo_url = await fetch_photo_url(telegram_bot, bot.token)
            bot.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(bot)
            return bot
        except TelegramAPIError as exc:
            raise HTTPException(status_code=400, detail=f"Failed to upload bot photo: {exc}")


async def upload_to_telegram(bot: RateLimitedBot, data: bytes, filename: str) -> None:
    """set_my_profile_photo с переданными bytes."""
    photo = BufferedInputFile(data, filename=filename)
    await bot.set_my_profile_photo(photo=InputProfilePhotoStatic(photo=photo))


async def fetch_photo_url(bot: RateLimitedBot, token: str) -> str | None:
    """Достаёт URL самого большого размера фото профиля; None если фото нет."""
    me = await bot.get_me()
    photos = await bot.get_user_profile_photos(user_id=me.id, limit=1)
    if not photos.photos:
        return None
    best = max(photos.photos[0], key=lambda p: p.width)
    file = await bot.get_file(best.file_id)
    if not file.file_path:
        return None
    return f"https://api.telegram.org/file/bot{token}/{file.file_path}"
