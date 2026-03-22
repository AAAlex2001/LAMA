from fastapi import HTTPException
from typing import Tuple, List, Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, and_, update
from sqlalchemy.orm import defer
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
                await self.db.flush()
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
        await self.db.flush()
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

        last_msg_ranked = (
            select(
                BotMessage.bot_id,
                BotMessage.chat_id,
                BotMessage.text_content,
                BotMessage.message_type,
                BotMessage.created_at.label("last_message_at"),
                func.row_number().over(
                    partition_by=(BotMessage.bot_id, BotMessage.chat_id),
                    order_by=desc(BotMessage.created_at),
                ).label("rn"),
            )
        ).subquery("last_msg_ranked")

        last_msg_data = (
            select(
                last_msg_ranked.c.bot_id,
                last_msg_ranked.c.chat_id,
                last_msg_ranked.c.text_content,
                last_msg_ranked.c.message_type,
                last_msg_ranked.c.last_message_at,
            )
            .where(last_msg_ranked.c.rn == 1)
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
        after_message_id: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Получить историю сообщений в чате с reply_message_text."""
        bot_check = select(Bot.id).where(and_(Bot.id == bot_id, Bot.owner_id == owner_id))
        bot_exists = (await self.db.execute(bot_check)).scalar_one_or_none()
        if not bot_exists:
            return [], 0

        base_filter = and_(BotMessage.bot_id == bot_id, BotMessage.chat_id == tg_chat_id)

        count_query = select(func.count()).where(base_filter).select_from(BotMessage)
        total = (await self.db.execute(count_query)).scalar() or 0

        msg_query = select(BotMessage).where(base_filter).options(defer(BotMessage.raw_data))

        if after_message_id:
            target = await self.db.execute(
                select(BotMessage.id).where(base_filter, BotMessage.telegram_message_id == after_message_id)
            )
            target_id = target.scalar_one_or_none()
            if target_id:
                messages = list(
                    (await self.db.execute(
                        msg_query.where(BotMessage.id > target_id)
                        .order_by(desc(BotMessage.created_at))
                        .limit(limit)
                    )).scalars().all()
                )
            else:
                messages = list(
                    (await self.db.execute(
                        msg_query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
                    )).scalars().all()
                )
        elif around_message_id:
            half = limit // 2
            target = await self.db.execute(
                select(BotMessage.id).where(base_filter, BotMessage.telegram_message_id == around_message_id)
            )
            target_id = target.scalar_one_or_none()
            if target_id:
                before_q = (
                    msg_query.where(BotMessage.id <= target_id)
                    .order_by(desc(BotMessage.id))
                    .limit(half + 1)
                )
                after_q = (
                    msg_query.where(BotMessage.id > target_id)
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
                        msg_query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
                    )).scalars().all()
                )
        else:
            messages = list(
                (await self.db.execute(
                    msg_query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
                )).scalars().all()
            )

        reply_ids = [m.reply_to_message_id for m in messages if m.reply_to_message_id]
        reply_texts: Dict[int, Dict[str, Any]] = {}
        if reply_ids:
            reply_q = select(
                BotMessage.telegram_message_id,
                BotMessage.text_content,
                BotMessage.message_type,
                BotMessage.media_url,
                BotMessage.is_system,
            ).where(
                base_filter, BotMessage.telegram_message_id.in_(reply_ids)
            )
            rows = (await self.db.execute(reply_q)).all()
            type_labels = {
                MessageType.PHOTO: "Фотография",
                MessageType.VIDEO: "Видео",
                MessageType.DOCUMENT: "Документ",
                MessageType.AUDIO: "Аудио",
                MessageType.VOICE: "Голосовое",
                MessageType.ANIMATION: "GIF",
                MessageType.STICKER: "Стикер",
            }
            for tg_msg_id, text, msg_type, media_url, is_sys in rows:
                reply_texts[tg_msg_id] = {
                    "text": text[:200] if text else type_labels.get(msg_type, "Медиа"),
                    "media_url": media_url if is_sys else None,
                    "message_type": msg_type.value if msg_type else None,
                    "is_post": is_sys or False,
                }

        enriched = []
        for m in messages:
            data = {
                "id": m.id,
                "bot_id": m.bot_id,
                "telegram_message_id": m.telegram_message_id,
                "chat_id": m.chat_id,
                "user_id": m.user_id,
                "message_type": m.message_type,
                "text_content": m.text_content,
                "media_file_id": m.media_file_id,
                "media_url": m.media_url,
                "reply_to_message_id": m.reply_to_message_id,
                "is_incoming": m.is_incoming,
                "is_system": m.is_system,
                "created_at": m.created_at,
                "media_group_id": None,
                "media_name": None,
                "media_size": None,
            }
            reply_data = reply_texts.get(m.reply_to_message_id) if m.reply_to_message_id else None
            data["reply_message_text"] = reply_data["text"] if reply_data else None
            data["reply_media_url"] = reply_data["media_url"] if reply_data else None
            data["reply_message_type"] = reply_data["message_type"] if reply_data else None
            data["reply_is_post"] = reply_data["is_post"] if reply_data else False
            enriched.append(data)

        if enriched:
            msg_ids = [d["id"] for d in enriched]
            raw_q = select(
                BotMessage.id,
                BotMessage.raw_data,
            ).where(
                BotMessage.id.in_(msg_ids),
                BotMessage.raw_data.isnot(None),
            )
            raw_rows = (await self.db.execute(raw_q)).all()
            raw_map: Dict[int, dict] = {row[0]: row[1] for row in raw_rows if row[1]}

            for data in enriched:
                raw = raw_map.get(data["id"])
                if not raw:
                    continue
                data["media_group_id"] = str(raw["media_group_id"]) if raw.get("media_group_id") else None
                doc = raw.get("document")
                audio = raw.get("audio")
                voice = raw.get("voice")
                if doc and doc.get("file_name"):
                    data["media_name"] = str(doc["file_name"])
                elif audio:
                    data["media_name"] = str(audio.get("file_name") or audio.get("title") or "")
                elif voice and voice.get("file_unique_id"):
                    data["media_name"] = f"voice_{voice['file_unique_id']}"
                for key in ("document", "audio", "voice", "video", "animation"):
                    media = raw.get(key)
                    if media and media.get("file_size") is not None:
                        data["media_size"] = int(media["file_size"])
                        break

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
            raise HTTPException(status_code=404, detail="Chat not found or access denied")

        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(chat, key, value)

        await self.db.flush()
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
        bot_check = await self.db.execute(
            select(Bot.id).where(and_(Bot.id == bot_id, Bot.owner_id == owner_id))
        )
        if not bot_check.scalar_one_or_none():
            return False

        stmt = (
            update(DirectChat)
            .where(
                and_(
                    DirectChat.bot_id == bot_id,
                    DirectChat.tg_chat_id == tg_chat_id,
                )
            )
            .values(unread_count=0)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
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
        await self.db.flush()

    async def update_photo(self, bot_id: int, tg_chat_id: int, photo_url: str) -> None:
        stmt = (
            update(DirectChat)
            .where(
                and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id)
            )
            .values(tg_photo_url=photo_url)
        )
        await self.db.execute(stmt)
