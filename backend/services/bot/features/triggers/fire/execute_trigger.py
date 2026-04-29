"""Execute a single trigger."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Trigger, TriggerActionType, TriggerChatType
from backend.services.bot.features.triggers.actions.ban import ban_action
from backend.services.bot.features.triggers.actions.mute import mute_action
from backend.services.bot.features.triggers.actions.remove_from_group import remove_from_group_action
from backend.services.bot.features.triggers.actions.send_media import send_media_action
from backend.services.bot.features.triggers.actions.send_message import send_message_action
from backend.services.bot.features.triggers.actions.unban import unban_action
from backend.services.bot.features.triggers.fire.matchers import JOIN_REQUEST_TYPES, is_in_delivery_window
from backend.services.bot.features.triggers.moderation_event import create_trigger_moderation_event
from backend.services.bot.features.triggers.schedule.schedule_trigger import schedule_for_next_window
from backend.services.telegram_client import RateLimitedBot

TRIGGER_MODERATION_ACTIONS = (
    TriggerActionType.MUTE_USER,
    TriggerActionType.BAN_USER,
    TriggerActionType.UNBAN_USER,
    TriggerActionType.REMOVE_FROM_GROUP,
)


class ExecuteTrigger:
    """Execute trigger action and write moderation event when relevant."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        trigger: Trigger,
        user_id: int,
        chat_id: int,
        telegram_bot: RateLimitedBot,
        context: Optional[dict] = None,
    ) -> bool:
        if not is_in_delivery_window(trigger):
            await schedule_for_next_window(self.db, trigger, user_id, chat_id, context)
            return True
        action_data = dict(trigger.action_data or {})
        action_data["context"] = context or {}
        action_data["_bot_id"] = trigger.bot_id
        handled = await execute_action(self.db, trigger, user_id, chat_id, telegram_bot, action_data)
        if handled and trigger.action_type in TRIGGER_MODERATION_ACTIONS:
            await create_trigger_moderation_event(self.db, trigger, user_id, chat_id, context)
        return bool(handled)


async def execute_action(
    db: AsyncSession,
    trigger: Trigger,
    user_id: int,
    chat_id: int,
    telegram_bot: RateLimitedBot,
    action_data: dict,
) -> bool:
    """Execute action respecting join-request private/group routing."""
    handler = resolve_action_handler(db, trigger.action_type)
    if handler is None:
        return False
    if trigger.trigger_type not in JOIN_REQUEST_TYPES:
        return await handler(telegram_bot, chat_id, user_id, action_data)
    if trigger.chat_type == TriggerChatType.GROUP:
        return await handler(telegram_bot, chat_id, user_id, action_data)
    if trigger.chat_type == TriggerChatType.BOTH:
        handled = await handler(telegram_bot, user_id, user_id, action_data)
        if chat_id and chat_id != user_id:
            handled = await handler(telegram_bot, chat_id, user_id, action_data) or handled
        return handled
    return await handler(telegram_bot, user_id, user_id, action_data)


def resolve_action_handler(db: AsyncSession, action_type: TriggerActionType):
    """Resolve TriggerActionType to async action handler."""
    handlers = {
        TriggerActionType.SEND_MESSAGE: lambda bot, chat_id, user_id, data: send_message_action(db, bot, chat_id, user_id, data),
        TriggerActionType.SEND_MEDIA: lambda bot, chat_id, user_id, data: send_media_action(db, bot, chat_id, user_id, data),
        TriggerActionType.MUTE_USER: mute_action,
        TriggerActionType.BAN_USER: ban_action,
        TriggerActionType.UNBAN_USER: unban_action,
        TriggerActionType.REMOVE_FROM_GROUP: remove_from_group_action,
    }
    return handlers.get(action_type)