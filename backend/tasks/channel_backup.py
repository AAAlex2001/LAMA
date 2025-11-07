import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import AsyncSessionLocal
from backend.config import get_bot
from backend.models.channels import ChannelGroup, BackedUpPost, BackupMode
from backend.services.channels import ChannelService


async def process_instant_backups():
    """
    Фоновая задача для обработки моментальных бекапов.
    Проверяет каналы с режимом INSTANT и ретранслирует новые посты.
    """
    async with AsyncSessionLocal() as db:
        bot = get_bot()
        service = ChannelService(db, bot)
        
        query = select(ChannelGroup).where(
            ChannelGroup.backup_mode == BackupMode.INSTANT,
            ChannelGroup.is_active == True,
            ChannelGroup.backup_target_id.isnot(None)
        )
        
        result = await db.execute(query)
        channels = list(result.scalars().all())
        
        for channel in channels:
            try:
                query = select(BackedUpPost).where(
                    BackedUpPost.channel_id == channel.id
                ).order_by(BackedUpPost.original_date.desc()).limit(10)
                
                result = await db.execute(query)
                recent_posts = list(result.scalars().all())
                
                for post in recent_posts:
                    existing_retransmission = await db.execute(
                        select(BackedUpPost).join(
                            BackedUpPost.retransmissions
                        ).where(
                            BackedUpPost.id == post.id,
                            BackedUpPost.retransmissions.any(
                                target_channel_id=channel.backup_target_id
                            )
                        )
                    )
                    
                    if existing_retransmission.scalar_one_or_none():
                        continue
                    
                    try:
                        await service.retransmit_post(post, channel.backup_target_id)
                    except Exception as e:
                        print(f"Failed to retransmit post {post.id}: {e}")
                        
            except Exception as e:
                print(f"Error processing channel {channel.id}: {e}")

