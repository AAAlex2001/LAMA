"""FastAPI dependencies for concrete bot feature use-cases."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.bot.features.auto_replies.create_auto_reply import CreateAutoReply
from backend.services.bot.features.auto_replies.delete_auto_reply import DeleteAutoReply
from backend.services.bot.features.auto_replies.list_auto_replies import ListAutoReplies
from backend.services.bot.features.auto_replies.update_auto_reply import UpdateAutoReply
from backend.services.bot.features.commands.create_command import CreateCommand
from backend.services.bot.features.commands.delete_command import DeleteCommand
from backend.services.bot.features.commands.list_commands import ListCommands
from backend.services.bot.features.commands.update_command import UpdateCommand
from backend.services.bot.features.crud.activate_bot import ActivateBot
from backend.services.bot.features.crud.create_bot import CreateBot
from backend.services.bot.features.crud.deactivate_bot import DeactivateBot
from backend.services.bot.features.crud.delete_bot import DeleteBot
from backend.services.bot.features.crud.delete_photo import DeleteBotPhoto
from backend.services.bot.features.crud.list_bots import ListBots
from backend.services.bot.features.crud.sync_from_telegram import SyncBotFromTelegram
from backend.services.bot.features.crud.update_bot import UpdateBot
from backend.services.bot.features.crud.upload_photo import UploadBotPhoto
from backend.services.bot.features.messaging.broadcast import BroadcastToChats
from backend.services.bot.features.messaging.get_stats import GetBotStats
from backend.services.bot.features.messaging.list_messages import ListBotMessages
from backend.services.bot.features.messaging.send_message import SendBotMessage
from backend.services.bot.features.recurring.create_recurring import CreateRecurring
from backend.services.bot.features.recurring.delete_recurring import DeleteRecurring
from backend.services.bot.features.recurring.list_recurring import ListRecurring
from backend.services.bot.features.recurring.update_recurring import UpdateRecurring
from backend.services.bot.features.settings.update_auto_approval import UpdateAutoApproval
from backend.services.bot.features.settings.update_welcome_settings import UpdateWelcomeSettings
from backend.services.bot.features.triggers.crud.create_trigger import CreateTrigger
from backend.services.bot.features.triggers.crud.delete_trigger import DeleteTrigger
from backend.services.bot.features.triggers.crud.list_triggers import ListTriggers
from backend.services.bot.features.triggers.crud.update_trigger import UpdateTrigger


async def get_create_bot(db: AsyncSession = Depends(get_db)) -> CreateBot:
    return CreateBot(db)


async def get_list_bots(db: AsyncSession = Depends(get_db)) -> ListBots:
    return ListBots(db)


async def get_update_bot(db: AsyncSession = Depends(get_db)) -> UpdateBot:
    return UpdateBot(db)


async def get_delete_bot(db: AsyncSession = Depends(get_db)) -> DeleteBot:
    return DeleteBot(db)


async def get_activate_bot(db: AsyncSession = Depends(get_db)) -> ActivateBot:
    return ActivateBot(db)


async def get_deactivate_bot(db: AsyncSession = Depends(get_db)) -> DeactivateBot:
    return DeactivateBot(db)


async def get_sync_bot_from_telegram(db: AsyncSession = Depends(get_db)) -> SyncBotFromTelegram:
    return SyncBotFromTelegram(db)


async def get_upload_bot_photo(db: AsyncSession = Depends(get_db)) -> UploadBotPhoto:
    return UploadBotPhoto(db)


async def get_delete_bot_photo(db: AsyncSession = Depends(get_db)) -> DeleteBotPhoto:
    return DeleteBotPhoto(db)


async def get_update_welcome_settings(db: AsyncSession = Depends(get_db)) -> UpdateWelcomeSettings:
    return UpdateWelcomeSettings(db)


async def get_update_auto_approval(db: AsyncSession = Depends(get_db)) -> UpdateAutoApproval:
    return UpdateAutoApproval(db)


async def get_send_bot_message(db: AsyncSession = Depends(get_db)) -> SendBotMessage:
    return SendBotMessage(db)


async def get_broadcast_to_chats(db: AsyncSession = Depends(get_db)) -> BroadcastToChats:
    return BroadcastToChats(db)


async def get_list_bot_messages(db: AsyncSession = Depends(get_db)) -> ListBotMessages:
    return ListBotMessages(db)


async def get_bot_stats_use_case(db: AsyncSession = Depends(get_db)) -> GetBotStats:
    return GetBotStats(db)


async def get_create_command(db: AsyncSession = Depends(get_db)) -> CreateCommand:
    return CreateCommand(db)


async def get_list_commands(db: AsyncSession = Depends(get_db)) -> ListCommands:
    return ListCommands(db)


async def get_update_command(db: AsyncSession = Depends(get_db)) -> UpdateCommand:
    return UpdateCommand(db)


async def get_delete_command(db: AsyncSession = Depends(get_db)) -> DeleteCommand:
    return DeleteCommand(db)


async def get_create_auto_reply(db: AsyncSession = Depends(get_db)) -> CreateAutoReply:
    return CreateAutoReply(db)


async def get_list_auto_replies(db: AsyncSession = Depends(get_db)) -> ListAutoReplies:
    return ListAutoReplies(db)


async def get_update_auto_reply(db: AsyncSession = Depends(get_db)) -> UpdateAutoReply:
    return UpdateAutoReply(db)


async def get_delete_auto_reply(db: AsyncSession = Depends(get_db)) -> DeleteAutoReply:
    return DeleteAutoReply(db)


async def get_create_trigger(db: AsyncSession = Depends(get_db)) -> CreateTrigger:
    return CreateTrigger(db)


async def get_list_triggers(db: AsyncSession = Depends(get_db)) -> ListTriggers:
    return ListTriggers(db)


async def get_update_trigger(db: AsyncSession = Depends(get_db)) -> UpdateTrigger:
    return UpdateTrigger(db)


async def get_delete_trigger(db: AsyncSession = Depends(get_db)) -> DeleteTrigger:
    return DeleteTrigger(db)


async def get_create_recurring(db: AsyncSession = Depends(get_db)) -> CreateRecurring:
    return CreateRecurring(db)


async def get_list_recurring(db: AsyncSession = Depends(get_db)) -> ListRecurring:
    return ListRecurring(db)


async def get_update_recurring(db: AsyncSession = Depends(get_db)) -> UpdateRecurring:
    return UpdateRecurring(db)


async def get_delete_recurring(db: AsyncSession = Depends(get_db)) -> DeleteRecurring:
    return DeleteRecurring(db)
