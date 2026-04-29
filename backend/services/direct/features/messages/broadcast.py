"""WS-broadcast при появлении нового сообщения в чате."""

from backend.websockets.manager import ws_manager


async def broadcast_new_message(
    owner_id: int, bot_id: int, tg_chat_id: int, message_id: int,
) -> None:
    """Шлёт WS-событие 'message_new' пользователю с id вновь сохранённого сообщения."""
    await ws_manager.broadcast_chat_update(
        user_id=owner_id,
        bot_id=bot_id,
        chat_id=tg_chat_id,
        event_type="message_new",
        payload={"message_id": message_id},
    )
