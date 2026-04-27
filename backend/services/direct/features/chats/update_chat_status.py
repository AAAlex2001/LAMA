"""Обновление статуса DirectChat (закрепление, блокировка, прочие флаги)."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.direct import DirectChat
from backend.schemas.direct.chat import DirectChatUpdate
from backend.services.direct.features.chats.lookup import find_chat_by_id_or_404
from backend.websockets.manager import ws_manager


class UpdateChatStatus:
    """Точечно обновляет поля чата + рассылает WS-событие."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, chat_id: int, owner_id: int, update_data: DirectChatUpdate,
    ) -> DirectChat:
        chat = await find_chat_by_id_or_404(self.db, chat_id, owner_id)

        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(chat, key, value)

        await self.db.flush()
        await self.db.refresh(chat)

        await ws_manager.broadcast_chat_update(
            user_id=owner_id,
            bot_id=chat.bot_id,
            chat_id=chat.tg_chat_id,
            event_type="chat_updated",
            payload={"action": "status_update", "chat_id": chat.id},
        )
        return chat
