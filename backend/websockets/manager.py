import asyncio
import json
import os
import logging
from typing import Dict, Set
from fastapi import WebSocket
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class WebSocketManager:
    """Менеджер WebSocket-подключений с поддержкой Redis Pub/Sub."""
    
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.redis = None
        self.pubsub = None
        self.listen_task = None

    async def connect_redis(self):
        """Подключение к Redis и запуск слушателя каналов."""
        if not self.redis:
            self.redis = Redis.from_url(REDIS_URL, decode_responses=True)
            self.pubsub = self.redis.pubsub()
            await self.pubsub.psubscribe("ws:direct:*")
            self.listen_task = asyncio.create_task(self._listen_redis())

    async def _listen_redis(self):
        """Прослушивание Redis каналов и рассылка сообщений локальным клиентам."""
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "pmessage":
                    channel = message["channel"]
                    user_id_str = channel.split(":")[-1]
                    if user_id_str.isdigit():
                        user_id = int(user_id_str)
                        await self._send_to_local_sockets(user_id, message["data"])
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis WS listen error: {e}", exc_info=True)

    async def connect(self, websocket: WebSocket, user_id: int):
        """Подключение воркера и пользователя."""
        await websocket.accept()
        if not self.redis:
            await self.connect_redis()
            
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Отключение пользователя."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def _send_to_local_sockets(self, user_id: int, message_json: str):
        """Рассылка сообщения всем локальным WebSocket-соединениям пользователя."""
        if user_id in self.active_connections:
            dead_sockets = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message_json)
                except Exception:
                    dead_sockets.add(connection)
            
            for dead in dead_sockets:
                self.disconnect(dead, user_id)

    async def broadcast_chat_update(self, user_id: int, bot_id: int, chat_id: int, event_type: str, payload: dict):
        """Публикация события в Redis."""
        message = {
            "type": event_type,
            "bot_id": bot_id,
            "chat_id": chat_id,
            "payload": payload
        }
        if not self.redis:
            await self.connect_redis()
        
        channel = f"ws:direct:{user_id}"
        await self.redis.publish(channel, json.dumps(message, default=str))

ws_manager = WebSocketManager()