from fastapi import APIRouter
from backend.routes.bots.bots import router as bots_router
from backend.routes.bots.commands import router as commands_router
from backend.routes.bots.auto_replies import router as auto_replies_router
from backend.routes.bots.triggers import router as triggers_router
from backend.routes.bots.recurring import router as recurring_router
from backend.routes.bots.welcome import router as welcome_router
from backend.routes.bots.auto_approval import router as auto_approval_router
from backend.routes.bots.messages import router as messages_router

router = APIRouter(prefix="/bots", tags=["Bots"])

router.include_router(bots_router)
router.include_router(commands_router)
router.include_router(auto_replies_router)
router.include_router(triggers_router)
router.include_router(recurring_router)
router.include_router(welcome_router)
router.include_router(auto_approval_router)
router.include_router(messages_router)
