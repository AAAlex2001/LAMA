from fastapi import APIRouter

from backend.routes.publications.crud import router as crud_router
from backend.routes.publications.calendar import router as calendar_router
from backend.routes.publications.publishing import router as publishing_router
from backend.routes.publications.sharing import router as sharing_router
from backend.routes.publications.ai import router as ai_router
from backend.routes.publications.tags import router as tags_router
from backend.routes.publications.templates import router as templates_router
from backend.routes.publications.series import router as series_router

router = APIRouter(prefix="/publications", tags=["publications"])

router.include_router(calendar_router)
router.include_router(crud_router)
router.include_router(publishing_router)
router.include_router(sharing_router)
router.include_router(ai_router)
router.include_router(tags_router)
router.include_router(templates_router)
router.include_router(series_router)
