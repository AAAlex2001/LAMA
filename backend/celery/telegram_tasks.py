"""Celery tasks for webhook processing and Telegram API side effects."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone

from aiogram.exceptions import TelegramAPIError, TelegramRetryAfter
from aiogram.types import ChatPermissions, Update

from backend.celery.app import celery_app
from backend.celery.async_runner import run
from backend.database import CelerySessionLocal
from backend.models.channels import ActionType
from backend.services.bot_provider import resolve_for_bot_id
from backend.services.rate_limiter import RateLimitTimeout, get_redis_client

logger = logging.getLogger(__name__)

TELEGRAM_MODERATION_TASK = "backend.celery.telegram_tasks.telegram_moderation_action"
PROCESS_TELEGRAM_UPDATE_TASK = "backend.celery.telegram_tasks.process_telegram_update"


@celery_app.task(name=PROCESS_TELEGRAM_UPDATE_TASK)
def process_telegram_update(update_data: dict, bot_token: str) -> str:
    return run(process_telegram_update_async(update_data, bot_token))


async def process_telegram_update_async(update_data: dict, bot_token: str) -> str:
    from backend.services.webhook.features.dispatch.route_telegram_update import (
        RouteTelegramUpdate,
    )

    update = Update.model_validate(update_data)
    await RouteTelegramUpdate().execute(update, bot_token, raise_errors=True)
    return f"processed:{update.update_id}"


@celery_app.task(bind=True, name=TELEGRAM_MODERATION_TASK, max_retries=10)
def telegram_moderation_action(
    self,
    bot_id: int,
    chat_id: int,
    message_id: int,
    user_id: int | None,
    action: str,
    mute_duration: int | None = None,
) -> str:
    result = run(
        telegram_moderation_action_async(
            bot_id=bot_id,
            chat_id=chat_id,
            message_id=message_id,
            user_id=user_id,
            action=action,
            mute_duration=mute_duration,
        )
    )
    if result.startswith("rate_limited:"):
        wait = max(int(result.split(":", 1)[1]), 1)
        jitter = random.randint(0, max(wait // 2, 5))
        raise self.retry(countdown=min(wait + jitter, 300))
    return result


async def telegram_moderation_action_async(
    bot_id: int,
    chat_id: int,
    message_id: int,
    user_id: int | None,
    action: str,
    mute_duration: int | None,
) -> str:
    try:
        async with CelerySessionLocal() as db:
            bot = await resolve_for_bot_id(db, bot_id)
            await db.commit()

        action_type = ActionType(action)
        if user_id and action_type in user_actions():
            if await is_admin(bot, chat_id, user_id):
                return f"skipped_admin:{chat_id}:{user_id}"
            await apply_user_action(bot_id, bot, chat_id, user_id, action_type, mute_duration)

        await delete_message(bot, chat_id, message_id)
        return f"moderated:{chat_id}:{message_id}:{action}"

    except RateLimitTimeout as exc:
        return f"rate_limited:{int(exc.wait_seconds)}"
    except TelegramRetryAfter as exc:
        return f"rate_limited:{int(exc.retry_after)}"
    except TelegramAPIError as exc:
        logger.warning("Telegram moderation action failed: %s", exc)
        return f"telegram_failed:{chat_id}:{message_id}:{action}"


def user_actions() -> set[ActionType]:
    return {ActionType.MUTE, ActionType.KICK, ActionType.BAN, ActionType.UNMUTE}


async def is_admin(bot, chat_id: int, user_id: int) -> bool:
    try:
        member = await bot.get_chat_member(chat_id=chat_id, user_id=user_id)
        return member.status in ("creator", "administrator")
    except TelegramAPIError as exc:
        text = str(exc)
        if "can't remove chat owner" in text or "user is an administrator" in text:
            return True
        logger.debug("Failed to check member status: %s", exc)
    return False


async def apply_user_action(
    bot_id: int,
    bot,
    chat_id: int,
    user_id: int,
    action: ActionType,
    mute_duration: int | None,
) -> None:
    lock_key = f"lama:telegram-action:{bot_id}:{chat_id}:{user_id}:{action.value}"
    client = get_redis_client()
    claimed = await client.set(lock_key, "1", nx=True, ex=60)
    if not claimed:
        logger.info("Skipped duplicate Telegram user action: %s", lock_key)
        return

    try:
        if action == ActionType.MUTE:
            until_date = None
            if mute_duration:
                until_date = datetime.now(timezone.utc) + timedelta(minutes=mute_duration)
            await bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=muted_permissions(),
                until_date=until_date,
            )
        elif action == ActionType.KICK:
            await bot.ban_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                revoke_messages=False,
            )
        elif action == ActionType.BAN:
            await bot.ban_chat_member(chat_id=chat_id, user_id=user_id)
        elif action == ActionType.UNMUTE:
            await bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=unmuted_permissions(),
            )
    except (RateLimitTimeout, TelegramRetryAfter):
        await client.delete(lock_key)
        raise


async def delete_message(bot, chat_id: int, message_id: int) -> None:
    try:
        await bot.delete_message(chat_id=chat_id, message_id=message_id)
    except TelegramAPIError as exc:
        logger.debug("Failed to delete moderated message: %s", exc)


def muted_permissions() -> ChatPermissions:
    return ChatPermissions(
        can_send_messages=False,
        can_send_media_messages=False,
        can_send_polls=False,
        can_send_other_messages=False,
        can_add_web_page_previews=False,
        can_pin_messages=False,
        can_change_info=False,
        can_invite_users=False,
    )


def unmuted_permissions() -> ChatPermissions:
    return ChatPermissions(
        can_send_messages=True,
        can_send_media_messages=True,
        can_send_polls=True,
        can_send_other_messages=True,
        can_add_web_page_previews=True,
        can_pin_messages=False,
        can_change_info=False,
        can_invite_users=True,
    )
