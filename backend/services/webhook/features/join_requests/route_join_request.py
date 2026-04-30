import logging

from aiogram.types import ChatJoinRequest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import ApprovalMode, Bot as BotModel, CaptchaMode
from backend.schemas.inbox.enums import EventStatus
from backend.services.bot.features.settings.check_approval_criteria import check_approval_criteria
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.join_requests.approve_join_request import ApproveJoinRequest
from backend.services.webhook.features.join_requests.create_join_request_event import CreateJoinRequestEvent
from backend.services.webhook.features.join_requests.fire_join_request_approved import FireJoinRequestApproved
from backend.services.webhook.features.join_requests.fire_join_request_created import FireJoinRequestCreated
from backend.services.webhook.features.join_requests.get_invite_link import GetInviteLink
from backend.services.webhook.features.join_requests.increment_invite_member_count import IncrementInviteMemberCount
from backend.services.webhook.features.join_requests.save_pending_approval import SavePendingApproval
from backend.services.webhook.features.join_requests.send_join_captcha import SendJoinCaptcha
from backend.services.webhook.features.join_requests.send_manual_approval_notice import SendManualApprovalNotice
from backend.services.webhook.features.join_requests.send_subscription_requirements import SendSubscriptionRequirements
from backend.services.webhook.features.join_requests.update_invite_link_metrics import UpdateInviteLinkMetrics

logger = logging.getLogger(__name__)


class RouteJoinRequest:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, join_request: ChatJoinRequest) -> None:
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            user_id = join_request.from_user.id
            chat_id = join_request.chat.id
            invite_link_url = self.get_invite_link_url(join_request)

            if invite_link_url:
                await UpdateInviteLinkMetrics().execute(self.db, invite_link_url)

            await FireJoinRequestCreated(self.db, self.bot_model).execute(
                join_request,
                telegram_bot,
            )
            db_link = await GetInviteLink().execute(self.db, join_request)

            if await self.send_captcha_if_needed(join_request, telegram_bot, db_link):
                return

            should_approve, missing = await check_approval_criteria(
                self.bot_model,
                user_id,
            )
            missing = [channel_id for channel_id in missing if channel_id != chat_id]

            if not should_approve and missing:
                await SavePendingApproval(self.db, self.bot_model).execute(
                    user_id,
                    chat_id,
                    missing,
                )

            if self.bot_model.auto_approval_mode == ApprovalMode.MANUAL:
                await SendManualApprovalNotice(self.db, self.bot_model).execute(
                    telegram_bot,
                    user_id,
                    join_request.chat.title,
                )
                await CreateJoinRequestEvent(self.db, self.bot_model).execute(join_request)
                return

            if (
                self.bot_model.auto_approval_mode == ApprovalMode.CRITERIA
                and not should_approve
            ):
                if missing:
                    await SendSubscriptionRequirements().execute(
                        telegram_bot,
                        user_id,
                        missing,
                    )
                return

            if not should_approve:
                return

            approved = await ApproveJoinRequest().execute(telegram_bot, chat_id, user_id)
            if not approved:
                return

            if invite_link_url:
                await IncrementInviteMemberCount().execute(self.db, invite_link_url)

            await FireJoinRequestApproved(self.db, self.bot_model).execute(
                join_request,
                telegram_bot,
            )
            await CreateJoinRequestEvent(self.db, self.bot_model).execute(
                join_request,
                status=EventStatus.PROCESSED,
                join_state="accepted",
            )

        except Exception as exc:
            logger.error("Join request error: %s", exc, exc_info=True)

    async def send_captcha_if_needed(
        self,
        join_request: ChatJoinRequest,
        telegram_bot,
        db_link,
    ) -> bool:
        captcha_mode = getattr(self.bot_model, "captcha_mode", CaptchaMode.DISABLED)
        if not (
            db_link
            and db_link.protection_type == "captcha"
            and captcha_mode in (CaptchaMode.JOIN_REQUEST, CaptchaMode.BOTH)
        ):
            return False

        await SendJoinCaptcha(self.db, self.bot_model).execute(telegram_bot, join_request)
        await CreateJoinRequestEvent(self.db, self.bot_model).execute(
            join_request,
            status=EventStatus.PROCESSED,
            join_state="captcha_pending",
        )
        return True

    @staticmethod
    def get_invite_link_url(join_request: ChatJoinRequest) -> str | None:
        invite_link = getattr(join_request, "invite_link", None)
        return invite_link.invite_link if invite_link else None
