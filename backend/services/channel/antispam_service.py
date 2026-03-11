from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType, ChannelGroup, LinkFilterMode
from backend.services.channel.utils.link_utils import extract_domain, extract_links, is_in_list
from backend.services.channel.utils.query_utils import get_channel, get_channel_by_telegram_id


class AntispamService:
    """Проверка и настройка антиспама."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def check_link_filter(
        self,
        text: str,
        link_filter_mode: LinkFilterMode,
        whitelist: Optional[List[str]] = None,
        blacklist: Optional[List[str]] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Проверить текст на запрещённые ссылки."""
        if link_filter_mode == LinkFilterMode.DISABLED:
            return False, None

        links = extract_links(text)
        if not links:
            return False, None

        if link_filter_mode == LinkFilterMode.BLOCK_ALL:
            return True, links[0]

        if link_filter_mode == LinkFilterMode.ALLOW_TME_ONLY:
            for link in links:
                domain = extract_domain(link)
                if domain and domain != "t.me":
                    return True, link
            return False, None

        if link_filter_mode == LinkFilterMode.WHITELIST:
            if not whitelist:
                return True, links[0]
            for link in links:
                domain = extract_domain(link)
                if domain and not is_in_list(link, domain, whitelist):
                    return True, link
            return False, None

        if link_filter_mode == LinkFilterMode.BLACKLIST:
            if not blacklist:
                return False, None
            for link in links:
                domain = extract_domain(link)
                if domain and is_in_list(link, domain, blacklist):
                    return True, link
            return False, None

        return False, None

    async def check_by_telegram_id(
        self,
        telegram_id: int,
        text: str,
    ) -> Tuple[bool, Optional[ActionType], Optional[int], Optional[str]]:
        """Проверить текст на антиспам для канала."""
        if not text:
            return False, None, None, None

        channel = await get_channel_by_telegram_id(self.db, telegram_id)
        if not channel:
            return False, None, None, None

        should_block, matched_link = self.check_link_filter(
            text,
            channel.link_filter_mode,
            channel.link_whitelist,
            channel.link_blacklist,
        )

        if should_block:
            return True, channel.link_filter_action, channel.link_filter_mute_duration, f"Link filter triggered: {matched_link}"

        return False, None, None, None

    async def update_settings(
        self,
        channel_id: int,
        owner_id: int,
        link_filter_mode: Optional[LinkFilterMode] = None,
        link_whitelist: Optional[List[str]] = None,
        link_blacklist: Optional[List[str]] = None,
        link_filter_action: Optional[ActionType] = None,
        link_filter_mute_duration: Optional[int] = None,
    ) -> ChannelGroup:
        """Обновить настройки антиспама."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        if link_filter_mode is not None:
            channel.link_filter_mode = link_filter_mode
        if link_whitelist is not None:
            channel.link_whitelist = link_whitelist
        if link_blacklist is not None:
            channel.link_blacklist = link_blacklist
        if link_filter_action is not None:
            channel.link_filter_action = link_filter_action
        if link_filter_mute_duration is not None:
            channel.link_filter_mute_duration = link_filter_mute_duration

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

