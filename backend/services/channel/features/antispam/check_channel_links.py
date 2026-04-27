from typing import List, Optional, Tuple

from backend.models.channels import ActionType, ChannelGroup, LinkFilterMode
from backend.services.channel.utils.link_utils import extract_domain, extract_links, is_in_list


def check_link_filter(
    text: str,
    mode: LinkFilterMode,
    whitelist: Optional[List[str]],
    blacklist: Optional[List[str]],
) -> Tuple[bool, Optional[str]]:
    """Возвращает (нужно_блокировать, найденная_ссылка) согласно режиму фильтра."""
    if mode == LinkFilterMode.DISABLED:
        return False, None

    links = extract_links(text)
    if not links:
        return False, None

    if mode == LinkFilterMode.BLOCK_ALL:
        return True, links[0]

    if mode == LinkFilterMode.ALLOW_TME_ONLY:
        for link in links:
            domain = extract_domain(link)
            if domain and domain != "t.me":
                return True, link
        return False, None

    if mode == LinkFilterMode.WHITELIST:
        if not whitelist:
            return True, links[0]
        for link in links:
            domain = extract_domain(link)
            if domain and not is_in_list(link, domain, whitelist):
                return True, link
        return False, None

    if mode == LinkFilterMode.BLACKLIST and blacklist:
        for link in links:
            domain = extract_domain(link)
            if domain and is_in_list(link, domain, blacklist):
                return True, link

    return False, None


class CheckChannelLinks:
    """Проверяет текст сообщения на запрещённые ссылки согласно настройкам канала."""

    async def execute(
        self,
        channel: ChannelGroup,
        text: str,
    ) -> Tuple[bool, Optional[ActionType], Optional[int], Optional[str]]:
        """Возвращает (is_blocked, action, mute_duration, reason). Без блокировки — все None."""
        if not text:
            return False, None, None, None

        should_block, matched_link = check_link_filter(
            text,
            channel.link_filter_mode,
            channel.link_whitelist,
            channel.link_blacklist,
        )

        if not should_block:
            return False, None, None, None

        return (
            True,
            channel.link_filter_action,
            channel.link_filter_mute_duration,
            f"Link filter triggered: {matched_link}",
        )
