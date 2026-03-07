import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.exceptions import TelegramAPIError

from backend.models.bots import Bot as BotModel, ApprovalMode
from backend.schemas.bots import WelcomeSettingsUpdate, AutoApprovalUpdate
from backend.services.bot.bot_crud import BotCrudService
from backend.config import get_bot


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
            return None

        bot.welcome_enabled = data.welcome_enabled
        bot.welcome_message = data.welcome_message
        bot.welcome_media_url = data.welcome_media_url
        bot.welcome_media_type = data.welcome_media_type
        bot.welcome_buttons = data.welcome_buttons
        bot.welcome_message_thread_id = data.welcome_message_thread_id

        if data.join_captcha_enabled is not None:
            bot.join_captcha_enabled = data.join_captcha_enabled
        if data.captcha_mode is not None:
            bot.captcha_mode = data.captcha_mode
        if data.captcha_timeout_seconds is not None:
            bot.captcha_timeout_seconds = data.captcha_timeout_seconds

        bot.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
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
            return None

        bot.auto_approval_mode = data.auto_approval_mode
        bot.approval_criteria = data.approval_criteria
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
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

        return await self.check_channel_subscriptions(user_id, required_channels)

    async def check_channel_subscriptions(
        self,
        user_id: int,
        required_channels: list[int],
    ) -> tuple[bool, list[int]]:
        """Проверить подписку пользователя на каналы (параллельно)."""
        telegram_bot = get_bot()

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
