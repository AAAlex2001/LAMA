import logging
import os
from html import escape as html_escape
from urllib.parse import quote as url_quote

from aiogram.types import Message, User

from backend.services.bot_provider import resolve_by_token
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


class SendStartMessage:
    async def execute(self, message: Message, bot_token: str | None) -> None:
        if not message.from_user or not bot_token:
            return

        bot = resolve_by_token(bot_token)
        try:
            login_url = self.get_login_url(message.from_user)
            keyboard = build_keyboard(
                [[{"text": "Войти в Lama Planner", "url": login_url}]]
            )
            first_name = html_escape(message.from_user.first_name or "user")
            await bot.send_message(
                chat_id=message.chat.id,
                text=(
                    f"<b>Привет, {first_name}!</b>\n\n"
                    "Чтобы войти в аккаунт, нажмите на кнопку ниже:"
                ),
                parse_mode="HTML",
                reply_markup=keyboard,
                reply_to_message_id=message.message_id,
            )
        except Exception as exc:
            logger.error("Auth command error: %s", exc, exc_info=True)
            await bot.send_message(
                chat_id=message.chat.id,
                text="Ошибка при отправке ссылки. Попробуйте позже.",
                reply_to_message_id=message.message_id,
            )

    @staticmethod
    def get_login_url(user: User) -> str:
        frontend_url = os.getenv("FRONTEND_URL", "https://lamaplanner.com")
        login_url = f"{frontend_url}/login?tg_id={user.id}"
        if user.username:
            login_url += f"&username={url_quote(user.username)}"
        if user.first_name:
            login_url += f"&first_name={url_quote(user.first_name)}"
        if user.last_name:
            login_url += f"&last_name={url_quote(user.last_name)}"
        return login_url
