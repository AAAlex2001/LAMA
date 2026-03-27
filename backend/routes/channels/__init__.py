from fastapi import APIRouter

from backend.routes.channels.sync import router as sync_router
from backend.routes.channels.backup import router as backup_router
from backend.routes.channels.moderation import router as moderation_router
from backend.routes.channels.protection import router as protection_router
from backend.routes.channels.telegram_settings import router as telegram_settings_router
from backend.routes.channels.invite_links import router as invite_links_router
from backend.routes.channels.crud import router as crud_router
from backend.routes.channels.forum_topics import router as forum_topics_router

router = APIRouter(prefix="/channels", tags=["channels"])

router.include_router(sync_router)
router.include_router(backup_router)
router.include_router(moderation_router)
router.include_router(protection_router)
router.include_router(telegram_settings_router)
router.include_router(invite_links_router)
router.include_router(crud_router)
router.include_router(forum_topics_router)
