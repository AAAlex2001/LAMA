from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.database import AsyncSessionLocal
from backend.services.auth.features.tokens.verify_access_token import VerifyAccessToken
from backend.services.auth.settings import load_auth_settings
from backend.websockets.manager import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def direct_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    async with AsyncSessionLocal() as db:
        user = await VerifyAccessToken(db, load_auth_settings()).execute(token)

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
