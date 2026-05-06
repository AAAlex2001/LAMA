class KickUser:
    """Кикнуть пользователя из чата (без удаления его сообщений)."""

    async def execute(self, bot, chat_id: int, user_id: int) -> None:
        await bot.ban_chat_member(chat_id=chat_id, user_id=user_id, revoke_messages=False)
