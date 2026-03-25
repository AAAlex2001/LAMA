"""
Обработчик подписок на каналы
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from aiogram.types import ChatMemberUpdated, ChatPermissions, InlineKeyboardButton, InlineKeyboardMarkup, Message
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.models.channels import ChatInviteLink, ChannelGroup
from backend.models.bots import (
    Bot as BotModel,
    PendingJoinApproval,
    ApprovalMode,
    TriggerType,
)
from backend.schemas.inbox.enums import (
    InboxCategory,
    EntityType,
    EventType,
    EventStatus,
)
from backend.services.bot import TriggerService
from backend.services.bot.bot_settings import BotSettingsService
from backend.services.inbox.action_service import InboxActionService
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.base import TELEGRAM_API_TIMEOUT
from backend.services.webhook.messages.members import MemberProcessor

logger = logging.getLogger(__name__)


class SubscriptionHandler:
    """Обработчик событий изменения статуса участника (ChatMemberUpdated)."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.trigger_service = TriggerService(db)

    async def process(self, chat_member: ChatMemberUpdated) -> None:
        """
        Обработка события обновления статуса пользователя в чате.
        Учитывает новые входы через пригласительные ссылки и одобряет отложенные подписки.
        """
        new_status = chat_member.new_chat_member.status
        old_status = chat_member.old_chat_member.status
        user_id = chat_member.from_user.id
        chat_id = chat_member.chat.id

        if user_id == self.bot_model.telegram_id:
            return

        logger.info(
            f"Subscription change: user={user_id} chat={chat_id} "
            f"status: {old_status} -> {new_status} "
            f"invite_link={chat_member.invite_link!r}"
        )

        # Проверяем, был ли участник уже активен до этого события (учитывая restricted is_member)
        old_is_active = old_status in ("member", "administrator", "creator") or (
            old_status == "restricted" and getattr(chat_member.old_chat_member, "is_member", False)
        )

        new_is_member = new_status in ("member", "administrator", "creator") or (
            new_status == "restricted" and getattr(chat_member.new_chat_member, "is_member", False)
        )

        is_new_join = new_is_member and not old_is_active

        if not is_new_join:
            return

        await self.update_member_count(chat_member)

        channel = await get_channel_by_telegram_id(
            self.db, chat_id, bot_id=self.bot_model.id
        )
        channel_db_id = channel.id if channel else None

        if await self.has_recent_join_event(user_id, channel_db_id):
            logger.debug(
                f"Skipping duplicate join processing: user={user_id}, channel={channel_db_id}"
            )
            return

        if channel and channel.captcha_enabled and chat_member.chat.type == "supergroup":
            await self.send_captcha(chat_member, channel)
            return

        if (
            chat_member.chat.type == "supergroup"
            and self.bot_model.auto_approval_mode == ApprovalMode.CRITERIA
        ):
            settings_service = BotSettingsService(self.db)
            should_approve, missing = await settings_service.check_approval_criteria(
                self.bot_model, user_id,
            )
            if not should_approve and missing:
                await self.restrict_for_subscription(chat_member, missing)
                return

        is_direct_link_join = (
            chat_member.invite_link is None
            or not getattr(chat_member.invite_link, "creates_join_request", False)
        )

        if is_direct_link_join:
            link_val = chat_member.invite_link.invite_link if chat_member.invite_link else None
            await self.create_link_join_event(chat_member, link_val)
            telegram_bot = resolve_by_token(self.bot_model.token)
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.JOIN_REQUEST_CREATED,
                user_id=user_id,
                chat_id=chat_id,
                telegram_bot=telegram_bot,
                chat_type=chat_member.chat.type,
                context={
                    "username": chat_member.from_user.username,
                    "first_name": chat_member.from_user.first_name,
                    "chat_title": chat_member.chat.title,
                    "link_url": link_val,
                },
            )
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                user_id=user_id,
                chat_id=chat_id,
                telegram_bot=telegram_bot,
                chat_type=chat_member.chat.type,
                context={
                    "username": chat_member.from_user.username,
                    "first_name": chat_member.from_user.first_name,
                    "chat_title": chat_member.chat.title,
                    "auto_approved": True,
                    "link_url": link_val,
                },
            )
        else:
            await self.mark_join_event_accepted(user_id, chat_id)

        await self.handle_subscription(chat_member, user_id, chat_id)

    async def update_member_count(self, chat_member: ChatMemberUpdated) -> None:
        """
        Обновляет счетчик member_count инвайт-ссылки.
        Ссылка берется напрямую из события Telegram или из InboxEvent в качестве fallback.
        """
        user_id = chat_member.from_user.id
        chat_id = chat_member.chat.id
        invite_link_url = chat_member.invite_link.invite_link if chat_member.invite_link else None

        if not invite_link_url:
            invite_link_url = await self.find_link_url_from_inbox(user_id, chat_id)
            if not invite_link_url:
                logger.debug(f"Invite link not found for user={user_id}, chat={chat_id}")
                return

        try:
            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == invite_link_url)
                .values(member_count=ChatInviteLink.member_count + 1)
                .execution_options(synchronize_session=False)
            )
            result = await self.db.execute(stmt)
            if result.rowcount > 0:
                await self.db.flush()
                logger.info(f"Incremented member_count for link {invite_link_url}")
                await self.check_and_revoke_link(invite_link_url, chat_id)
            else:
                logger.warning(f"Link not found in DB for counter update: {invite_link_url}")
        except Exception as e:
            logger.error(f"Failed to increment member_count for {invite_link_url}: {e}")

    async def check_and_revoke_link(self, invite_link_url: str, chat_id: int) -> None:
        """Автоотзыв ссылки при достижении лимита."""
        try:
            result = await self.db.execute(
                select(ChatInviteLink).where(
                    ChatInviteLink.invite_link == invite_link_url
                )
            )
            link = result.scalar_one_or_none()
            if not link or not link.member_limit:
                return
            if link.member_count >= link.member_limit and not link.is_revoked:
                bot = resolve_by_token(self.bot_model.token)
                try:
                    await bot.revoke_chat_invite_link(
                        chat_id=chat_id,
                        invite_link=invite_link_url,
                    )
                except TelegramAPIError as e:
                    logger.warning(f"Failed to revoke link via Telegram: {e}")
                link.is_revoked = True
                await self.db.flush()
                logger.info(
                    f"Auto-revoked link {invite_link_url}: "
                    f"count={link.member_count}, limit={link.member_limit}"
                )
        except Exception as e:
            logger.error(f"check_and_revoke_link failed: {e}")

    async def create_link_join_event(
        self, chat_member: ChatMemberUpdated, link_url: str | None
    ) -> None:
        """Создать InboxEvent для вступления по открытой ссылке (автопринятие)."""
        try:
            channel = await get_channel_by_telegram_id(
                self.db, chat_member.chat.id, bot_id=self.bot_model.id
            )
            channel_id = channel.id if channel else None

            link_id = None
            link_name = None
            if link_url:
                result = await self.db.execute(
                    select(ChatInviteLink).where(
                        ChatInviteLink.invite_link == link_url
                    )
                )
                db_link = result.scalar_one_or_none()
                if db_link:
                    link_id = db_link.id
                    link_name = db_link.name

            inbox_service = InboxActionService(self.db)
            await inbox_service.create_event({
                "owner_id": self.bot_model.owner_id,
                "category": InboxCategory.MODERATION,
                "entity_type": EntityType.CHANNEL,
                "event_type": EventType.CHANNEL_JOIN_REQUEST,
                "bot_id": self.bot_model.id,
                "channel_id": channel_id,
                "tg_user_id": chat_member.from_user.id,
                "tg_username": chat_member.from_user.username,
                "status": EventStatus.PROCESSED,
                "description": (
                    f"@{chat_member.from_user.username or chat_member.from_user.id} "
                    f"вступил в {chat_member.chat.title}"
                ),
                "payload": {
                    "join_state": "accepted",
                    "requires_approval": False,
                    "link_id": link_id,
                    "link_name": link_name,
                    "link_url": link_url,
                    "chat_title": chat_member.chat.title,
                    "first_name": chat_member.from_user.first_name,
                },
            })
        except Exception as e:
            logger.error(f"Failed to create link_join inbox event: {e}", exc_info=True)

    async def has_recent_join_event(self, user_id: int, channel_id: int | None) -> bool:
        """Проверить, есть ли недавнее событие вступления для этого пользователя в канал."""
        if not channel_id:
            return False
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=2)
            result = await self.db.execute(
                select(InboxEvent.id)
                .where(
                    InboxEvent.tg_user_id == user_id,
                    InboxEvent.channel_id == channel_id,
                    InboxEvent.event_type == EventType.CHANNEL_JOIN_REQUEST,
                    InboxEvent.created_at >= cutoff,
                )
                .limit(1)
            )
            return result.scalar_one_or_none() is not None
        except Exception as e:
            logger.error(f"has_recent_join_event failed: {e}")
            return False

    async def find_link_url_from_inbox(self, user_id: int, telegram_chat_id: int) -> str | None:
        """Ищет URL инвайт-ссылки в последних InboxEvent для заданного пользователя и чата."""
        try:
            channel_result = await self.db.execute(
                select(ChannelGroup.id).where(ChannelGroup.telegram_id == telegram_chat_id)
            )
            channel_id = channel_result.scalar_one_or_none()
            if not channel_id:
                return None

            result = await self.db.execute(
                select(InboxEvent)
                .where(
                    InboxEvent.tg_user_id == user_id,
                    InboxEvent.channel_id == channel_id,
                    InboxEvent.event_type == EventType.CHANNEL_JOIN_REQUEST,
                )
                .order_by(InboxEvent.id.desc())
                .limit(1)
            )
            event = result.scalar_one_or_none()
            if event and event.payload:
                return event.payload.get("link_url")
        except Exception as e:
            logger.error(f"find_link_url_from_inbox failed: {e}")
        return None

    async def handle_subscription(
        self, chat_member: ChatMemberUpdated, user_id: int, channel_id: int
    ) -> None:
        """Обработка подписки на канал"""
        try:
            query = select(PendingJoinApproval).where(
                PendingJoinApproval.user_id == user_id
            )
            result = await self.db.execute(query)
            pendings = list(result.scalars().all())

            if not pendings:
                return

            approved_pendings = []

            for pending in pendings:
                if channel_id not in pending.missing_channels:
                    continue

                pending.missing_channels.remove(channel_id)

                if not pending.missing_channels:
                    approved_pendings.append(pending)

            if approved_pendings:
                telegram_bot = resolve_by_token(
                    self.bot_model.token
                )
                for pending in approved_pendings:
                    try:
                        await telegram_bot.restrict_chat_member(
                            chat_id=pending.chat_id,
                            user_id=pending.user_id,
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
                                can_invite_users=True,
                            ),
                            use_independent_chat_permissions=True,
                        )
                    except TelegramAPIError as e:
                        logger.warning(
                            f"Failed to unrestrict user {pending.user_id}: {e}"
                        )

                    try:
                        await asyncio.wait_for(
                            telegram_bot.approve_chat_join_request(
                                chat_id=pending.chat_id,
                                user_id=pending.user_id,
                            ),
                            timeout=TELEGRAM_API_TIMEOUT,
                        )
                    except (TelegramAPIError, asyncio.TimeoutError) as e:
                        logger.info(
                            "approve_chat_join_request skipped for user %s in chat %s: %s",
                            pending.user_id, pending.chat_id, e,
                        )

                    await self.trigger_service.fire_event(
                        bot_id=self.bot_model.id,
                        trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                        user_id=pending.user_id,
                        chat_id=pending.chat_id,
                        telegram_bot=telegram_bot,
                        chat_type=chat_member.chat.type,
                        context={
                            "auto_approved": True,
                            "channel_id": channel_id,
                        },
                    )

                    await self.mark_join_event_accepted(pending.user_id, pending.chat_id)
                    await self.db.delete(pending)

            await self.db.flush()

        except Exception as e:
            logger.error(f"Subscription processing error: {e}", exc_info=True)

    async def mark_join_event_accepted(self, user_id: int, chat_id: int) -> None:
        """Помечает последний InboxEvent заявки пользователя как принятую."""
        try:
            channel_result = await self.db.execute(
                select(ChannelGroup.id).where(ChannelGroup.telegram_id == chat_id)
            )
            channel_id = channel_result.scalar_one_or_none()
            if not channel_id:
                return

            result = await self.db.execute(
                select(InboxEvent)
                .where(
                    InboxEvent.tg_user_id == user_id,
                    InboxEvent.channel_id == channel_id,
                    InboxEvent.event_type == EventType.CHANNEL_JOIN_REQUEST,
                )
                .order_by(InboxEvent.id.desc())
                .limit(1)
            )
            event = result.scalar_one_or_none()
            if event:
                new_payload = dict(event.payload or {})
                new_payload["join_state"] = "accepted"
                event.payload = new_payload
                event.status = EventStatus.PROCESSED
                await self.db.flush()
        except Exception as e:
            logger.error(f"mark_join_event_accepted failed: {e}")

    async def send_captcha(
        self, chat_member: ChatMemberUpdated, channel: ChannelGroup
    ) -> None:
        """Отправить капчу для нового участника в публичной группе (chat_member update)."""
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            processor = MemberProcessor(self.db, self.bot_model, telegram_bot)
            fake_message = Message(
                message_id=0,
                date=chat_member.date,
                chat=chat_member.chat,
            )
            await processor.send_group_captcha(
                fake_message, chat_member.from_user, channel
            )
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.MEMBER_JOINED,
                user_id=chat_member.from_user.id,
                chat_id=chat_member.chat.id,
                telegram_bot=telegram_bot,
                chat_type=chat_member.chat.type,
                context={
                    "username": chat_member.from_user.username,
                    "first_name": chat_member.from_user.first_name,
                    "last_name": chat_member.from_user.last_name,
                },
            )
        except Exception as e:
            logger.error(f"Failed to send captcha via chat_member: {e}", exc_info=True)

    async def restrict_for_subscription(
        self, chat_member: ChatMemberUpdated, missing_channels: list[int],
    ) -> None:
        """Restrict пользователя и сообщить о необходимых подписках (public supergroups)."""
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            chat_id = chat_member.chat.id
            user_id = chat_member.from_user.id

            try:
                await telegram_bot.restrict_chat_member(
                    chat_id=chat_id,
                    user_id=user_id,
                    permissions=ChatPermissions(
                        can_send_messages=False,
                        can_send_audios=False,
                        can_send_documents=False,
                        can_send_photos=False,
                        can_send_videos=False,
                        can_send_video_notes=False,
                        can_send_voice_notes=False,
                        can_send_polls=False,
                        can_send_other_messages=False,
                        can_add_web_page_previews=False,
                    ),
                    use_independent_chat_permissions=True,
                )
            except TelegramAPIError as e:
                logger.error(f"Failed to restrict user {user_id} for subscription: {e}")

            pending = PendingJoinApproval(
                bot_id=self.bot_model.id,
                user_id=user_id,
                chat_id=chat_id,
                missing_channels=missing_channels,
            )
            self.db.add(pending)
            await self.db.flush()

            first_name = chat_member.from_user.first_name or "Пользователь"
            message_text = f"📢 {first_name}, для участия подпишитесь на каналы:\n\n"
            buttons = []

            for idx, channel_id in enumerate(missing_channels, 1):
                try:
                    chat = await telegram_bot.get_chat(channel_id)
                    title = chat.title or f"Канал {idx}"
                    if chat.username:
                        url = f"https://t.me/{chat.username}"
                        message_text += f"{idx}. {title}\n"
                        buttons.append(
                            [InlineKeyboardButton(text=f"📢 {title}", url=url)]
                        )
                    else:
                        message_text += f"{idx}. {title} (приватный)\n"
                except TelegramAPIError:
                    logger.warning(f"Failed to get channel info for {channel_id}")
                    message_text += f"{idx}. Канал ID: {channel_id}\n"

            message_text += "\nПосле подписки ограничения будут сняты автоматически."

            await telegram_bot.send_message(
                chat_id=chat_id,
                text=message_text,
                reply_markup=(
                    InlineKeyboardMarkup(inline_keyboard=buttons)
                    if buttons
                    else None
                ),
            )

        except Exception as e:
            logger.error(f"restrict_for_subscription failed: {e}", exc_info=True)
