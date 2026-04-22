from fastapi import HTTPException
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from aiogram import Bot
from aiogram.types import BufferedInputFile, InputProfilePhotoStatic
from backend.services.telegram_client import RateLimitedBot
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from aiogram.utils.token import TokenValidationError
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import PUBLIC_DOMAIN, WEBHOOK_DOMAIN, TELEGRAM_WEBHOOK_SECRET
from backend.models.bots import Bot as BotModel, BotStatus
from backend.schemas.bots import BotCreate, BotUpdate
from backend.services.bot_provider import resolve_by_token, evict_bot

logger = logging.getLogger(__name__)

WEBHOOK_ALLOWED_UPDATES = [
    "message",
    "edited_message",
    "channel_post",
    "edited_channel_post",
    "inline_query",
    "chosen_inline_result",
    "callback_query",
    "shipping_query",
    "pre_checkout_query",
    "poll",
    "poll_answer",
    "my_chat_member",
    "chat_member",
    "chat_join_request"
]


class BotCrudService:
    """CRUD-операции для ботов."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: BotCreate, owner_id: int) -> BotModel:
        """Создать бота по токену."""
        bot_info, description, short_description = await self.fetch_bot_info(data.token)

        existing = await self.get_by_telegram_id(bot_info.id, owner_id=owner_id)
        if existing:
            raise HTTPException(status_code=400, detail="You have already registered this bot")

        global_existing = await self.get_by_telegram_id(bot_info.id)
        if global_existing:
            raise HTTPException(status_code=409, detail="This bot is already registered by another user")

        bot = BotModel(
            owner_id=owner_id,
            telegram_id=bot_info.id,
            username=bot_info.username,
            first_name=bot_info.first_name,
            token=data.token,
            description=description or data.description,
            short_description=short_description,
            welcome_type="group_message",
            status=BotStatus.ACTIVE,
            last_sync_at=datetime.now(timezone.utc),
        )
        self.db.add(bot)
        await self.db.flush()
        await self.db.refresh(bot)

        raw_bot = resolve_by_token(data.token).bot
        await self.setup_webhook(raw_bot, data.token)
        bot.is_webhook_enabled = True
        bot.webhook_url = f"{WEBHOOK_DOMAIN.rstrip('/')}/api/telegram/webhook/{data.token}"
        await self.db.flush()
        await self.db.refresh(bot)

        return bot

    async def get(self, bot_id: int, owner_id: Optional[int] = None) -> BotModel:
        """Получить бота по ID."""
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        bot = result.scalar_one_or_none()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        return bot

    async def get_by_telegram_id(
        self, telegram_id: int, owner_id: Optional[int] = None,
    ) -> Optional[BotModel]:
        """Получить бота по Telegram ID."""
        query = select(BotModel).where(BotModel.telegram_id == telegram_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_list(
        self,
        owner_id: Optional[int] = None,
        status: Optional[BotStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[BotModel], int]:
        """Получить список ботов с фильтрацией."""
        query = select(BotModel)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        if status:
            query = query.where(BotModel.status == status)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        result = await self.db.execute(
            query.order_by(desc(BotModel.created_at)).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def update(self, bot_id: int, data: BotUpdate, owner_id: int) -> Optional[BotModel]:
        """Обновить бота."""
        bot = await self.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        update_data = data.model_dump(exclude_unset=True)
        new_name = update_data.pop("name", None)

        try:
            needs_api = new_name is not None or any(
                f in update_data for f in ("description", "short_description")
            )
            if needs_api:
                telegram_bot = resolve_by_token(bot.token).bot
                await self.sync_telegram_fields(telegram_bot, bot, new_name, update_data)

            for field, value in update_data.items():
                setattr(bot, field, value)

            bot.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(bot)
            return bot
        except TelegramAPIError as e:
            raise HTTPException(status_code=400, detail=f"Failed to update bot in Telegram: {e}")

    async def delete(self, bot_id: int, owner_id: int) -> bool:
        """Удалить бота: снять вебхук, очистить кеш, удалить из БД."""
        bot = await self.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        await self.remove_webhook(bot.token)
        await self.evict_from_cache(bot.token)
        await self.db.delete(bot)
        await self.db.flush()
        return True

    async def deactivate(self, bot_id: int, owner_id: int) -> Optional[BotModel]:
        """Деактивировать бота: снять вебхук, поставить INACTIVE."""
        bot = await self.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        await self.remove_webhook(bot.token)
        await self.evict_from_cache(bot.token)
        bot.status = BotStatus.INACTIVE
        bot.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(bot)
        return bot

    async def activate(self, bot_id: int, owner_id: int) -> Optional[BotModel]:
        """Активировать бота: поставить вебхук, поставить ACTIVE."""
        bot = await self.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        raw_bot = resolve_by_token(bot.token).bot
        await self.setup_webhook(raw_bot, bot.token)
        bot.status = BotStatus.ACTIVE
        bot.is_webhook_enabled = True
        bot.webhook_url = f"{WEBHOOK_DOMAIN.rstrip('/')}/api/telegram/webhook/{bot.token}"
        bot.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(bot)
        return bot

    async def sync_from_telegram(self, token: str, owner_id: int, description: str = None) -> BotModel:
        """Синхронизировать информацию о боте через Telegram API."""
        bot_info, tg_description, short_description = await self.fetch_bot_info(token)
        final_description = description if description else tg_description

        bot = await self.get_by_telegram_id(bot_info.id, owner_id=owner_id)
        if bot:
            bot.username = bot_info.username or ""
            bot.first_name = bot_info.first_name
            bot.token = token
            if final_description is not None:
                bot.description = final_description or ""
            if short_description is not None:
                bot.short_description = short_description
            if not bot.welcome_type:
                bot.welcome_type = "group_message"
            bot.last_sync_at = datetime.now(timezone.utc)
            bot.updated_at = datetime.now(timezone.utc)
        else:
            global_existing = await self.get_by_telegram_id(bot_info.id)
            if global_existing:
                raise HTTPException(status_code=409, detail="This bot is already registered by another user")

            if owner_id is None:
                raise HTTPException(status_code=400, detail="Owner id is required to register a new bot")
            bot = BotModel(
                owner_id=owner_id,
                telegram_id=bot_info.id,
                username=bot_info.username,
                first_name=bot_info.first_name,
                token=token,
                description=final_description,
                short_description=short_description,
                welcome_type="group_message",
                status=BotStatus.ACTIVE,
                last_sync_at=datetime.now(timezone.utc),
            )
            self.db.add(bot)

        await self.db.flush()
        await self.db.refresh(bot)

        raw_bot = resolve_by_token(token).bot
        await self.setup_webhook(raw_bot, token)
        bot.is_webhook_enabled = True
        bot.webhook_url = f"{WEBHOOK_DOMAIN.rstrip('/')}/api/telegram/webhook/{token}"
        await self.db.flush()
        await self.db.refresh(bot)

        return bot

    async def fetch_bot_info(self, token: str) -> tuple:
        """Получить информацию о боте из Telegram API."""
        try:
            raw_bot = resolve_by_token(token).bot
        except TokenValidationError:
            raise HTTPException(status_code=400, detail="Неверный формат токена бота")
        try:
            bot_info = await raw_bot.get_me()
            desc_task = self.safe_get_description(raw_bot)
            short_desc_task = self.safe_get_short_description(raw_bot)
            description, short_description = await asyncio.gather(
                desc_task, short_desc_task,
            )
            return bot_info, description, short_description
        except TelegramAPIError as e:
            raise HTTPException(status_code=400, detail=f"Invalid bot token: {e}")

    async def setup_webhook(self, bot: RateLimitedBot, token: str) -> None:
        """Установить вебхук для бота. При DNS-сбое Telegram ретраим раз."""
        webhook_url = f"{WEBHOOK_DOMAIN.rstrip('/')}/api/telegram/webhook/{token}"

        try:
            current_webhook = await bot.get_webhook_info()
            if current_webhook and current_webhook.url == webhook_url:
                return
        except TelegramAPIError as e:
            logger.warning("get_webhook_info failed, proceed to set: %s", e)

        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                await bot.set_webhook(
                    url=webhook_url,
                    secret_token=TELEGRAM_WEBHOOK_SECRET or None,
                    allowed_updates=WEBHOOK_ALLOWED_UPDATES,
                )
                return
            except TelegramBadRequest as e:
                last_error = e
                msg = str(e).lower()
                if "failed to resolve host" in msg or "temporary failure" in msg:
                    logger.warning(
                        "setWebhook DNS issue (attempt %s), retrying: %s",
                        attempt + 1, e,
                    )
                    await asyncio.sleep(2)
                    continue
                raise HTTPException(
                    status_code=400,
                    detail=f"Telegram отклонил вебхук: {e}",
                )

        raise HTTPException(
            status_code=502,
            detail=(
                "Telegram сейчас не может зарезолвить домен вебхука "
                f"({WEBHOOK_DOMAIN}). Попробуйте ещё раз через минуту. "
                f"Последняя ошибка: {last_error}"
            ),
        )

    async def safe_get_description(self, bot: RateLimitedBot) -> Optional[str]:
        """Получить описание бота (None при ошибке)."""
        try:
            info = await bot.get_my_description()
            return info.description if info and info.description else None
        except TelegramAPIError:
            return None

    async def safe_get_short_description(self, bot: RateLimitedBot) -> Optional[str]:
        """Получить краткое описание бота (None при ошибке)."""
        try:
            info = await bot.get_my_short_description()
            return info.short_description if info and info.short_description else None
        except TelegramAPIError:
            return None

    async def remove_webhook(self, token: str) -> None:
        """Снять вебхук с бота."""
        try:
            raw_bot = resolve_by_token(token).bot
            await raw_bot.delete_webhook(drop_pending_updates=True)
        except TelegramAPIError as e:
            logger.warning(f"Failed to remove webhook: {e}")

    async def evict_from_cache(self, token: str) -> None:
        """Удалить бота из кешей и закрыть его aiohttp-сессию."""
        await evict_bot(token)

    async def upload_photo(self, bot_id: int, owner_id: int, data: bytes, filename: str) -> BotModel:
        """Загрузить фото профиля бота через Telegram API."""
        bot = await self.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        telegram_bot = resolve_by_token(bot.token).bot
        try:
            photo = BufferedInputFile(data, filename=filename)
            await telegram_bot.set_my_profile_photo(photo=InputProfilePhotoStatic(photo=photo))

            me = await telegram_bot.get_me()
            photos = await telegram_bot.get_user_profile_photos(user_id=me.id, limit=1)
            if photos.photos:
                best = max(photos.photos[0], key=lambda p: p.width)
                file = await telegram_bot.get_file(best.file_id)
                if file.file_path:
                    bot.photo_url = f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"

            bot.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(bot)
            return bot
        except TelegramAPIError as e:
            raise HTTPException(status_code=400, detail=f"Failed to upload bot photo: {e}")

    async def delete_photo(self, bot_id: int, owner_id: int) -> BotModel:
        """Удалить фото профиля бота через Telegram API."""
        bot = await self.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        telegram_bot = resolve_by_token(bot.token).bot
        try:
            await telegram_bot.delete_my_profile_photo()
            bot.photo_url = None
            bot.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(bot)
            return bot
        except TelegramAPIError as e:
            raise HTTPException(status_code=400, detail=f"Failed to delete bot photo: {e}")

    async def sync_telegram_fields(
        self, telegram_bot: RateLimitedBot, bot: BotModel,
        new_name: Optional[str], update_data: dict,
    ) -> None:
        """Синхронизировать поля бота с Telegram API."""
        if new_name is not None:
            await telegram_bot.set_my_name(name=new_name)
            bot.first_name = new_name
        if "description" in update_data:
            await telegram_bot.set_my_description(description=update_data["description"] or "")
        if "short_description" in update_data:
            await telegram_bot.set_my_short_description(
                short_description=update_data["short_description"] or "",
            )
