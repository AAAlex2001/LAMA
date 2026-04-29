"""Инкремент member_count инвайт-ссылки + автоотзыв при достижении лимита."""

import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot
from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.models.inbox import InboxEvent
from backend.services.bot_provider import resolve_by_token

logger = logging.getLogger(__name__)


async def increment_link_counter(
    db: AsyncSession, event: InboxEvent, channel: ChannelGroup,
) -> None:
    """Увеличивает member_count ссылки из event.payload['link_url']; ошибки глушит."""
    link_url = (event.payload or {}).get("link_url")
    if not link_url:
        return

    try:
        rowcount = await bump_member_count(db, link_url)
        if rowcount == 0:
            return
        logger.info("Admin accept: incremented member_count for %s", link_url)
        await maybe_revoke_link(db, link_url, channel, event.bot_id)
    except Exception as exc:
        logger.error("increment_link_counter failed: %s", exc)


async def bump_member_count(db: AsyncSession, link_url: str) -> int:
    """member_count += 1 атомарным UPDATE; возвращает rowcount."""
    stmt = (
        update(ChatInviteLink)
        .where(ChatInviteLink.invite_link == link_url)
        .values(member_count=ChatInviteLink.member_count + 1)
    )
    result = await db.execute(stmt)
    if result.rowcount > 0:
        await db.flush()
    return result.rowcount


async def maybe_revoke_link(
    db: AsyncSession, link_url: str, channel: ChannelGroup, bot_id: int,
) -> None:
    """Если ссылка достигла member_limit — отозвать в TG и пометить is_revoked."""
    link = (await db.execute(
        select(ChatInviteLink).where(ChatInviteLink.invite_link == link_url)
    )).scalar_one_or_none()

    if not (link and link.member_limit and link.member_count >= link.member_limit):
        return
    if link.is_revoked:
        return

    bot = resolve_by_token((await db.get(Bot, bot_id)).token)
    try:
        await bot.revoke_chat_invite_link(chat_id=channel.telegram_id, invite_link=link_url)
    except Exception as exc:
        logger.warning("Failed to revoke link: %s", exc)

    link.is_revoked = True
    await db.flush()
