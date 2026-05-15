"""Главный маршрутизатор: разбирает Update от Telegram и передаёт в нужную фичу.

Запускается celery-таском после `ReceiveTelegramWebhook`. Резолвит бота по
токену/чату, проверяет что он активный, и направляет апдейт в одну из веток:
сообщения / callback-кнопки / join-request / chat_member / my_chat_member.
"""

import logging

from aiogram.types import Message, Update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import session_scope
from backend.models.bots import BotStatus
from backend.services.webhook.features.bot_context.resolve_bot_context import (
    ResolveBotContext,
)
from backend.services.webhook.features.bot_membership.sync_bot_membership import (
    SyncBotMembership,
)
from backend.services.webhook.features.callbacks.route_callback import (
    RouteCallback,
)
from backend.services.webhook.features.commands.send_guest_link import SendGuestLink
from backend.services.webhook.features.commands.send_start_message import SendStartMessage
from backend.services.webhook.features.dispatch.get_update_message import (
    GetUpdateMessage,
)
from backend.services.webhook.features.join_requests.route_join_request import (
    RouteJoinRequest,
)
from backend.services.webhook.features.messages.route_message import RouteMessage
from backend.services.webhook.features.moderation.check_message import CheckMessage
from backend.services.webhook.features.moderation.clear_ban_lock_on_unban import (
    ClearBanLockOnUnban,
)
from backend.services.webhook.features.subscriptions.update_subscription import (
    UpdateSubscription,
)
from backend.websockets.manager import ws_manager

logger = logging.getLogger(__name__)


class RouteTelegramUpdate:
    """Маршрутизатор update'ов: открывает сессию БД, резолвит бота, выбирает ветку."""

    async def execute(self, update: Update, bot_token: str | None = None) -> None:
        ws_event = None
        try:
            async with session_scope() as db:
                ws_event = await self.route(db, update, bot_token)
        except Exception as exc:
            logger.error("Bot logic error: %s", exc, exc_info=True)
            return

        if ws_event:
            await self.broadcast_ws_event(ws_event)

    async def route(
        self,
        db: AsyncSession,
        update: Update,
        bot_token: str | None,
    ):
        bot_model = await ResolveBotContext().execute(db, update, bot_token)

        if not bot_model:
            logger.debug("Bot with requested token/chat not found in DB")
            return None
        if bot_model.status == BotStatus.INACTIVE:
            return None

        message = GetUpdateMessage().execute(update)
        if message and await self.route_direct_command(message, bot_token):
            return None

        if message and message.chat.type in {"group", "supergroup", "channel"}:
            blocked = await CheckMessage(db, bot_model).execute(message)
            if blocked:
                return None

        if update.chat_join_request:
            await RouteJoinRequest(db, bot_model).execute(update.chat_join_request)
            return None

        if message and message.chat:
            route_message = RouteMessage(db, bot_model)
            ws_event = await route_message.save(message)
            await route_message.after_save(message)
            return ws_event

        if update.callback_query and update.callback_query.data:
            await RouteCallback(db, bot_model).execute(update.callback_query)
            return None

        if update.chat_member and update.chat_member.new_chat_member:
            await ClearBanLockOnUnban().execute(update.chat_member)
            await UpdateSubscription(db, bot_model).execute(update.chat_member)
            return None

        if update.my_chat_member:
            await SyncBotMembership(db, bot_model).execute(update.my_chat_member)

        return None

    async def broadcast_ws_event(self, ws_event) -> None:
        try:
            await ws_manager.broadcast_chat_update(**ws_event.model_dump())
        except Exception as exc:
            logger.error("Websocket broadcast failed: %s", exc, exc_info=True)

    async def route_direct_command(self, message: Message, bot_token: str | None) -> bool:
        if not message.text:
            return False

        command = message.text.split()[0].lower()
        if command == "/start":
            await SendStartMessage().execute(message, bot_token)
            return True
        if command == "/guest":
            await SendGuestLink().execute(message, bot_token)
            return True
        return False
