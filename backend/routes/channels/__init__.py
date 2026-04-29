from fastapi import APIRouter

from backend.routes.channels.antispam import router as antispam_router
from backend.routes.channels.auto_delete import router as auto_delete_router
from backend.routes.channels.backup import router as backup_router
from backend.routes.channels.banned_words import router as banned_words_router
from backend.routes.channels.captcha import router as captcha_router
from backend.routes.channels.channels import router as channels_router
from backend.routes.channels.flood import router as flood_router
from backend.routes.channels.forum_topics import router as forum_topics_router
from backend.routes.channels.info_messages import router as info_messages_router
from backend.routes.channels.invite_links import router as invite_links_router
from backend.routes.channels.media_block import router as media_block_router
from backend.routes.channels.moderation import router as moderation_router
from backend.routes.channels.night_mode import router as night_mode_router
from backend.routes.channels.quick_commands import router as quick_commands_router
from backend.routes.channels.sync import router as sync_router
from backend.routes.channels.telegram_settings import router as telegram_settings_router

router = APIRouter(prefix="/channels", tags=["channels"])

router.include_router(sync_router)
router.include_router(backup_router)
router.include_router(moderation_router)
router.include_router(antispam_router)
router.include_router(flood_router)
router.include_router(banned_words_router)
router.include_router(auto_delete_router)
router.include_router(quick_commands_router)
router.include_router(media_block_router)
router.include_router(night_mode_router)
router.include_router(captcha_router)
router.include_router(telegram_settings_router)
router.include_router(invite_links_router)
router.include_router(channels_router)
router.include_router(forum_topics_router)
router.include_router(info_messages_router)
