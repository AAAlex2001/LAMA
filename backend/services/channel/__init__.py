"""Channel services package. Eager imports were removed to avoid circular imports
(e.g. bot → bot_commands → channel.utils → channel package → sync_service → bot)."""

from __future__ import annotations

__all__ = [
    "ChannelService",
    "SyncService",
    "BackupService",
    "BackupJobService",
    "RetransmitService",
    "TelegramSettingsService",
    "AntispamService",
    "ModerationService",
    "FloodService",
    "AutoDeleteService",
    "InviteLinkService",
    "NightModeService",
    "ChannelModerationService",
    "ChannelAutoDeleteService",
    "ChatPermissionsService",
]


def __getattr__(name: str):
    if name == "ChannelService":
        from backend.services.channel.channel_service import ChannelService

        return ChannelService
    if name == "SyncService":
        from backend.services.channel.sync_service import SyncService

        return SyncService
    if name == "BackupService":
        from backend.services.channel.backup_service import BackupService

        return BackupService
    if name == "BackupJobService":
        from backend.services.channel.backup_job_service import BackupJobService

        return BackupJobService
    if name == "RetransmitService":
        from backend.services.channel.retransmit_service import RetransmitService

        return RetransmitService
    if name == "TelegramSettingsService":
        from backend.services.channel.telegram_settings_service import TelegramSettingsService

        return TelegramSettingsService
    if name == "AntispamService":
        from backend.services.channel.antispam_service import AntispamService

        return AntispamService
    if name == "ModerationService":
        from backend.services.channel.moderation_service import ModerationService

        return ModerationService
    if name == "FloodService":
        from backend.services.channel.flood_service import FloodService

        return FloodService
    if name == "AutoDeleteService":
        from backend.services.channel.auto_delete_service import AutoDeleteService

        return AutoDeleteService
    if name == "InviteLinkService":
        from backend.services.channel.invite_link_service import InviteLinkService

        return InviteLinkService
    if name == "NightModeService":
        from backend.services.channel.night_mode_service import NightModeService

        return NightModeService
    if name == "ChatPermissionsService":
        from backend.services.channel.chat_permissions_service import ChatPermissionsService

        return ChatPermissionsService
    if name == "ChannelModerationService":
        from backend.services.channel.moderation_service import ModerationService

        return ModerationService
    if name == "ChannelAutoDeleteService":
        from backend.services.channel.auto_delete_service import AutoDeleteService

        return AutoDeleteService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
