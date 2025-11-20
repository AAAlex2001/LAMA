from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import re
from urllib.parse import urlparse

from backend.models.channels import ChannelGroup, LinkFilterMode, ActionType


class AntispamService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def extract_links(self, text: str) -> List[str]:
        """Извлечь все ссылки из текста"""
        if not text:
            return []

        url_pattern = r'https?://[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?'
        links = re.findall(url_pattern, text, re.IGNORECASE)
        return links

    def extract_domain(self, link: str) -> Optional[str]:
        """Извлечь домен из ссылки"""
        try:
            if not link.startswith(("http://", "https://")):
                link = "http://" + link
            parsed = urlparse(link)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            return domain if domain else None
        except:
            return None

    def is_in_list(self, link: str, domain: str, filter_list: List[str]) -> bool:
        """Проверить, содержится ли домен/ссылка в списке"""
        link_lower = link.lower()
        for item in filter_list:
            item_lower = item.lower().strip()
            if item_lower == domain:
                return True
            if item_lower in link_lower:
                return True
        return False

    def check_link_filter(
        self,
        text: str,
        link_filter_mode: LinkFilterMode,
        whitelist: Optional[List[str]] = None,
        blacklist: Optional[List[str]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Проверить текст на наличие запрещённых ссылок.
        
        Возвращает (should_block, matched_link):
        - (True, link) если нужно заблокировать
        - (False, None) если всё ок
        """
        if link_filter_mode == LinkFilterMode.DISABLED:
            return False, None
        
        links = self.extract_links(text)
        if not links:
            return False, None
        
        # BLOCK_ALL: блокируем любые ссылки
        if link_filter_mode == LinkFilterMode.BLOCK_ALL:
            return True, links[0]
        
        # ALLOW_TME_ONLY: разрешены только t.me
        if link_filter_mode == LinkFilterMode.ALLOW_TME_ONLY:
            for link in links:
                domain = self.extract_domain(link)
                if domain and domain != "t.me":
                    return True, link
            return False, None
        
        # WHITELIST: блокируем всё, кроме белого списка
        if link_filter_mode == LinkFilterMode.WHITELIST:
            if not whitelist:
                return True, links[0]
            for link in links:
                domain = self.extract_domain(link)
                if domain and not self.is_in_list(link, domain, whitelist):
                    return True, link
            return False, None
        
        # BLACKLIST: блокируем только из чёрного списка
        if link_filter_mode == LinkFilterMode.BLACKLIST:
            if not blacklist:
                return False, None
            for link in links:
                domain = self.extract_domain(link)
                if domain and self.is_in_list(link, domain, blacklist):
                    return True, link
            return False, None
        
        return False, None

    async def check_antispam_by_telegram_id(
        self,
        telegram_id: int,
        text: str
    ) -> Tuple[bool, Optional[ActionType], Optional[int], Optional[str]]:
        """
        Проверить текст на антиспам для канала по telegram_id.
        
        Возвращает:
        (should_block, action, mute_duration, reason)
        """
        if not text:
            return False, None, None, None
        
        query = select(ChannelGroup).where(ChannelGroup.telegram_id == telegram_id)
        result = await self.db.execute(query)
        channel = result.scalar_one_or_none()
        
        if not channel:
            return False, None, None, None
        
        should_block, matched_link = self.check_link_filter(
            text,
            channel.link_filter_mode,
            channel.link_whitelist,
            channel.link_blacklist
        )
        
        if should_block:
            return (
                True,
                channel.link_filter_action,
                channel.link_filter_mute_duration,
                f"Link filter triggered: {matched_link}"
            )
        
        return False, None, None, None

    async def update_channel_antispam(
        self,
        channel_id: int,
        owner_id: int,
        link_filter_mode: Optional[LinkFilterMode] = None,
        link_whitelist: Optional[List[str]] = None,
        link_blacklist: Optional[List[str]] = None,
        link_filter_action: Optional[ActionType] = None,
        link_filter_mute_duration: Optional[int] = None
    ) -> Optional[ChannelGroup]:
        """Обновить настройки антиспама для канала"""
        query = select(ChannelGroup).where(
            ChannelGroup.id == channel_id,
            ChannelGroup.owner_id == owner_id
        )
        result = await self.db.execute(query)
        channel = result.scalar_one_or_none()
        
        if not channel:
            return None
        
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

