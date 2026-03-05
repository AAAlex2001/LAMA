from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db

from backend.services.bot.bot_service import BotService
from backend.services.bot.commands import BotCommandService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.triggers.service import TriggerService
from backend.services.bot.recurring_messages import RecurringMessageService
from backend.services.bot.welcome import WelcomeService

async def get_bot_service(db: AsyncSession = Depends(get_db)) -> BotService:
    return BotService(db)

async def get_bot_command_service(db: AsyncSession = Depends(get_db)) -> BotCommandService:
    return BotCommandService(db)

async def get_auto_reply_service(db: AsyncSession = Depends(get_db)) -> AutoReplyService:
    return AutoReplyService(db)

async def get_trigger_service(db: AsyncSession = Depends(get_db)) -> TriggerService:
    return TriggerService(db)

async def get_recurring_message_service(db: AsyncSession = Depends(get_db)) -> RecurringMessageService:
    return RecurringMessageService(db)

async def get_welcome_service(db: AsyncSession = Depends(get_db)) -> WelcomeService:
    return WelcomeService(db)
