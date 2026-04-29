from fastapi import APIRouter

from backend.routes.inbox.bulk_actions import router as bulk_actions_router
from backend.routes.inbox.events import router as events_router
from backend.routes.inbox.specific_actions import router as specific_actions_router

router = APIRouter(prefix="/inbox", tags=["inbox"])

router.include_router(events_router)
router.include_router(bulk_actions_router)
router.include_router(specific_actions_router)
