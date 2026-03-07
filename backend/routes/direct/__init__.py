from fastapi import APIRouter

from .chats import router as chats_router
from .messages import router as messages_router
from .ws import router as ws_router

direct_router = APIRouter()
direct_router.include_router(chats_router)
direct_router.include_router(messages_router)
direct_router.include_router(ws_router)
