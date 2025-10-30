"""
Простой менеджер WebSocket-соединений для трансляции событий от ботов админ-панели.
"""

from __future__ import annotations

from typing import Dict, Set
from fastapi import WebSocket


class WebSocketManager:
    """Управляет подключениями WebSocket по bot_id."""

    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, bot_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if bot_id not in self._connections:
            self._connections[bot_id] = set()
        self._connections[bot_id].add(websocket)

    def disconnect(self, bot_id: str, websocket: WebSocket) -> None:
        if bot_id in self._connections:
            self._connections[bot_id].discard(websocket)
            if not self._connections[bot_id]:
                del self._connections[bot_id]

    async def broadcast(self, bot_id: str, message: dict) -> None:
        if bot_id not in self._connections:
            return
        dead: Set[WebSocket] = set()
        for ws in self._connections[bot_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(bot_id, ws)


__all__ = ["WebSocketManager"]



