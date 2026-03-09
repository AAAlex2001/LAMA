import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from aiogram.types import ChatPermissions
from backend.models.inbox import InboxEvent
from backend.models.bots import Bot
from backend.models.channels import ChannelGroup
from backend.schemas.inbox.enums import EventStatus, BulkActionType
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.webhook.base import get_bot_session

logger = logging.getLogger(__name__)


class InboxActionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_bulk_action(
        self,
        owner_id: int,
        event_ids: List[int],
        action: BulkActionType,
        apply_to_all: bool = False
    ) -> int:
        """Выполнить массовое действие над событиями инбокса. Возвращает количество затронутых строк."""
        base_where = InboxEvent.owner_id == owner_id
        if not apply_to_all:
            if not event_ids:
                return 0
            base_where = base_where & InboxEvent.id.in_(event_ids)

        modified_count = 0

        if action == BulkActionType.READ:
            stmt = update(InboxEvent).where(base_where).values(status=EventStatus.PROCESSED)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount

        elif action == BulkActionType.IGNORE:
            stmt = update(InboxEvent).where(base_where).values(status=EventStatus.IGNORED)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount

        elif action == BulkActionType.DELETE:
            stmt = delete(InboxEvent).where(base_where)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount

        elif action in [BulkActionType.BLOCK, BulkActionType.UNBLOCK]:
            query = select(InboxEvent).where(base_where)
            result = await self.db.execute(query)
            events = result.scalars().all()

            for event in events:
                if not (event.tg_user_id and event.bot_id and event.channel_id):
                    continue

                bot = await self.db.get(Bot, event.bot_id)
                channel = await self.db.get(ChannelGroup, event.channel_id)

                if not (bot and channel and channel.telegram_id):
                    continue

                try:
                    async with get_bot_session(bot.token) as client:
                        if action == BulkActionType.BLOCK:
                            await client.ban_chat_member(channel.telegram_id, event.tg_user_id)
                        else:
                            await client.unban_chat_member(channel.telegram_id, event.tg_user_id)

                    event.status = EventStatus.PROCESSED
                    modified_count += 1
                except Exception as e:
                    logger.error(
                        f"Не удалось выполнить {action.value} для пользователя {event.tg_user_id} "
                        f"в канале {channel.telegram_id}: {e}",
                        exc_info=True
                    )

        await self.db.commit()
        return modified_count

    async def create_event(self, event_data: dict) -> InboxEvent:
        """Создать событие инбокса. Вызывается из webhook-обработчиков."""
        event = InboxEvent(**event_data)
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_event(self, event_id: int, owner_id: int) -> Optional[InboxEvent]:
        """Получить событие по ID с проверкой владельца."""
        result = await self.db.execute(
            select(InboxEvent).where(
                InboxEvent.id == event_id,
                InboxEvent.owner_id == owner_id
            )
        )
        return result.scalar_one_or_none()

    async def execute_specific_action(
        self, event: InboxEvent, action_type: str, payload: dict = None
    ) -> Optional[SpecificActionResult]:
        """
        Выполнить конкретное действие над событием инбокса.
        Возвращает SpecificActionResult при успехе, None при ошибке.

        Поддерживаемые action_type:
          mark_resolved   — пометить как обработанное (без вызова Telegram)
          reply           — вернуть данные для перехода в Direct чат (без вызова Telegram)
          accept          — принять заявку на вступление в канал
          reject          — отклонить заявку на вступление в канал
          unban           — разбанить пользователя в канале
          block           — забанить пользователя в канале
          delete_message  — удалить вызвавшее сообщение из чата
          change_ban      — изменить тип/срок бана (payload: ban_type, duration_seconds, everywhere)
        """
        payload = payload or {}

        if action_type == "mark_resolved":
            event.status = EventStatus.PROCESSED
            await self.db.commit()
            return SpecificActionResult(status="resolved")

        if action_type == "reply":
            event.status = EventStatus.PROCESSED
            await self.db.commit()
            return SpecificActionResult(
                status="reply",
                bot_id=event.bot_id,
                tg_user_id=event.tg_user_id,
                chat_id=(event.payload or {}).get("chat_id"),
                message_id=(event.payload or {}).get("message_id"),
            )

        bot = await self.db.get(Bot, event.bot_id) if event.bot_id else None
        if not bot:
            logger.warning(f"Не удалось выполнить {action_type} для события {event.id}: бот не найден.")
            return None

        try:
            async with get_bot_session(bot.token) as client:

                if action_type in ("accept", "reject"):
                    channel = (
                        await self.db.get(ChannelGroup, event.channel_id)
                        if event.channel_id else None
                    )
                    if not (channel and channel.telegram_id and event.tg_user_id):
                        return None

                    if action_type == "accept":
                        await client.approve_chat_join_request(
                            chat_id=channel.telegram_id,
                            user_id=event.tg_user_id,
                        )
                        join_state = "accepted"
                    else:
                        await client.decline_chat_join_request(
                            chat_id=channel.telegram_id,
                            user_id=event.tg_user_id,
                        )
                        join_state = "rejected"

                    new_payload = dict(event.payload or {})
                    new_payload["join_state"] = join_state
                    event.payload = new_payload
                    event.status = EventStatus.PROCESSED
                    await self.db.commit()
                    return SpecificActionResult(status=join_state)

                if action_type == "unban":
                    channel = (
                        await self.db.get(ChannelGroup, event.channel_id)
                        if event.channel_id else None
                    )
                    if not (channel and channel.telegram_id and event.tg_user_id):
                        return None

                    if str(channel.telegram_id).startswith("-"):
                        try:
                            await client.restrict_chat_member(
                                chat_id=channel.telegram_id,
                                user_id=event.tg_user_id,
                                permissions=ChatPermissions(
                                    can_send_messages=True,
                                    can_send_audios=True,
                                    can_send_documents=True,
                                    can_send_photos=True,
                                    can_send_videos=True,
                                    can_send_video_notes=True,
                                    can_send_voice_notes=True,
                                    can_send_polls=True,
                                    can_send_other_messages=True,
                                    can_add_web_page_previews=True,
                                    can_change_info=True,
                                    can_invite_users=True,
                                    can_pin_messages=True,
                                    can_manage_topics=True,
                                )
                            )
                        except Exception as e:
                            logger.warning(f"Не удалось снять мут через restrict_chat_member, пробуем unban: {e}")
                            try:
                                await client.unban_chat_member(
                                    chat_id=channel.telegram_id,
                                    user_id=event.tg_user_id,
                                    only_if_banned=True
                                )
                            except Exception as unban_e:
                                logger.error(f"Ошибка при unban_chat_member: {unban_e}")

                    new_payload = dict(event.payload or {})
                    new_payload["is_unbanned"] = True
                    event.payload = new_payload
                    event.status = EventStatus.PROCESSED
                    await self.db.commit()
                    return SpecificActionResult(status="unbanned")

                if action_type == "block":
                    channel = (
                        await self.db.get(ChannelGroup, event.channel_id)
                        if event.channel_id else None
                    )
                    if not (channel and channel.telegram_id and event.tg_user_id):
                        return None

                    if str(channel.telegram_id).startswith("-"):
                        try:
                            await client.ban_chat_member(
                                chat_id=channel.telegram_id,
                                user_id=event.tg_user_id,
                            )
                        except Exception as e:
                            logger.error(f"Не удалось забанить пользователя в канале {channel.telegram_id}: {e}")

                    event.status = EventStatus.PROCESSED
                    await self.db.commit()
                    return SpecificActionResult(status="blocked")

                if action_type == "delete_message":
                    msg_chat_id = (event.payload or {}).get("chat_id")
                    msg_id = (event.payload or {}).get("message_id")
                    if not msg_chat_id or not msg_id:
                        logger.warning(
                            f"delete_message: в payload события {event.id} "
                            f"отсутствует chat_id или message_id"
                        )
                        return None

                    await client.delete_message(
                        chat_id=msg_chat_id,
                        message_id=msg_id,
                    )
                    event.status = EventStatus.PROCESSED
                    await self.db.commit()
                    return SpecificActionResult(status="deleted")

                if action_type == "change_ban":
                    ban_type = payload.get("ban_type", "ban")           # "ban" или "mute"
                    duration_seconds = payload.get("duration_seconds")  # None = навсегда
                    everywhere = payload.get("everywhere", False)

                    if not event.tg_user_id:
                        return None

                    until_date = None
                    if duration_seconds:
                        until_date = datetime.now(timezone.utc) + timedelta(
                            seconds=int(duration_seconds)
                        )

                    if everywhere:
                        stmt = select(ChannelGroup).where(ChannelGroup.owner_id == event.owner_id)
                        result = await self.db.execute(stmt)
                        target_channels = result.scalars().all()
                    else:
                        ch = (
                            await self.db.get(ChannelGroup, event.channel_id)
                            if event.channel_id else None
                        )
                        target_channels = [ch] if (ch and ch.telegram_id) else []

                    affected = []
                    for ch in target_channels:
                        if not ch or not ch.telegram_id:
                            continue
                        try:
                            if ban_type == "mute":
                                if until_date:
                                    await client.restrict_chat_member(
                                        chat_id=ch.telegram_id,
                                        user_id=event.tg_user_id,
                                        permissions=ChatPermissions(can_send_messages=False),
                                        until_date=until_date,
                                    )
                                else:
                                    await client.restrict_chat_member(
                                        chat_id=ch.telegram_id,
                                        user_id=event.tg_user_id,
                                        permissions=ChatPermissions(can_send_messages=False),
                                    )
                            else:
                                if until_date:
                                    await client.ban_chat_member(
                                        chat_id=ch.telegram_id,
                                        user_id=event.tg_user_id,
                                        until_date=until_date,
                                    )
                                else:
                                    await client.ban_chat_member(
                                        chat_id=ch.telegram_id,
                                        user_id=event.tg_user_id,
                                    )
                            affected.append(ch.id)
                        except Exception as e:
                            logger.error(f"Не удалось изменить бан для канала {ch.id}: {e}")

                    new_payload = dict(event.payload or {})
                    new_payload["ban_type"] = ban_type
                    new_payload["duration_seconds"] = duration_seconds
                    new_payload["everywhere"] = everywhere
                    new_payload["is_unbanned"] = False
                    event.payload = new_payload
                    event.status = EventStatus.PROCESSED
                    await self.db.commit()
                    return SpecificActionResult(status="ban_updated", affected_channels=affected)

        except Exception as e:
            logger.error(
                f"Ошибка при выполнении {action_type} для события {event.id}: {e}",
                exc_info=True
            )
            return None

        logger.warning(f"Неизвестный action_type '{action_type}' для события {event.id}.")
        return None
