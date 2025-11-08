from typing import Dict, List, Optional

from aiogram.types import Message, Update
from sqlalchemy import select

from backend.database import AsyncSessionLocal
from backend.config import get_bot
from backend.services.channels import ChannelService
from backend.models.channels import ChannelGroup, BackupMode


async def process_instant_backups():
    """
    Обрабатывает новые сообщения из каналов с режимом INSTANT.
    Теперь режим только накапливает архив, без моментальной ретрансляции.
    """
    async with AsyncSessionLocal() as db:
        bot = get_bot()
        service = ChannelService(db, bot)

        channels_result = await db.execute(
            select(ChannelGroup).where(
                ChannelGroup.backup_mode == BackupMode.INSTANT,
                ChannelGroup.is_active.is_(True)
            )
        )
        channels: List[ChannelGroup] = list(channels_result.scalars().all())

        if not channels:
            return

        try:
            updates: List[Update] = await bot.get_updates(
                timeout=0,
                allowed_updates=["channel_post", "edited_channel_post"]
            )
        except Exception as exc:
            print(f"Failed to fetch updates for instant backups: {exc}")
            return

        channel_map: Dict[int, ChannelGroup] = {
            channel.telegram_id: channel for channel in channels
        }

        for update in updates:
            message: Optional[Message] = getattr(update, "channel_post", None) or getattr(
                update, "edited_channel_post", None
            )
            if not message:
                continue

            channel = channel_map.get(message.chat.id)
            if not channel:
                continue

            try:
                await service.save_post_backup(channel.id, message)
            except Exception as exc:
                print(
                    f"Failed to store post {message.message_id} for channel {channel.id}: {exc}"
                )

        if updates:
            try:
                await bot.get_updates(
                    offset=updates[-1].update_id + 1,
                    timeout=0,
                    allowed_updates=["channel_post", "edited_channel_post"]
                )
            except Exception:
                pass