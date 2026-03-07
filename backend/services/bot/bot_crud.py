from datetime import datetime, timezone
from typing import Optional, List, Tuple

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import PUBLIC_DOMAIN, TELEGRAM_WEBHOOK_SECRET, get_bot
from backend.models.bots import Bot as BotModel, BotStatus
from backend.schemas.bots import BotCreate, BotUpdate

WEBHOOK_ALLOWED_UPDATES = [
    "message", "edited_message", "callback_query",
    "chat_member", "my_chat_member", "chat_join_request",
]


class BotCrudService:
    """CRUD-операции для ботов."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def get_master_bot(self) -> Bot:
        """Получить мастер-бота из env."""
        return get_bot()

    async def create(self, data: BotCreate, owner_id: int) -> BotModel:
        """Создать бота по токену."""
        bot_info, description, short_description = await self.fetch_bot_info(data.token)

        existing = await self.get_by_telegram_id(bot_info.id, owner_id=owner_id)
        if existing:
            raise ValueError("You have already registered this bot")

        global_existing = await self.get_by_telegram_id(bot_info.id)
        if global_existing:
            return global_existing

        bot = BotModel(
            owner_id=owner_id,
            telegram_id=bot_info.id,
            username=bot_info.username,
            first_name=bot_info.first_name,
            token=data.token,
            description=description or data.description,
            short_description=short_description,
            status=BotStatus.ACTIVE,
            last_sync_at=datetime.now(timezone.utc),
        )
        self.db.add(bot)
        await self.db.commit()
        await self.db.refresh(bot)
        return bot

    async def get(self, bot_id: int, owner_id: Optional[int] = None) -> Optional[BotModel]:
        """Получить бота по ID."""
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

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
            return None

        update_data = data.model_dump(exclude_unset=True)
        new_name = update_data.pop("name", None)

        telegram_bot: Optional[Bot] = None
        try:
            needs_api = new_name is not None or any(
                f in update_data for f in ("description", "short_description")
            )
            if needs_api:
                telegram_bot = Bot(token=bot.token)
                await self.sync_telegram_fields(telegram_bot, bot, new_name, update_data)

            for field, value in update_data.items():
                setattr(bot, field, value)

            bot.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(bot)
            return bot
        except TelegramAPIError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to update bot in Telegram: {e}")
        finally:
            if telegram_bot:
                await telegram_bot.session.close()

    async def delete(self, bot_id: int, owner_id: int) -> bool:
        """Удалить бота."""
        bot = await self.get(bot_id, owner_id=owner_id)
        if not bot:
            return False
        await self.db.delete(bot)
        await self.db.commit()
        return True

    async def sync_from_telegram(self, token: str, owner_id: int) -> BotModel:
        """Синхронизировать информацию о боте через Telegram API."""
        bot_info, description, short_description = await self.fetch_bot_info(token)

        bot = await self.get_by_telegram_id(bot_info.id, owner_id=owner_id)
        if bot:
            bot.username = bot_info.username or ""
            bot.first_name = bot_info.first_name
            bot.token = token
            if description is not None:
                bot.description = description or ""
            if short_description is not None:
                bot.short_description = short_description
            bot.last_sync_at = datetime.now(timezone.utc)
            bot.updated_at = datetime.now(timezone.utc)
        else:
            if owner_id is None:
                raise ValueError("Owner id is required to register a new bot")
            bot = BotModel(
                owner_id=owner_id,
                telegram_id=bot_info.id,
                username=bot_info.username,
                first_name=bot_info.first_name,
                token=token,
                description=description,
                short_description=short_description,
                status=BotStatus.ACTIVE,
                last_sync_at=datetime.now(timezone.utc),
            )
            self.db.add(bot)

        await self.db.commit()
        await self.db.refresh(bot)
        return bot

    async def fetch_bot_info(self, token: str) -> tuple:
        """Получить информацию о боте из Telegram API и установить вебхук."""
        temp_bot = Bot(token=token)
        try:
            bot_info = await temp_bot.get_me()
            await self.setup_webhook(temp_bot, token)

            description = await self.safe_get_description(temp_bot)
            short_description = await self.safe_get_short_description(temp_bot)
            return bot_info, description, short_description
        except TelegramAPIError as e:
            raise ValueError(f"Invalid bot token: {e}")
        finally:
            await temp_bot.session.close()

    async def setup_webhook(self, bot: Bot, token: str) -> None:
        """Установить вебхук для бота."""
        webhook_url = f"{PUBLIC_DOMAIN.rstrip('/')}/api/telegram/webhook/{token}"
        await bot.set_webhook(
            url=webhook_url,
            secret_token=TELEGRAM_WEBHOOK_SECRET or None,
            allowed_updates=WEBHOOK_ALLOWED_UPDATES,
        )

    async def safe_get_description(self, bot: Bot) -> Optional[str]:
        """Получить описание бота (None при ошибке)."""
        try:
            info = await bot.get_my_description()
            return info.description if info and info.description else None
        except TelegramAPIError:
            return None

    async def safe_get_short_description(self, bot: Bot) -> Optional[str]:
        """Получить краткое описание бота (None при ошибке)."""
        try:
            info = await bot.get_my_short_description()
            return info.short_description if info and info.short_description else None
        except TelegramAPIError:
            return None

    async def sync_telegram_fields(
        self, telegram_bot: Bot, bot: BotModel,
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
