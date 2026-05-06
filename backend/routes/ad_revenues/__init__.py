from fastapi import APIRouter

from backend.routes.ad_revenues.crud import router as crud_router

router = APIRouter(prefix="/ad-revenues", tags=["ad-revenues"])
router.include_router(crud_router)
