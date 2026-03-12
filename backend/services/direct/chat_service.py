from fastapi import HTTPException
from typing import Tuple, List, Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, and_, update
from datetime import datetime, timezone

from backend.models.direct import DirectChat
from backend.models.bots import BotMessage, Bot, MessageType
from backend.schemas.direct.chat import DirectChatUpdate
from backend.websockets.manager import ws_manager

class DirectChatService:
    """Сервис для работы со списком чатов в Директе."""
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_chat(
        self,
        bot_id: int,
        tg_chat_id: int,
        tg_user_id: Optional[int] = None,
        tg_username: Optional[str] = None,
        tg_first_name: Optional[str] = None,
        tg_last_name: Optional[str] = None,
        tg_photo_url: Optional[str] = None,
    ) -> DirectChat:
        """Получить существующий чат или создать новый."""
        query = select(DirectChat).where(
            and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id)
        )
        result = await self.db.execute(query)
        chat = result.scalar_one_or_none()

        if chat:
            needs_update = False
            if tg_username and chat.tg_username != tg_username:
                chat.tg_username = tg_username
                needs_update = True
            if tg_first_name and chat.tg_first_name != tg_first_name:
                chat.tg_first_name = tg_first_name
                needs_update = True
            if tg_last_name and chat.tg_last_name != tg_last_name:
                chat.tg_last_name = tg_last_name
                needs_update = True
            if tg_photo_url and chat.tg_photo_url != tg_photo_url:
                chat.tg_photo_url = tg_photo_url
                needs_update = True
            if needs_update:
                await self.db.commit()
                await self.db.refresh(chat)
            return chat

        new_chat = DirectChat(
            bot_id=bot_id,
            tg_chat_id=tg_chat_id,
            tg_user_id=tg_user_id,
            tg_username=tg_username,
            tg_first_name=tg_first_name,
            tg_last_name=tg_last_name,
            tg_photo_url=tg_photo_url,
        )
        self.db.add(new_chat)
        await self.db.commit()
        await self.db.refresh(new_chat)
        return new_chat

    async def get_chats_for_user(
        self,
        owner_id: int,
        skip: int = 0,
        limit: int = 50,
        bot_id: Optional[int] = None,
        sort: str = "new",
        unread_filter: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Получить список чатов с превью последнего сообщения (1 запрос вместо N+1)."""
        base_filter = [Bot.owner_id == owner_id]
        if bot_id:
            base_filter.append(DirectChat.bot_id == bot_id)
        if unread_filter == "unread":
            base_filter.append(DirectChat.unread_count > 0)
        elif unread_filter == "read":
            base_filter.append(DirectChat.unread_count == 0)

        last_msg_sq = (
            select(
                BotMessage.bot_id,
                BotMessage.chat_id,
                func.max(BotMessage.created_at).label("last_msg_at"),
            )
            .group_by(BotMessage.bot_id, BotMessage.chat_id)
            .subquery("last_msg_sq")
        )

        last_msg_data = (
            select(
                BotMessage.bot_id,
                BotMessage.chat_id,
                BotMessage.text_content,
                BotMessage.message_type,
                BotMessage.created_at.label("last_message_at"),
            )
            .join(
                last_msg_sq,
                and_(
                    BotMessage.bot_id == last_msg_sq.c.bot_id,
                    BotMessage.chat_id == last_msg_sq.c.chat_id,
                    BotMessage.created_at == last_msg_sq.c.last_msg_at,
                ),
            )
            .subquery("last_msg_data")
        )

        query = (
            select(
                DirectChat,
                last_msg_data.c.text_content.label("_last_text"),
                last_msg_data.c.message_type.label("_last_type"),
                last_msg_data.c.last_message_at.label("_last_at"),
                Bot.username.label("_bot_username"),
                Bot.first_name.label("_bot_first_name"),
            )
            .join(Bot, DirectChat.bot_id == Bot.id)
            .outerjoin(
                last_msg_data,
                and_(
                    DirectChat.bot_id == last_msg_data.c.bot_id,
                    DirectChat.tg_chat_id == last_msg_data.c.chat_id,
                ),
            )
            .where(and_(*base_filter))
        )

        count_query = select(func.count()).select_from(
            select(DirectChat.id)
            .join(Bot, DirectChat.bot_id == Bot.id)
            .where(and_(*base_filter))
            .subquery()
        )
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(
            desc(DirectChat.is_pinned),
            asc(DirectChat.updated_at) if sort == "old" else desc(DirectChat.updated_at),
        )
        query = query.offset(skip).limit(limit)

        rows = (await self.db.execute(query)).all()

        enriched_chats = []
        for row in rows:
            chat = row[0]
            last_text = row[1]
            last_type = row[2]
            last_at = row[3]
            bot_username = row[4]
            bot_first_name = row[5]

            preview = None
            if last_at is not None:
                if last_type == MessageType.TEXT or last_type == MessageType.TEXT.value:
                    preview = last_text
                elif last_type == MessageType.PHOTO or last_type == MessageType.PHOTO.value:
                    preview = "Фотография"
                elif last_type == MessageType.VIDEO or last_type == MessageType.VIDEO.value:
                    preview = "Видео"
                elif last_type == MessageType.DOCUMENT or last_type == MessageType.DOCUMENT.value:
                    preview = "Документ"
                else:
                    preview = "Медиа"

            enriched_chats.append({
                "id": chat.id,
                "bot_id": chat.bot_id,
                "tg_chat_id": chat.tg_chat_id,
                "tg_user_id": chat.tg_user_id,
                "tg_username": chat.tg_username,
                "tg_first_name": chat.tg_first_name,
                "tg_last_name": chat.tg_last_name,
                "tg_photo_url": chat.tg_photo_url,
                "unread_count": chat.unread_count,
                "is_pinned": chat.is_pinned,
                "is_blocked": chat.is_blocked,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "bot_username": bot_username,
                "bot_first_name": bot_first_name,
                "last_message_preview": preview,
                "last_message_at": last_at,
            })

        return enriched_chats, total

    async def get_chat_messages(
        self,
        bot_id: int,
        tg_chat_id: int,
        owner_id: int,
        skip: int = 0,
        limit: int = 50,
        around_message_id: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Получить историю сообщений в чате с reply_message_text."""
        bot_check = select(Bot.id).where(and_(Bot.id == bot_id, Bot.owner_id == owner_id))
        bot_exists = (await self.db.execute(bot_check)).scalar_one_or_none()
        if not bot_exists:
            return [], 0

        base_filter = and_(BotMessage.bot_id == bot_id, BotMessage.chat_id == tg_chat_id)
        base_query = select(BotMessage).where(base_filter)

        count_query = select(func.count()).select_from(base_query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        if around_message_id:
            half = limit // 2
            target = await self.db.execute(
                select(BotMessage).where(base_filter, BotMessage.telegram_message_id == around_message_id)
            )
            target_msg = target.scalar_one_or_none()
            if target_msg:
                before_q = (
                    select(BotMessage)
                    .where(base_filter, BotMessage.id <= target_msg.id)
                    .order_by(desc(BotMessage.id))
                    .limit(half + 1)
                )
                after_q = (
                    select(BotMessage)
                    .where(base_filter, BotMessage.id > target_msg.id)
                    .order_by(asc(BotMessage.id))
                    .limit(half)
                )
                before = list((await self.db.execute(before_q)).scalars().all())
                after = list((await self.db.execute(after_q)).scalars().all())
                after.reverse()
                messages = after + before
            else:
                messages = list(
                    (await self.db.execute(
                        base_query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
                    )).scalars().all()
                )
        else:
            messages = list(
                (await self.db.execute(
                    base_query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
                )).scalars().all()
            )

        reply_ids = [m.reply_to_message_id for m in messages if m.reply_to_message_id]
        reply_texts = {}
        if reply_ids:
            reply_q = select(BotMessage.telegram_message_id, BotMessage.text_content).where(
                base_filter, BotMessage.telegram_message_id.in_(reply_ids)
            )
            rows = (await self.db.execute(reply_q)).all()
            for tg_msg_id, text in rows:
                reply_texts[tg_msg_id] = (text or "")[:100]

        enriched = []
        for m in messages:
            data = {c.name: getattr(m, c.name) for c in m.__table__.columns}
            data["media_group_id"] = m.media_group_id
            data["media_name"] = m.media_name
            data["media_size"] = m.media_size
            rtext = reply_texts.get(m.reply_to_message_id) if m.reply_to_message_id else None
            data["reply_message_text"] = rtext
            enriched.append(data)

        return enriched, total

    async def update_chat_status(
        self,
        chat_id: int,
        owner_id: int,
        update_data: DirectChatUpdate
    ) -> Optional[DirectChat]:
        """Обновить статус чата (закрепление, блокировка, счетчик)."""
        query = select(DirectChat).join(Bot, DirectChat.bot_id == Bot.id).where(
            and_(DirectChat.id == chat_id, Bot.owner_id == owner_id)
        )
        chat = (await self.db.execute(query)).scalar_one_or_none()
        if not chat:
            raise HTTPException(status_code=404, detail="Чат не найден или нет доступа")

        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(chat, key, value)

        await self.db.commit()
        await self.db.refresh(chat)

        await ws_manager.broadcast_chat_update(
            user_id=owner_id,
            bot_id=chat.bot_id,
            chat_id=chat.tg_chat_id,
            event_type="chat_updated",
            payload={"action": "status_update", "chat_id": chat.id}
        )

        return chat

    async def reset_unread(self, bot_id: int, tg_chat_id: int, owner_id: int) -> bool:
        """Сбросить счетчик непрочитанных (с проверкой владельца)."""
        stmt = (
            update(DirectChat)
            .where(
                and_(
                    DirectChat.bot_id == bot_id,
                    DirectChat.tg_chat_id == tg_chat_id,
                    DirectChat.bot_id.in_(
                        select(Bot.id).where(Bot.owner_id == owner_id)
                    ),
                )
            )
            .values(unread_count=0)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def increment_unread(self, bot_id: int, tg_chat_id: int) -> None:
        """Атомарно увеличить счетчик непрочитанных сообщений."""
        stmt = (
            update(DirectChat)
            .where(
                and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id)
            )
            .values(
                unread_count=DirectChat.unread_count + 1,
                updated_at=datetime.now(timezone.utc),
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()
