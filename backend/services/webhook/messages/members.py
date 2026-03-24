import asyncio
import logging
import random

from aiogram.types import Message, ChatPermissions
from aiogram.exceptions import TelegramAPIError
from aiogram import Bot
from backend.services.telegram_client import RateLimitedBot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal

from backend.services.bot import CaptchaService, TriggerService
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.bot_provider import get_bot_info
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.welcome import WelcomeHandler
from backend.models.bots import (
    Bot as BotModel,
    TriggerType,
    CaptchaMode,
    PendingApproval,
)
from backend.models.channels import CaptchaFailAction
from backend.utils import build_keyboard

logger = logging.getLogger(__name__)


class MemberProcessor:
    def __init__(
        self, db: AsyncSession, bot_model: BotModel, telegram_bot: RateLimitedBot
    ):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.trigger_service = TriggerService(db)
        self.welcome_handler = WelcomeHandler(db, bot_model)

    async def handle_new_members(self, message: Message) -> None:
        """Обработка добавления новых участников - триггер MEMBER_JOINED"""
        try:
            bot_info = await get_bot_info(self.bot_model.token)
            bot_id = bot_info.id
        except Exception as e:
            logger.error(f"Failed to get bot info: {e}", exc_info=True)
            bot_id = None

        if not message.new_chat_members:
            return

        channel = await get_channel_by_telegram_id(self.db, message.chat.id)

        for new_member in message.new_chat_members:
            if bot_id and new_member.id == bot_id:
                logger.info(f"Skipping captcha for bot itself (id={bot_id})")
                continue

            if channel and channel.captcha_enabled:
                await self.send_group_captcha(message, new_member, channel)
            else:
                captcha_mode = getattr(
                    self.bot_model, "captcha_mode", CaptchaMode.DISABLED)
                if captcha_mode in (CaptchaMode.AFTER_JOIN, CaptchaMode.BOTH):
                    await self.send_group_captcha(message, new_member)
                else:
                    await self.welcome_handler.handle_new_member(
                        message, new_member
                    )

            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.MEMBER_JOINED,
                user_id=new_member.id,
                chat_id=message.chat.id,
                telegram_bot=self.telegram_bot,
                chat_type=message.chat.type if message.chat else None,
                context={
                    "username": new_member.username,
                    "first_name": new_member.first_name,
                    "last_name": new_member.last_name,
                }
            )

    async def send_group_captcha(self, message: Message, new_member, channel=None) -> None:
        """Отправить капчу в группе после вступления."""
        try:
            captcha_service = CaptchaService(self.db)
            question, answer = captcha_service.generate()
            pending = await captcha_service.create_pending(
                bot_id=self.bot_model.id,
                user_id=new_member.id,
                chat_id=message.chat.id,
                question=question,
                answer=answer,
            )

            restriction = self._build_captcha_restriction(channel)
            try:
                await self.telegram_bot.restrict_chat_member(
                    chat_id=message.chat.id,
                    user_id=new_member.id,
                    permissions=restriction,
                )
            except Exception as e:
                logger.error(
                    f"Failed to restrict member {new_member.id}: {e}",
                    exc_info=True
                )

            correct = int(answer)
            options = {correct}
            while len(options) < 3:
                options.add(correct + random.randint(-5, 5))
                if len(options) >= 10:
                    break

            options_list = list(options)[:3]
            random.shuffle(options_list)

            buttons_data = [[{
                "text": str(opt),
                "callback_data": f"group_captcha_{pending.id}_{opt}"
            }] for opt in options_list]

            if channel:
                timeout_seconds = channel.captcha_timeout_seconds or 30
            else:
                timeout_seconds = getattr(
                    self.bot_model, "captcha_timeout_seconds", 10)

            shortcode_context = {
                "user": {
                    "first_name": new_member.first_name or "",
                    "username": new_member.username or "",
                    "last_name": new_member.last_name or "",
                    "id": new_member.id,
                },
            }

            custom_before = channel.captcha_message_before if channel else None
            if custom_before:
                captcha_text = ShortcodeProcessor.process(custom_before, shortcode_context)
                captcha_text += f"\n\n{question}"
            else:
                captcha_text = (
                    f"⚠️ {new_member.first_name}, реши капчу за "
                    f"{timeout_seconds} секунд, иначе будешь удалён!\n\n"
                    f"{question}"
                )

            captcha_message = await self.telegram_bot.send_message(
                chat_id=message.chat.id,
                text=captcha_text,
                reply_markup=build_keyboard(buttons_data),
            )

            asyncio.create_task(
                self.captcha_timeout_kick(
                    chat_id=message.chat.id,
                    user_id=new_member.id,
                    captcha_message_id=captcha_message.message_id,
                    pending_id=pending.id,
                    timeout_seconds=timeout_seconds,
                    channel=channel,
                    shortcode_context=shortcode_context,
                )
            )

        except Exception as e:
            logger.error(f"Failed to send group captcha: {e}", exc_info=True)

    def _build_captcha_restriction(self, channel=None) -> ChatPermissions:
        """Построить ограничения на основе captcha_restriction_type канала."""
        restriction_type = channel.captcha_restriction_type if channel else None

        if restriction_type == "send_media":
            return ChatPermissions(
                can_send_messages=True,
                can_send_photos=False,
                can_send_videos=False,
                can_send_video_notes=False,
                can_send_voice_notes=False,
                can_send_audios=False,
                can_send_documents=False,
                can_send_other_messages=False,
                can_add_web_page_previews=False,
            )
        elif restriction_type == "full":
            return ChatPermissions(
                can_send_messages=False,
                can_send_photos=False,
                can_send_videos=False,
                can_send_video_notes=False,
                can_send_voice_notes=False,
                can_send_audios=False,
                can_send_documents=False,
                can_send_other_messages=False,
                can_send_polls=False,
                can_add_web_page_previews=False,
                can_invite_users=False,
            )
        else:
            return ChatPermissions(
                can_send_messages=False,
                can_send_other_messages=False,
                can_add_web_page_previews=False,
            )

    async def captcha_timeout_kick(
        self,
        chat_id: int,
        user_id: int,
        captcha_message_id: int,
        pending_id: int,
        timeout_seconds: int,
        channel=None,
        shortcode_context=None,
    ) -> None:
        """Таймаут проверки капчи. Пробуждается в фоне через N секунд."""
        await asyncio.sleep(timeout_seconds + 1)

        try:
            async with AsyncSessionLocal() as db:
                query = select(PendingApproval).where(
                    PendingApproval.id == pending_id)
                result = await db.execute(query)
                pending = result.scalar_one_or_none()

                if not pending or pending.is_approved:
                    try:
                        await self.telegram_bot.delete_message(
                            chat_id=chat_id, message_id=captcha_message_id
                        )
                    except TelegramAPIError as e:
                        logger.warning(
                            f"Failed to delete captcha message: {e}", exc_info=True
                        )
                    return

                fail_action = CaptchaFailAction.KICK
                fail_duration = None
                fail_text = None
                if channel:
                    fail_action = channel.captcha_fail_action or CaptchaFailAction.KICK
                    fail_duration = channel.captcha_fail_duration_seconds
                    fail_text = channel.captcha_message_fail

                try:
                    await self._apply_fail_action(
                        chat_id, user_id, fail_action, fail_duration
                    )
                    await self.telegram_bot.delete_message(
                        chat_id=chat_id, message_id=captcha_message_id
                    )
                except TelegramAPIError as e:
                    logger.warning(f"Failed to apply captcha fail action for user {user_id}: {e}")

                if fail_text and shortcode_context:
                    try:
                        text = ShortcodeProcessor.process(fail_text, shortcode_context)
                        msg = await self.telegram_bot.send_message(
                            chat_id=chat_id, text=text
                        )
                        await asyncio.sleep(10)
                        await self.telegram_bot.delete_message(
                            chat_id=chat_id, message_id=msg.message_id
                        )
                    except TelegramAPIError:
                        pass

        except Exception as e:
            logger.error(f"Captcha timeout check failed: {e}")

    async def _apply_fail_action(
        self,
        chat_id: int,
        user_id: int,
        action: CaptchaFailAction,
        duration_seconds: int | None,
    ) -> None:
        """Применить действие при провале капчи."""
        from datetime import datetime, timezone, timedelta

        if action == CaptchaFailAction.MUTE:
            until = None
            if duration_seconds:
                until = datetime.now(timezone.utc) + timedelta(seconds=duration_seconds)
            await self.telegram_bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=ChatPermissions(
                    can_send_messages=False,
                    can_send_other_messages=False,
                    can_add_web_page_previews=False,
                ),
                until_date=until,
            )
        elif action == CaptchaFailAction.BAN:
            until = None
            if duration_seconds:
                until = datetime.now(timezone.utc) + timedelta(seconds=duration_seconds)
            await self.telegram_bot.ban_chat_member(
                chat_id=chat_id, user_id=user_id, until_date=until
            )
        else:
            await self.telegram_bot.ban_chat_member(
                chat_id=chat_id, user_id=user_id
            )
            await self.telegram_bot.unban_chat_member(
                chat_id=chat_id, user_id=user_id
            )

    async def handle_member_left(self, message: Message) -> None:
        """Обработка ухода участника - триггер MEMBER_LEFT"""
        left_member = message.left_chat_member
        if not left_member:
            return

        await self.trigger_service.fire_event(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.MEMBER_LEFT,
            user_id=left_member.id,
            chat_id=message.chat.id,
            telegram_bot=self.telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={
                "username": left_member.username,
                "first_name": left_member.first_name,
                "last_name": left_member.last_name,
            }
        )
