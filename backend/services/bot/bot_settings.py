from fastapi import HTTPException
import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.exceptions import TelegramAPIError

from backend.models.bots import Bot as BotModel, ApprovalMode
from backend.schemas.bots import WelcomeSettingsUpdate, AutoApprovalUpdate
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot_provider import resolve_for_bot_model


class BotSettingsService:
    """Настройки приветствия и автоодобрения."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = BotCrudService(db)

    async def update_welcome_settings(
        self,
        bot_id: int,
        data: WelcomeSettingsUpdate,
        owner_id: Optional[int] = None,
    ) -> Optional[BotModel]:
        """Обновить настройки приветствия."""
        bot = await self.crud.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        fields = data.model_dump(exclude_unset=True)
        for field, value in fields.items():
            if hasattr(bot, field):
                setattr(bot, field, value)

        bot.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(bot)
        return bot

    async def update_auto_approval(
        self,
        bot_id: int,
        data: AutoApprovalUpdate,
        owner_id: Optional[int] = None,
    ) -> Optional[BotModel]:
        """Обновить настройки автоодобрения."""
        bot = await self.crud.get(bot_id, owner_id=owner_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        bot.auto_approval_mode = data.auto_approval_mode
        bot.approval_criteria = data.approval_criteria
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(bot)
        return bot

    async def check_approval_criteria(
        self,
        bot: BotModel,
        user_id: int,
    ) -> tuple[bool, list[int]]:
        """Проверить критерии одобрения для пользователя."""
        if bot.auto_approval_mode == ApprovalMode.AUTO:
            return True, []

        if bot.auto_approval_mode == ApprovalMode.MANUAL:
            return False, []

        if not bot.approval_criteria:
            return False, []

        required_channels = bot.approval_criteria.get("required_channels", [])
        if not required_channels:
            return False, []

        return await self.check_channel_subscriptions(bot, user_id, required_channels)

    async def check_channel_subscriptions(
        self,
        bot: BotModel,
        user_id: int,
        required_channels: list[int],
    ) -> tuple[bool, list[int]]:
        """Проверить подписку пользователя на каналы (параллельно)."""
        telegram_bot = await resolve_for_bot_model(bot)

        async def check_one(channel_id: int) -> Optional[int]:
            try:
                member = await telegram_bot.get_chat_member(channel_id, user_id)
                if member.status not in ("member", "administrator", "creator"):
                    return channel_id
            except TelegramAPIError:
                return channel_id
            return None

        results = await asyncio.gather(
            *(check_one(ch) for ch in required_channels),
            return_exceptions=True,
        )
        missing = [r for r in results if isinstance(r, int)]

        if missing:
            return False, missing
        return True, []
