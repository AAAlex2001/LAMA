from fastapi import APIRouter
from backend.routes.inbox.crud import router as crud_router

router = APIRouter(prefix="/inbox", tags=["inbox"])
router.include_router(crud_router)
