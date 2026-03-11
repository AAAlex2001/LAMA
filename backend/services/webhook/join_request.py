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

from backend.services.bot import CaptchaService, TriggerService
from backend.services.bot.bot_settings import BotSettingsService
from backend.services.webhook.welcome import WelcomeHandler
from backend.models.bots import (
    Bot as BotModel,
    PendingJoinApproval,
    TriggerType,
    ApprovalMode,
    CaptchaMode,
)
from backend.models.channels import ChatInviteLink, ChannelGroup
from backend.services.webhook.base import get_bot_session
from backend.utils.keyboard import build_keyboard
from backend.services.inbox.action_service import InboxActionService
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus

logger = logging.getLogger(__name__)


class JoinRequestHandler:
    """Обработчик заявок на вступление"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.settings_service = BotSettingsService(db)
        self.trigger_service = TriggerService(db)
        self.welcome_handler = WelcomeHandler(db, bot_model)

    async def process(self, join_request: ChatJoinRequest) -> None:
        """Обработка заявки на вступление"""
        try:
            async with get_bot_session(self.bot_model.token) as telegram_bot:
                user_id = join_request.from_user.id
                chat_id = join_request.chat.id

                # Обновляем метрику invite link, если есть
                if (
                    hasattr(join_request, "invite_link")
                    and join_request.invite_link
                ):
                    await self.update_invite_link_metrics(
                        join_request.invite_link.invite_link
                    )

                await self.trigger_service.fire_event(
                    bot_id=self.bot_model.id,
                    trigger_type=TriggerType.JOIN_REQUEST_CREATED,
                    user_id=user_id,
                    chat_id=chat_id,
                    telegram_bot=telegram_bot,
                    chat_type=join_request.chat.type,
                    context={
                        "username": join_request.from_user.username,
                        "first_name": (
                                    join_request.from_user.first_name
                                ),
                        "chat_title": join_request.chat.title,
                    },
                )

                should_approve, missing = (
                    await self.settings_service.check_approval_criteria(
                        self.bot_model, user_id
                    )
                )

                if not should_approve and missing:
                    pending = PendingJoinApproval(
                        bot_id=self.bot_model.id,
                        user_id=user_id,
                        chat_id=chat_id,
                        missing_channels=missing,
                    )
                    self.db.add(pending)
                    await self.db.commit()

                if self.bot_model.auto_approval_mode == ApprovalMode.MANUAL:
                    captcha_mode = getattr(self.bot_model, "captcha_mode", CaptchaMode.DISABLED)
                    if captcha_mode in (CaptchaMode.JOIN_REQUEST, CaptchaMode.BOTH):
                        await self.handle_manual_mode(telegram_bot, join_request)
                        await self.create_join_event(join_request, status=EventStatus.PROCESSED, join_state="captcha_pending")
                    else:
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
                        chat_id, user_id
                    )
                    if approved:
                        await self.trigger_service.fire_event(
                            bot_id=self.bot_model.id,
                            trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                            user_id=user_id,
                            chat_id=chat_id,
                            telegram_bot=telegram_bot,
                            chat_type=join_request.chat.type,
                            context={
                                "username": join_request.from_user.username,
                                "first_name": (
                                    join_request.from_user.first_name
                                ),
                            },
                        )
                        await self.create_join_event(
                            join_request,
                            status=EventStatus.PROCESSED,
                            join_state="auto_approved",
                        )

        except Exception as e:
            logger.error(f"Join request error: {e}", exc_info=True)

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
            captcha_service = CaptchaService(self.db)
            question, answer = captcha_service.generate()

            pending = await captcha_service.create_pending(
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
                category = InboxCategory.SYSTEM
            else:
                category = InboxCategory.MODERATION

            inbox_service = InboxActionService(self.db)
            await inbox_service.create_event({
                "owner_id": self.bot_model.owner_id,
                "category": category,
                "entity_type": EntityType.CHANNEL,
                "event_type": EventType.CHANNEL_JOIN_REQUEST,
                "bot_id": self.bot_model.id,
                "channel_id": channel_id,
                "tg_user_id": join_request.from_user.id,
                "tg_username": join_request.from_user.username,
                "status": status,
                "description": (
                    f"Заявка от @{join_request.from_user.username or join_request.from_user.id} "
                    f"на вступление в {join_request.chat.title}"
                ),
                "payload": {
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
            })
        except Exception as e:
            logger.error(f"Failed to create join_request inbox event: {e}", exc_info=True)

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
            await self.db.commit()
            logger.info(
                f"Обновлена метрика для invite link: {invite_link_url}"
            )
        except Exception as e:
            logger.warning(f"Не удалось обновить метрику invite link: {e}")

    async def approve_join_request(self, chat_id: int, user_id: int) -> bool:
        """Одобрить заявку на вступление"""
        try:
            async with get_bot_session(self.bot_model.token) as telegram_bot:
                await telegram_bot.approve_chat_join_request(
                    chat_id=chat_id, user_id=user_id
                )
                logger.info(f"Approved join request: user={user_id}, chat={chat_id}")
                return True
        except TelegramAPIError as e:
            logger.warning(f"Approve join request failed: {e}")
            return False
