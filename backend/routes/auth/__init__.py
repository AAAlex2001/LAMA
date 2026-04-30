from fastapi import APIRouter

from backend.routes.auth.bot import router as bot_router
from backend.routes.auth.dependencies import get_current_admin, get_current_user
from backend.routes.auth.email import router as email_router
from backend.routes.auth.profile import router as profile_router
from backend.routes.auth.telegram import router as telegram_router
from backend.routes.auth.tokens import router as tokens_router
from backend.routes.auth.users import router as users_router

router = APIRouter(prefix="/auth", tags=["Authentication"])

router.include_router(telegram_router)
router.include_router(bot_router)
router.include_router(email_router)
router.include_router(tokens_router)
router.include_router(profile_router)
router.include_router(users_router)

__all__ = ["get_current_admin", "get_current_user", "router"]
