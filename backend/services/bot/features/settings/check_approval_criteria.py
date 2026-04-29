"""Проверка критериев автоодобрения заявки на вступление."""

from backend.models.bots import ApprovalMode, Bot as BotModel
from backend.services.bot.features.settings.check_channel_subscriptions import (
    check_channel_subscriptions,
)


async def check_approval_criteria(
    bot: BotModel, user_id: int,
) -> tuple[bool, list[int]]:
    """AUTO → одобрить; MANUAL → не одобрять; CRITERIA → проверка подписок на каналы."""
    if bot.auto_approval_mode == ApprovalMode.AUTO:
        return True, []
    if bot.auto_approval_mode == ApprovalMode.MANUAL:
        return False, []

    required_channels = pick_required_channels(bot)
    if not required_channels:
        return False, []

    return await check_channel_subscriptions(bot, user_id, required_channels)


def pick_required_channels(bot: BotModel) -> list[int]:
    """Список каналов из approval_criteria или []."""
    if not bot.approval_criteria:
        return []
    return bot.approval_criteria.get("required_channels", []) or []
