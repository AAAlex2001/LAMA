import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.websockets.manager import ws_manager
from backend.services.auth.token_service import TokenService
from backend.database import AsyncSessionLocal

router = APIRouter()

@router.websocket("/ws")
async def direct_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket подключение для получения обновлений чатов Директа.
    """
    # Короткоживущая сессия только для проверки токена
    async with AsyncSessionLocal() as db:
        jwt_secret = os.getenv("JWT_SECRET", "")
        token_service = TokenService(db, jwt_secret)
        user = await token_service.verify_access_token(token)

    if not user:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket, user.id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user.id)
