from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.channel.channel_service import ChannelService
from backend.services.channel.sync_service import SyncService
from backend.services.channel.backup_service import BackupService
from backend.services.channel.backup_job_service import BackupJobService
from backend.services.channel.telegram_settings_service import TelegramSettingsService
from backend.services.channel.moderation_service import ModerationService
from backend.services.channel.antispam_service import AntispamService
from backend.services.channel.flood_service import FloodService
from backend.services.channel.auto_delete_service import AutoDeleteService
from backend.services.channel.invite_link_service import InviteLinkService
from backend.services.channel.night_mode_service import NightModeService
from backend.services.channel.captcha_settings_service import CaptchaSettingsService
from backend.services.channel.forum_topic_service import ForumTopicService
from backend.services.channel.info_messages_service import InfoMessagesService


async def get_channel_service(db: AsyncSession = Depends(get_db)) -> ChannelService:
    return ChannelService(db)


async def get_sync_service(db: AsyncSession = Depends(get_db)) -> SyncService:
    return SyncService(db)


async def get_backup_service(db: AsyncSession = Depends(get_db)) -> BackupService:
    return BackupService(db)


async def get_backup_job_service(db: AsyncSession = Depends(get_db)) -> BackupJobService:
    return BackupJobService(db)


async def get_telegram_settings_service(db: AsyncSession = Depends(get_db)) -> TelegramSettingsService:
    return TelegramSettingsService(db)


async def get_moderation_service(db: AsyncSession = Depends(get_db)) -> ModerationService:
    return ModerationService(db)


async def get_antispam_service(db: AsyncSession = Depends(get_db)) -> AntispamService:
    return AntispamService(db)


async def get_flood_service(db: AsyncSession = Depends(get_db)) -> FloodService:
    return FloodService(db)


async def get_auto_delete_service(db: AsyncSession = Depends(get_db)) -> AutoDeleteService:
    return AutoDeleteService(db)


async def get_invite_link_service(db: AsyncSession = Depends(get_db)) -> InviteLinkService:
    return InviteLinkService(db)


async def get_night_mode_service(db: AsyncSession = Depends(get_db)) -> NightModeService:
    return NightModeService(db)


async def get_captcha_settings_service(db: AsyncSession = Depends(get_db)) -> CaptchaSettingsService:
    return CaptchaSettingsService(db)


async def get_forum_topic_service(db: AsyncSession = Depends(get_db)) -> ForumTopicService:
    return ForumTopicService(db)


async def get_info_messages_service(db: AsyncSession = Depends(get_db)) -> InfoMessagesService:
    return InfoMessagesService(db)
