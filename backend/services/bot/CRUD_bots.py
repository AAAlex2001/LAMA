from datetime import datetime, timezone
from typing import List, Optional, Tuple

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotStatus
from backend.schemas.bots import BotCreate, BotUpdate


class CRUDBotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_bot(self, data: BotCreate, owner_id: int) -> BotModel:
        """Создать бота по токену"""
        # Создаём временный экземпляр Bot для проверки токена
        try:
            temp_bot = Bot(token=data.token)
            bot_info = await temp_bot.get_me()
            bot_description_info = None
            bot_short_description_info = None
            try:
                bot_description_info = await temp_bot.get_my_description()
            except TelegramAPIError:
                bot_description_info = None
            try:
                bot_short_description_info = await temp_bot.get_my_short_description()
            except TelegramAPIError:
                bot_short_description_info = None
        except TelegramAPIError as e:
            raise ValueError(f"Invalid bot token: {str(e)}")
        finally:
            await temp_bot.session.close()

        description_value = bot_description_info.description if bot_description_info and bot_description_info.description else data.description
        short_description_value = (
            bot_short_description_info.short_description
            if bot_short_description_info and bot_short_description_info.short_description
            else None
        )

        # Проверяем, не существует ли уже бот с таким telegram_id
        existing_bot = await self.get_bot_by_telegram_id(bot_info.id)

        if existing_bot:
            if existing_bot.owner_id != owner_id:
                raise ValueError(f"Bot with telegram_id {bot_info.id} already registered by another user")
            raise ValueError(f"Bot with telegram_id {bot_info.id} already exists")

        # Создаём бота в БД
        bot = BotModel(
            owner_id=owner_id,
            telegram_id=bot_info.id,
            username=bot_info.username,
            first_name=bot_info.first_name,
            token=data.token,
            description=description_value,
            short_description=short_description_value,
            status=BotStatus.ACTIVE,
            last_sync_at=datetime.now(timezone.utc)
        )

        self.db.add(bot)
        await self.db.commit()
        await self.db.refresh(bot)

        return bot

    async def get_bot(self, bot_id: int, owner_id: Optional[int] = None) -> Optional[BotModel]:
        """Получить бота по ID"""
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_bot_by_telegram_id(self, telegram_id: int, owner_id: Optional[int] = None) -> Optional[BotModel]:
        """Получить бота по Telegram ID"""
        query = select(BotModel).where(BotModel.telegram_id == telegram_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_bots(
            self,
            owner_id: Optional[int] = None,
            status: Optional[BotStatus] = None,
            skip: int = 0,
            limit: int = 50
    ) -> Tuple[List[BotModel], int]:
        """Получить список ботов с фильтрацией"""
        base_query = select(BotModel)
        if owner_id is not None:
            base_query = base_query.where(BotModel.owner_id == owner_id)

        if status:
            base_query = base_query.where(BotModel.status == status)

        # Подсчёт общего количества
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных с пагинацией
        data_query = base_query.order_by(desc(BotModel.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(data_query)
        bots = list(result.scalars().all())

        return bots, total

    async def update_bot(self, bot_id: int, data: BotUpdate, owner_id: int) -> Optional[BotModel]:
        """Обновить бота"""
        bot = await self.get_bot(bot_id, owner_id=owner_id)
        if not bot:
            return None
        update_data = data.model_dump(exclude_unset=True)
        new_name = update_data.pop("name", None)

        telegram_bot: Optional[Bot] = None
        try:
            if any(
                    field in update_data
                    for field in ("description", "short_description")
            ) or new_name is not None:
                telegram_bot = Bot(token=bot.token)

                if new_name is not None:
                    await telegram_bot.set_my_name(name=new_name)
                    bot.first_name = new_name

                if "description" in update_data:
                    description_value = update_data["description"] or ""
                    await telegram_bot.set_my_description(
                        description=description_value
                    )

                if "short_description" in update_data:
                    short_description_value = update_data["short_description"] or ""
                    await telegram_bot.set_my_short_description(
                        short_description=short_description_value
                    )
                    # Значение также сохранится ниже через setattr

            for field, value in update_data.items():
                setattr(bot, field, value)

            bot.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(bot)
            return bot

        except TelegramAPIError as e:
            await self.db.rollback()
            raise ValueError(f"Failed to update bot in Telegram: {str(e)}")
        finally:
            if telegram_bot:
                await telegram_bot.session.close()

    async def delete_bot(self, bot_id: int, owner_id: int) -> bool:
        """Удалить бота"""
        bot = await self.get_bot(bot_id, owner_id=owner_id)
        if not bot:
            return False

        await self.db.delete(bot)
        await self.db.commit()
        return True

    async def sync_bot_from_telegram(self, token: str, owner_id: int) -> BotModel:
        """Синхронизировать информацию о боте через Telegram API"""
        try:
            temp_bot = Bot(token=token)
            bot_info = await temp_bot.get_me()
            bot_description_info = None
            bot_short_description_info = None
            try:
                bot_description_info = await temp_bot.get_my_description()
            except TelegramAPIError:
                bot_description_info = None
            try:
                bot_short_description_info = await temp_bot.get_my_short_description()
            except TelegramAPIError:
                bot_short_description_info = None
        except TelegramAPIError as e:
            raise ValueError(f"Failed to sync bot: {str(e)}")
        finally:
            await temp_bot.session.close()

        description_value = bot_description_info.description if bot_description_info and bot_description_info.description else None
        short_description_value = (
            bot_short_description_info.short_description
            if bot_short_description_info and bot_short_description_info.short_description
            else None
        )

        # Ищем существующего бота
        bot = await self.get_bot_by_telegram_id(bot_info.id)

        if bot:
            if bot.owner_id != owner_id:
                raise ValueError("Bot already registered by another user")
            # Обновляем существующего
            bot.username = bot_info.username
            bot.first_name = bot_info.first_name
            bot.token = token
            if description_value is not None:
                bot.description = description_value
            if short_description_value is not None:
                bot.short_description = short_description_value
            bot.last_sync_at = datetime.now(timezone.utc)
            bot.updated_at = datetime.now(timezone.utc)
        else:
            if owner_id is None:
                raise ValueError("Owner id is required to register a new bot")
            # Создаём нового
            bot = BotModel(
                owner_id=owner_id,
                telegram_id=bot_info.id,
                username=bot_info.username,
                first_name=bot_info.first_name,
                token=token,
                description=description_value,
                short_description=short_description_value,
                status=BotStatus.ACTIVE,
                last_sync_at=datetime.now(timezone.utc)
            )
            self.db.add(bot)

        await self.db.commit()
        await self.db.refresh(bot)

        return bot