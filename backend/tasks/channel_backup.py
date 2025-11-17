from typing import Dict, List, Optional
from datetime import datetime, timezone

from aiogram import Bot
from aiogram.types import Message, Update
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.database import AsyncSessionLocal
from backend.services.channel import ChannelService
from backend.models.channels import ChannelGroup, BackupMode
from backend.models.bots import Bot as BotModel


async def process_instant_backups():
    """
    Обрабатывает новые сообщения из каналов с режимом INSTANT.
    Теперь каждый пользовательский бот обрабатывается отдельно с собственным offset.
    """
    async with AsyncSessionLocal() as db:
        service = ChannelService(db)

        # Используем мастер-бота для обработки всех каналов
        await process_master_bot_channels(db, service)


async def process_master_bot_channels(db, service: ChannelService):
    """Обрабатывает каналы, используя мастер-бота"""
    master_bot = service.get_master_bot()

    # Получаем все активные каналы, требующие бекапа
    channels_result = await db.execute(
        select(ChannelGroup).where(
            ChannelGroup.backup_mode.in_([
                BackupMode.ENABLED,
                BackupMode.INSTANT,
                BackupMode.POST_FACTUM
            ]),
            ChannelGroup.is_active.is_(True)
        )
    )
    channels: List[ChannelGroup] = list(channels_result.scalars().all())

    if not channels:
        return

    # Получаем обновления мастер-бота
    updates: List[Update] = await master_bot.get_updates(
        offset=None,
        timeout=0,
        allowed_updates=["channel_post", "edited_channel_post"]
    )

    if not updates:
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
            backed_up_post = await service.save_post_backup(channel.id, message)

            if (
                channel.backup_mode == BackupMode.INSTANT
                and channel.backup_target_id
                and channel.backup_target_id != channel.id
            ):
                await service.retransmit_post(
                    backed_up_post,
                    channel.backup_target_id
                )
        except Exception as exc:
            print(
                f"Failed to store post {message.message_id} for channel {channel.id}: {exc}"
            )