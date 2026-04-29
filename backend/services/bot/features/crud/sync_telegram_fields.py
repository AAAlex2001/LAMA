"""Synchronize editable bot profile fields with Telegram."""

from typing import Optional

from backend.models.bots import Bot as BotModel
from backend.services.telegram_client import RateLimitedBot

API_SYNCED_FIELDS = ("description", "short_description")


def needs_telegram_sync(new_name: Optional[str], update_data: dict) -> bool:
    """True when update includes fields that must be pushed to Telegram."""
    return new_name is not None or any(field in update_data for field in API_SYNCED_FIELDS)


async def sync_telegram_fields(
    telegram_bot: RateLimitedBot,
    bot: BotModel,
    new_name: Optional[str],
    update_data: dict,
) -> None:
    """Apply set_my_name / set_my_description / set_my_short_description as needed."""
    if new_name is not None:
        await telegram_bot.set_my_name(name=new_name)
        bot.first_name = new_name
    if "description" in update_data:
        await telegram_bot.set_my_description(description=update_data["description"] or "")
    if "short_description" in update_data:
        await telegram_bot.set_my_short_description(
            short_description=update_data["short_description"] or "",
        )