import asyncio
import logging
from typing import Optional
from sqlalchemy import select, update
from aiogram.types import CallbackQuery, ChatPermissions, Message
from aiogram.exceptions import TelegramAPIError
from backend.services.bot import CaptchaService, TriggerService
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.models.bots import PendingApproval, TriggerType
from backend.models.channels import ChatInviteLink, ChannelGroup
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventType, EventStatus
from backend.services.bot_provider import resolve_by_token
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.welcome import WelcomeHandler
from backend.services.webhook.callbacks.base import BaseCallbackProcessor

logger = logging.getLogger(__name__)


class CaptchaCallbackProcessor(BaseCallbackProcessor):
    """Обработчик ответов на капчу."""

    def __init__(self, db, bot_model):
        super().__init__(db, bot_model)
        self.trigger_service = TriggerService(db)

    async def process_captcha(self, callback_query: CallbackQuery) -> None:
        """Обработка ответа на капчу в ЛС."""
        if not callback_query.data:
            return
        parts = callback_query.data.split("_")
        if len(parts) < 3:
            return

        try:
            pending_id = int(parts[1])
            user_answer = parts[2]
        except ValueError:
            return

        captcha_service = CaptchaService(self.db)
        is_correct, reason = await captcha_service.check_answer(
            pending_id, user_answer, solver_user_id=callback_query.from_user.id
        )

        group_chat_id = await self.get_pending_chat_id(pending_id)

        bot = resolve_by_token(self.bot_model.token)
        user_id = callback_query.from_user.id

        if is_correct:
            await self.answer_callback(
                bot,
                callback_query.id,
                "✅ Правильно! Заявка одобрена.",
                True,
            )
            pending = await self.approve_join_request(bot, pending_id)
            if pending:
                await self.increment_member_count(pending.user_id, pending.chat_id)
                await self.mark_join_event_accepted(pending.user_id, pending.chat_id)
                group_chat_id = pending.chat_id
            await self.fire_captcha_trigger(
                bot,
                user_id,
                group_chat_id,
                TriggerType.CAPTCHA_PASSED,
                pending_id,
                "supergroup",
            )
        elif reason == "not_allowed":
            await self.answer_callback(
                bot,
                callback_query.id,
                "⚠️ Эту капчу может решить только приглашённый.",
                True,
            )
        else:
            await self.answer_callback(
                bot, callback_query.id, "❌ Неправильный ответ.", True
            )
            await self.fire_captcha_trigger(
                bot,
                user_id,
                group_chat_id,
                TriggerType.CAPTCHA_FAILED,
                pending_id,
                "supergroup",
                user_answer,
            )

    async def process_group_captcha(
        self, callback_query: CallbackQuery
    ) -> None:
        """Обработка ответа на капчу в группе."""
        if not callback_query.data:
            return
        parts = callback_query.data.split("_")
        if len(parts) < 4:
            return

        try:
            pending_id = int(parts[2])
            user_answer = parts[3]
        except ValueError:
            return

        captcha_service = CaptchaService(self.db)
        is_correct, reason = await captcha_service.check_answer(
            pending_id, user_answer, solver_user_id=callback_query.from_user.id
        )

        bot = resolve_by_token(self.bot_model.token)
        user_id = callback_query.from_user.id
        chat_id = (
            callback_query.message.chat.id if callback_query.message else 0
        )

        if is_correct:
            await self.answer_callback(
                bot, callback_query.id, "✅ Правильно! Добро пожаловать!"
            )
            await self.delete_captcha_message(bot, callback_query.message)
            await self.unrestrict_user(bot, chat_id, user_id)
            await self.send_welcome(callback_query)
            await self._send_captcha_success_text(bot, chat_id, callback_query.from_user)
            await self.fire_captcha_trigger(
                bot,
                user_id,
                chat_id,
                TriggerType.CAPTCHA_PASSED,
                pending_id,
                "group",
            )
        elif reason == "not_allowed":
            await self.answer_callback(
                bot,
                callback_query.id,
                "⚠️ Эту капчу может решить только приглашённый.",
                True,
            )
        else:
            await self.answer_callback(
                bot, callback_query.id, "❌ Неправильный ответ.", True
            )
            await self.fire_captcha_trigger(
                bot,
                user_id,
                chat_id,
                TriggerType.CAPTCHA_FAILED,
                pending_id,
                "group",
                user_answer,
            )

    async def _send_captcha_success_text(self, bot, chat_id: int, user) -> None:
        """Отправить кастомный текст при успешном прохождении капчи."""
        try:
            channel = await get_channel_by_telegram_id(
                self.db, chat_id, bot_id=self.bot_model.id
            )
            if not channel or not channel.captcha_message_success:
                return
            context = {
                "user": {
                    "first_name": user.first_name or "",
                    "username": user.username or "",
                    "last_name": user.last_name or "",
                    "id": user.id,
                },
            }
            text = ShortcodeProcessor.process(channel.captcha_message_success, context)
            msg = await bot.send_message(chat_id=chat_id, text=text)
            await asyncio.sleep(30)
            try:
                await bot.delete_message(chat_id=chat_id, message_id=msg.message_id)
            except TelegramAPIError:
                pass
        except Exception as e:
            logger.error(f"Failed to send captcha success text: {e}")

    async def get_pending_chat_id(self, pending_id: int) -> int:
        """Получить chat_id группы из PendingApproval."""
        result = await self.db.execute(
            select(PendingApproval.chat_id).where(PendingApproval.id == pending_id)
        )
        return result.scalar_one_or_none() or 0

    async def approve_join_request(self, bot, pending_id: int) -> Optional[PendingApproval]:
        """Одобрить заявку на вступление. Возвращает PendingApproval."""
        query = select(PendingApproval).where(PendingApproval.id == pending_id)
        result = await self.db.execute(query)
        pending = result.scalar_one_or_none()
        if not pending:
            logger.warning(f"PendingApproval {pending_id} not found")
            return None
        try:
            await bot.approve_chat_join_request(
                chat_id=pending.chat_id, user_id=pending.user_id
            )
            return pending
        except TelegramAPIError as e:
            logger.warning(
                f"Failed to approve join request "
                f"for user {pending.user_id}: {e}"
            )
            return None

    async def increment_member_count(self, user_id: int, telegram_chat_id: int) -> None:
        """Инкрементировать member_count ссылки по данным InboxEvent."""
        try:
            channel_result = await self.db.execute(
                select(ChannelGroup.id).where(ChannelGroup.telegram_id == telegram_chat_id)
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
            link_url = (event.payload or {}).get("link_url") if event else None
            if not link_url:
                return

            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == link_url)
                .values(member_count=ChatInviteLink.member_count + 1)
            )
            res = await self.db.execute(stmt)
            if res.rowcount > 0:
                await self.db.flush()
                logger.info(f"Captcha approval: incremented member_count for {link_url}")
                await self.check_and_revoke_link(link_url, telegram_chat_id)
        except Exception as e:
            logger.error(f"increment_member_count failed: {e}")

    async def check_and_revoke_link(self, invite_link_url: str, chat_id: int) -> None:
        """Автоотзыв ссылки при достижении лимита."""
        try:
            result = await self.db.execute(
                select(ChatInviteLink).where(ChatInviteLink.invite_link == invite_link_url)
            )
            link = result.scalar_one_or_none()
            if not link or not link.member_limit:
                return
            if link.member_count >= link.member_limit and not link.is_revoked:
                bot = resolve_by_token(self.bot_model.token)
                try:
                    await bot.revoke_chat_invite_link(
                        chat_id=chat_id, invite_link=invite_link_url,
                    )
                except TelegramAPIError as e:
                    logger.warning(f"Failed to revoke link: {e}")
                link.is_revoked = True
                await self.db.flush()
                logger.info(f"Auto-revoked link {invite_link_url}")
        except Exception as e:
            logger.error(f"check_and_revoke_link failed: {e}")

    async def mark_join_event_accepted(self, user_id: int, telegram_chat_id: int) -> None:
        """Пометить InboxEvent заявки как принятую после капчи."""
        try:
            channel_result = await self.db.execute(
                select(ChannelGroup.id).where(ChannelGroup.telegram_id == telegram_chat_id)
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

    async def delete_captcha_message(self, bot, message) -> None:
        """Удалить сообщение с капчей."""
        if not message:
            return
        try:
            await bot.delete_message(
                chat_id=message.chat.id, message_id=message.message_id
            )
        except TelegramAPIError as e:
            logger.debug(f"Failed to delete captcha message: {e}")

    async def unrestrict_user(self, bot, chat_id: int, user_id: int) -> None:
        """Снять ограничения после капчи."""
        try:
            await bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=ChatPermissions(
                    can_send_messages=True,
                    can_send_media_messages=True,
                    can_send_other_messages=True,
                    can_add_web_page_previews=True,
                ),
            )
        except TelegramAPIError as e:
            logger.warning(
                f"Failed to unrestrict user {user_id} in chat {chat_id}: {e}"
            )

    async def send_welcome(self, callback_query: CallbackQuery) -> None:
        """Отправить приветственное сообщение."""
        if not callback_query.message:
            return
        welcome_handler = WelcomeHandler(self.db, self.bot_model)
        fake_message = Message(
            message_id=0,
            date=callback_query.message.date,
            chat=callback_query.message.chat,
        )
        try:
            await welcome_handler.handle_new_member(
                fake_message, callback_query.from_user
            )
        except Exception as e:
            logger.error(f"Failed to send welcome message: {e}")

    async def fire_captcha_trigger(
        self,
        bot,
        user_id: int,
        chat_id: int,
        trigger_type: TriggerType,
        pending_id: int,
        chat_type: str,
        answer: Optional[str] = None,
    ) -> None:
        """Запустить триггер капчи."""
        context = {"pending_id": pending_id}
        if chat_type == "group":
            context["group_captcha"] = True
        if answer:
            context["answer"] = answer
        try:
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=trigger_type,
                user_id=user_id,
                chat_id=chat_id,
                telegram_bot=bot,
                chat_type=chat_type,
                context=context,
            )
        except Exception as e:
            logger.error(f"Failed to fire {trigger_type.value} trigger: {e}")
