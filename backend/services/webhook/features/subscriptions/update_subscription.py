import logging

from aiogram.types import ChatMemberUpdated
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import ApprovalMode, Bot as BotModel
from backend.services.bot.features.settings.check_approval_criteria import (
    check_approval_criteria,
)
from backend.services.bot_provider import resolve_by_token
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.features.subscriptions.accept_pending_approvals import (
    AcceptPendingApprovals,
)
from backend.services.webhook.features.subscriptions.create_direct_join_event import (
    CreateDirectJoinEvent,
)
from backend.services.webhook.features.subscriptions.has_recent_join_event import (
    HasRecentJoinEvent,
)
from backend.services.webhook.features.subscriptions.fire_direct_join_events import (
    FireDirectJoinEvents,
)
from backend.services.webhook.features.subscriptions.get_subscription_join_state import (
    GetSubscriptionJoinState,
)
from backend.services.webhook.features.subscriptions.mark_join_request_accepted import (
    MarkJoinRequestAccepted,
)
from backend.services.webhook.features.subscriptions.restrict_for_required_subscription import (
    RestrictForRequiredSubscription,
)
from backend.services.webhook.features.subscriptions.update_invite_member_count import (
    UpdateInviteMemberCount,
)

logger = logging.getLogger(__name__)


class UpdateSubscription:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, chat_member: ChatMemberUpdated) -> None:
        member = chat_member.new_chat_member.user
        user_id = member.id
        chat_id = chat_member.chat.id

        if user_id == self.bot_model.telegram_id:
            return
        join_state = GetSubscriptionJoinState()
        if not join_state.is_new_join(chat_member):
            return

        logger.info(
            "Subscription change: user=%s chat=%s status: %s -> %s invite_link=%r",
            user_id,
            chat_id,
            chat_member.old_chat_member.status,
            chat_member.new_chat_member.status,
            chat_member.invite_link,
        )

        telegram_bot = resolve_by_token(self.bot_model.token)
        await UpdateInviteMemberCount(self.db, self.bot_model).execute(chat_member, user_id)

        channel = await get_channel_by_telegram_id(
            self.db,
            chat_id,
            bot_id=self.bot_model.id,
        )
        channel_db_id = channel.id if channel else None

        if await self.stop_for_captcha_or_subscription(
            chat_member,
            member,
            telegram_bot,
            channel,
        ):
            return

        duplicate = await HasRecentJoinEvent().execute(self.db, user_id, channel_db_id)
        if duplicate:
            logger.debug(
                "Skipping duplicate join processing: user=%s, channel=%s",
                user_id,
                channel_db_id,
            )
            return

        link_url = join_state.get_invite_link_url(chat_member)
        if join_state.is_direct_link_join(chat_member):
            await CreateDirectJoinEvent(self.db, self.bot_model).execute(
                chat_member,
                member,
                link_url,
            )
            await FireDirectJoinEvents(self.db, self.bot_model).execute(
                chat_member,
                member,
                telegram_bot,
                link_url,
            )
        else:
            await MarkJoinRequestAccepted(self.db).execute(user_id, chat_id)

        await AcceptPendingApprovals(self.db, self.bot_model).execute(
            chat_member,
            user_id,
            chat_id,
            telegram_bot,
        )

    async def stop_for_captcha_or_subscription(
        self,
        chat_member: ChatMemberUpdated,
        member,
        telegram_bot,
        channel,
    ) -> bool:
        if chat_member.chat.type != "supergroup":
            return False
        if channel and channel.captcha_enabled:
            return True
        if self.bot_model.auto_approval_mode != ApprovalMode.CRITERIA:
            return False

        should_approve, missing = await check_approval_criteria(self.bot_model, member.id)
        missing = [channel_id for channel_id in missing if channel_id != chat_member.chat.id]
        if should_approve or not missing:
            return False

        await RestrictForRequiredSubscription(self.db, self.bot_model).execute(
            telegram_bot,
            chat_member,
            member,
            missing,
        )
        return True
