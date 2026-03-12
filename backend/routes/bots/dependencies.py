from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_settings import BotSettingsService
from backend.services.bot.bot_messaging import BotMessagingService
from backend.services.bot.bot_commands import BotCommandService
from backend.services.bot.bot_auto_reply import BotAutoReplyService
from backend.services.bot.bot_triggers import BotTriggerService
from backend.services.bot.bot_recurring import BotRecurringService
from backend.services.bot.bot_welcome import BotWelcomeService


async def get_bot_service(
        db: AsyncSession = Depends(get_db)) -> BotCrudService:
    return BotCrudService(db)


async def get_bot_settings_service(
        db: AsyncSession = Depends(get_db)) -> BotSettingsService:
    return BotSettingsService(db)


async def get_bot_messaging_service(
        db: AsyncSession = Depends(get_db)) -> BotMessagingService:
    return BotMessagingService(db)


async def get_bot_command_service(
        db: AsyncSession = Depends(get_db)) -> BotCommandService:
    return BotCommandService(db)


async def get_auto_reply_service(
        db: AsyncSession = Depends(get_db)) -> BotAutoReplyService:
    return BotAutoReplyService(db)


async def get_trigger_service(
        db: AsyncSession = Depends(get_db)) -> BotTriggerService:
    return BotTriggerService(db)


async def get_recurring_message_service(
        db: AsyncSession = Depends(get_db)) -> BotRecurringService:
    return BotRecurringService(db)


async def get_welcome_service(
        db: AsyncSession = Depends(get_db)) -> BotWelcomeService:
    return BotWelcomeService(db)
