from aiogram.types import Message

from backend.services.bot.features.moderation.handle_command import (
    handle_moderation_command,
)


async def execute_moderation_command(command: str, message: Message, telegram_bot) -> bool:
    return await handle_moderation_command(
        command=command,
        message=message,
        telegram_bot=telegram_bot,
    )
