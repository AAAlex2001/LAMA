"""Redis-замок «пользователь уже забанен» для дедупликации модерации."""

from backend.services.rate_limiter import get_redis_client

DEFAULT_BAN_LOCK_TTL = 600


def _key(chat_id: int, user_id: int) -> str:
    return f"banned:{chat_id}:{user_id}"


async def is_banned(chat_id: int, user_id: int) -> bool:
    client = get_redis_client()
    return bool(await client.exists(_key(chat_id, user_id)))


async def mark_banned(chat_id: int, user_id: int, ttl: int = DEFAULT_BAN_LOCK_TTL) -> None:
    client = get_redis_client()
    await client.set(_key(chat_id, user_id), "1", ex=ttl)


async def clear_banned(chat_id: int, user_id: int) -> None:
    client = get_redis_client()
    await client.delete(_key(chat_id, user_id))
