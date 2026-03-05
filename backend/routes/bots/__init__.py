from fastapi import APIRouter
from backend.routes.bots.crud import router as crud_router
from backend.routes.bots.commands import router as commands_router
from backend.routes.bots.auto_reply import router as auto_reply_router
from backend.routes.bots.triggers import router as triggers_router
from backend.routes.bots.recurring import router as recurring_router
from backend.routes.bots.settings import router as settings_router
from backend.routes.bots.messages import router as messages_router

router = APIRouter(prefix="/bots", tags=["Bots"])

router.include_router(crud_router)
router.include_router(commands_router)
router.include_router(auto_reply_router)
router.include_router(triggers_router)
router.include_router(recurring_router)
router.include_router(settings_router)
router.include_router(messages_router)
