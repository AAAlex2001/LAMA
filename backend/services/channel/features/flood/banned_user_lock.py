"""Redis-замок «пользователь уже забанен» для дедупликации модерации."""

from backend.services.rate_limiter import get_redis_client

DEFAULT_BAN_LOCK_TTL = 600


def lock_key(chat_id: int, user_id: int) -> str:
    """Ключ замка в Redis для пары (чат, пользователь)."""
    return f"banned:{chat_id}:{user_id}"


async def is_banned(chat_id: int, user_id: int) -> bool:
    """True если для пары стоит замок «уже забанен»."""
    client = get_redis_client()
    return bool(await client.exists(lock_key(chat_id, user_id)))


async def mark_banned(chat_id: int, user_id: int, ttl: int = DEFAULT_BAN_LOCK_TTL) -> None:
    """Поставить замок «забанен» на TTL секунд."""
    client = get_redis_client()
    await client.set(lock_key(chat_id, user_id), "1", ex=ttl)


async def clear_banned(chat_id: int, user_id: int) -> None:
    """Снять замок (например, при разбане пользователя)."""
    client = get_redis_client()
    await client.delete(lock_key(chat_id, user_id))
