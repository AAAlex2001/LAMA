import logging
from typing import Optional, Tuple

from backend.models.channels import ActionType, ChannelGroup
from backend.services.rate_limiter import get_redis_client

logger = logging.getLogger(__name__)


class CheckUserFlood:
    """Проверяет превышение лимита сообщений пользователем за окно времени через Redis."""

    async def execute(
        self,
        channel: ChannelGroup,
        user_id: int,
    ) -> Tuple[bool, Optional[ActionType], Optional[int]]:
        if not channel.flood_message_limit or not channel.flood_interval_seconds:
            return False, None, None

        client = get_redis_client()
        key = f"flood:{channel.id}:{user_id}"

        count = await client.incr(key)
        if count == 1:
            await client.expire(key, channel.flood_interval_seconds)

        logger.debug("Flood check: channel=%s user=%s count=%s", channel.id, user_id, count)

        if count <= channel.flood_message_limit:
            return False, None, None

        await client.delete(key)
        return True, channel.flood_action, channel.flood_mute_duration_minutes
