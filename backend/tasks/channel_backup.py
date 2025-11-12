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

        # Получаем всех активных ботов
        bots_result = await db.execute(
            select(BotModel).where(
                BotModel.status == "ACTIVE",
                BotModel.is_webhook_enabled == False
            )
        )
        bots: List[BotModel] = list(bots_result.scalars().all())

        if not bots:
            return

        # Обрабатываем каждого бота отдельно
        for bot_model in bots:
            try:
                await process_bot_channels(db, service, bot_model)
            except Exception as exc:
                print(f"Failed to process bot {bot_model.id}: {exc}")


async def process_bot_channels(db, service: ChannelService, bot_model: BotModel):
    """Обрабатывает каналы конкретного бота"""
    # Получаем каналы с INSTANT режимом для этого бота
    channels_result = await db.execute(
        select(ChannelGroup).where(
            ChannelGroup.bot_id == bot_model.id,
            ChannelGroup.backup_mode == BackupMode.INSTANT,
            ChannelGroup.is_active.is_(True)
        )
    )
    channels: List[ChannelGroup] = list(channels_result.scalars().all())

    if not channels:
        return

    # Создаём aiogram Bot для этого токена
    bot = Bot(token=bot_model.token)

    try:
        # Получаем обновления с учётом offset
        updates: List[Update] = await bot.get_updates(
            offset=bot_model.last_channel_update_id,
            timeout=0,
            allowed_updates=["channel_post", "edited_channel_post"]
        )
    except Exception as exc:
        print(f"Failed to fetch channel updates for bot {bot_model.id}: {exc}")
        return

    if not updates:
        return

    # Создаём карту каналов по telegram_id
    channel_map: Dict[int, ChannelGroup] = {
        channel.telegram_id: channel for channel in channels
    }

    # Обрабатываем каждое обновление
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

    # Обновляем offset бота
    new_offset = updates[-1].update_id + 1
    bot_model.last_channel_update_id = new_offset
    bot_model.updated_at = datetime.now(timezone.utc)
    await db.commit()