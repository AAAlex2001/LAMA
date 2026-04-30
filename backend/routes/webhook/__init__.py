from fastapi import APIRouter

from backend.routes.webhook.telegram import router as telegram_router

router = APIRouter()
router.include_router(telegram_router)

__all__ = ["router"]
