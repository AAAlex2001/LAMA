"""
Обработчик заявок на вступление
"""

import logging
import random

from aiogram.types import (
    ChatJoinRequest,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
)
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot.features.captcha.create_pending import CreatePendingApproval
from backend.services.bot.features.captcha.generate_captcha import generate_captcha
from backend.services.bot.features.settings.check_approval_criteria import check_approval_criteria
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent
from backend.services.webhook.welcome import WelcomeHandler
from backend.models.bots import (
    Bot as BotModel,
    PendingJoinApproval,
    TriggerType,
    ApprovalMode,
    CaptchaMode,
    MessageType,
)
from backend.models.channels import ChatInviteLink, ChannelGroup
from backend.services.bot_provider import resolve_by_token
from backend.utils.keyboard import build_keyboard
from backend.services.direct.features.messages.save_outgoing_message import SaveOutgoingMessage
from backend.services.inbox.features.create_event import CreateInboxEvent
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus
from backend.schemas.inbox.events import InboxEventCreate

logger = logging.getLogger(__name__)


class JoinRequestHandler:
    """Обработчик заявок на вступление"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.fire_trigger_event = FireTriggerEvent(db)
        self.welcome_handler = WelcomeHandler(db, bot_model)

    async def process(self, join_request: ChatJoinRequest) -> None:
        """Обработка заявки на вступление"""
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            user_id = join_request.from_user.id
            chat_id = join_request.chat.id

            if hasattr(join_request, "invite_link") and join_request.invite_link:
                await self.update_invite_link_metrics(join_request.invite_link.invite_link)

            await self.fire_trigger_event.execute(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.JOIN_REQUEST_CREATED,
                user_id=user_id,
                chat_id=chat_id,
                telegram_bot=telegram_bot,
                chat_type=join_request.chat.type,
                context={
                    "username": join_request.from_user.username,
                    "first_name": join_request.from_user.first_name,
                    "chat_title": join_request.chat.title,
                },
            )

            db_link = await self.get_db_link(join_request)

            if db_link and db_link.protection_type == "captcha":
                captcha_mode = getattr(self.bot_model, "captcha_mode", CaptchaMode.DISABLED)
                if captcha_mode in (CaptchaMode.JOIN_REQUEST, CaptchaMode.BOTH):
                    await self.handle_manual_mode(telegram_bot, join_request)
                    await self.create_join_event(join_request, status=EventStatus.PROCESSED, join_state="captcha_pending")
                    return

            should_approve, missing = (
                await check_approval_criteria(
                    self.bot_model, user_id
                )
            )
            missing = [ch for ch in missing if ch != chat_id]

            if not should_approve and missing:
                pending = PendingJoinApproval(
                    bot_id=self.bot_model.id,
                    user_id=user_id,
                    chat_id=chat_id,
                    missing_channels=missing,
                )
                self.db.add(pending)
                await self.db.flush()

            if self.bot_model.auto_approval_mode == ApprovalMode.MANUAL:
                await self.notify_pending(telegram_bot, user_id, join_request.chat.title)
                await self.create_join_event(join_request, status=EventStatus.NEW)
                return

            elif (
                self.bot_model.auto_approval_mode == ApprovalMode.CRITERIA
                and not should_approve
            ):
                if missing:
                    await self.send_subscription_requirements(
                        telegram_bot, user_id, missing
                    )
                return

            if should_approve:
                approved = await self.approve_join_request(
                    telegram_bot, chat_id, user_id
                )
                if approved:
                    if hasattr(join_request, "invite_link") and join_request.invite_link:
                        await self.increment_member_count(join_request.invite_link.invite_link)
                    await self.fire_trigger_event.execute(
                        bot_id=self.bot_model.id,
                        trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                        user_id=user_id,
                        chat_id=chat_id,
                        telegram_bot=telegram_bot,
                        chat_type=join_request.chat.type,
                        context={
                            "username": join_request.from_user.username,
                            "first_name": join_request.from_user.first_name,
                        },
                    )
                    await self.create_join_event(
                        join_request,
                        status=EventStatus.PROCESSED,
                        join_state="accepted",
                    )

        except Exception as e:
            logger.error(f"Join request error: {e}", exc_info=True)

    async def get_db_link(self, join_request: ChatJoinRequest) -> ChatInviteLink | None:
        if not (hasattr(join_request, "invite_link") and join_request.invite_link):
            return None
        result = await self.db.execute(
            select(ChatInviteLink).where(ChatInviteLink.invite_link == join_request.invite_link.invite_link)
        )
        return result.scalar_one_or_none()

    async def notify_pending(self, telegram_bot, user_id: int, chat_title: str) -> None:
        try:
            tg_message = await telegram_bot.send_message(
                chat_id=user_id,
                text=(
                    f"📩 Ваша заявка на вступление в «{chat_title}» отправлена.\n"
                    f"Ожидайте одобрения администратором."
                ),
            )
            if tg_message:
                await SaveOutgoingMessage(self.db).execute(
                    bot_id=self.bot_model.id,
                    tg_chat_id=user_id,
                    tg_message=tg_message,
                    fallback_type=MessageType.TEXT,
                    fallback_media_url=None,
                )
                await self.db.flush()
        except TelegramAPIError as e:
            logger.warning(f"Failed to send pending message: {e}")

    async def handle_manual_mode(
        self, telegram_bot, join_request: ChatJoinRequest
    ) -> None:
        """Обработка MANUAL режима - отправка капчи в ЛС."""
        captcha_mode = getattr(
            self.bot_model, "captcha_mode", CaptchaMode.DISABLED
        )

        logger.info(f"handle_manual_mode: captcha_mode={captcha_mode}")

        if captcha_mode not in (CaptchaMode.JOIN_REQUEST, CaptchaMode.BOTH):
            logger.info(
                f"Captcha disabled for JOIN_REQUEST, mode={captcha_mode}"
            )
            return

        logger.info("Sending captcha to user...")

        try:
            question, answer = generate_captcha()

            pending = await CreatePendingApproval(self.db).execute(
                bot_id=self.bot_model.id,
                user_id=join_request.from_user.id,
                chat_id=join_request.chat.id,
                question=question,
                answer=answer,
            )

            correct = int(answer)
            options = {correct}
            while len(options) < 3:
                options.add(correct + random.randint(1, 4))

            options_list = list(options)
            random.shuffle(options_list)

            buttons_data = [
                [
                    {
                        "text": str(opt),
                        "callback_data": f"captcha_{pending.id}_{opt}",
                    }
                ]
                for opt in options_list
            ]

            await telegram_bot.send_message(
                chat_id=join_request.from_user.id,
                text=question,
                reply_markup=build_keyboard(buttons_data),
            )
            logger.info(f"Captcha sent to {join_request.from_user.id}")

        except TelegramAPIError as e:
            logger.warning(f"Captcha send failed: {e}")

    async def send_subscription_requirements(
        self, telegram_bot, user_id: int, missing_channels: list[int]
    ) -> None:
        """Отправить требования по подписке"""
        try:
            message_text = "📢 Для вступления подпишитесь на каналы:\n\n"
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
                    logger.warning("Failed to get channel info", exc_info=True)
                    message_text += f"{idx}. Канал ID: {channel_id}\n"

            await telegram_bot.send_message(
                chat_id=user_id,
                text=message_text,
                reply_markup=(
                    InlineKeyboardMarkup(inline_keyboard=buttons)
                    if buttons
                    else None
                ),
            )

        except TelegramAPIError as e:
            logger.warning(f"Subscription requirements send failed: {e}")

    async def create_join_event(
        self,
        join_request: ChatJoinRequest,
        status: EventStatus = EventStatus.NEW,
        join_state: str = "pending",
    ) -> None:
        """Создать событие CHANNEL_JOIN_REQUEST в инбоксе."""
        try:
            channel = await get_channel_by_telegram_id(self.db, join_request.chat.id)
            channel_id = channel.id if channel else None

            link_id = None
            link_name = None
            requires_approval = True
            if hasattr(join_request, "invite_link") and join_request.invite_link:
                tg_link_url = join_request.invite_link.invite_link
                link_result = await self.db.execute(
                    select(ChatInviteLink).where(ChatInviteLink.invite_link == tg_link_url)
                )
                db_link = link_result.scalar_one_or_none()
                if db_link:
                    link_id = db_link.id
                    link_name = db_link.name
                    requires_approval = db_link.creates_join_request

            if join_state in ("captcha_pending", "auto_approved") or not requires_approval:
                category = InboxCategory.MODERATION
            else:
                category = InboxCategory.MODERATION

            event_service = CreateInboxEvent(self.db)
            await event_service.execute(InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=category,
                entity_type=EntityType.CHANNEL,
                event_type=EventType.CHANNEL_JOIN_REQUEST,
                bot_id=self.bot_model.id,
                channel_id=channel_id,
                tg_user_id=join_request.from_user.id,
                tg_username=join_request.from_user.username,
                status=status,
                description=(
                    f"Заявка от @{join_request.from_user.username or join_request.from_user.id} "
                    f"на вступление в {join_request.chat.title}"
                ),
                payload={
                    "join_state": join_state,
                    "requires_approval": requires_approval,
                    "link_id": link_id,
                    "link_name": link_name,
                    "link_url": join_request.invite_link.invite_link if (
                        hasattr(join_request, "invite_link") and join_request.invite_link
                    ) else None,
                    "chat_title": join_request.chat.title,
                    "first_name": join_request.from_user.first_name,
                },
            ))
        except Exception as e:
            logger.error(f"Failed to create join_request inbox event: {e}", exc_info=True)

    async def increment_member_count(self, invite_link_url: str) -> None:
        """Инкрементировать member_count ссылки при одобрении заявки."""
        try:
            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == invite_link_url)
                .values(member_count=ChatInviteLink.member_count + 1)
            )
            result = await self.db.execute(stmt)
            if result.rowcount > 0:
                await self.db.flush()
                logger.info(f"Incremented member_count for {invite_link_url}")
        except Exception as e:
            logger.error(f"Failed to increment member_count: {e}")

    async def update_invite_link_metrics(self, invite_link_url: str) -> None:
        """Обновить метрику pending_join_request_count для invite link"""
        try:
            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == invite_link_url)
                .values(
                    pending_join_request_count=(
                        ChatInviteLink.pending_join_request_count + 1
                    )
                )
            )
            await self.db.execute(stmt)
            await self.db.flush()
            logger.info(
                f"Обновлена метрика для invite link: {invite_link_url}"
            )
        except Exception as e:
            logger.warning(f"Не удалось обновить метрику invite link: {e}")

    async def approve_join_request(self, telegram_bot, chat_id: int, user_id: int) -> bool:
        try:
            await telegram_bot.approve_chat_join_request(
                chat_id=chat_id, user_id=user_id
            )
            logger.info(f"Approved join request: user={user_id}, chat={chat_id}")
            return True
        except TelegramAPIError as e:
            logger.warning(f"Approve join request failed: {e}")
            return False
