from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.websockets.manager import ws_manager
from backend.services.auth.token_service import TokenService
from backend.database import get_db

router = APIRouter()

@router.websocket("/ws")
async def direct_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket подключение для получения обновлений чатов Директа.
    """
    token_service = TokenService(db)
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
