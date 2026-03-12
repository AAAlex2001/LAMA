from fastapi import HTTPException
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from aiogram import Bot
from aiogram.types import ChatPermissions, Message
from aiogram.exceptions import TelegramAPIError

from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)

MAX_AUTO_DELETE_SECONDS = 31536000


class BotModerationService:
    """Обработка модерационных команд (/ban, /mute, /admin и т.д.)."""

    async def handle_command(self, command: str, message: Message, telegram_bot: Bot) -> bool:
        """Обработать команду модерации. Возвращает True если обработана."""
        if message.chat.type not in ("group", "supergroup"):
            return False
        if not message.from_user or not message.text:
            return False

        cmd = command.lower()
        if cmd == "/admin":
            return await self.handle_admin(message, telegram_bot)

        is_admin = await self.check_is_admin(telegram_bot, message.chat.id, message.from_user.id)
        if not is_admin:
            await self.reply(telegram_bot, message.chat.id, "Эта команда доступна только администраторам.")
            return True

        target_user_id, target_name = self.extract_target(message)
        parts = message.text.split()

        handlers = {
            "/ban": lambda: self.handle_ban(telegram_bot, message.chat.id, target_user_id, target_name, parts),
            "/unban": lambda: self.handle_unban(telegram_bot, message.chat.id, target_user_id, target_name),
            "/mute": lambda: self.handle_mute(telegram_bot, message.chat.id, target_user_id, target_name, parts),
            "/unmute": lambda: self.handle_unmute(telegram_bot, message.chat.id, target_user_id, target_name),
            "/delitetime": lambda: self.handle_delete_time(telegram_bot, message.chat.id, parts),
        }

        handler = handlers.get(cmd)
        if handler:
            return await handler()
        return False

    async def handle_admin(self, message: Message, telegram_bot: Bot) -> bool:
        """Уведомить владельца группы о вызове /admin."""
        try:
            owner = await self.find_group_owner(telegram_bot, message.chat.id)
            if not owner:
                logger.warning(f"No group creator found for chat {message.chat.id}")
                return False

            text = self.build_admin_notification(message)
            reply_markup = self.build_admin_buttons(message)
            await telegram_bot.send_message(chat_id=owner.id, text=text, reply_markup=reply_markup)
            return True
        except Exception as e:
            logger.error(f"Failed to notify group owner: {e}")
            return False

    async def handle_ban(
        self, bot: Bot, chat_id: int,
        user_id: Optional[int], username: Optional[str], parts: list,
    ) -> bool:
        """Забанить пользователя."""
        if not user_id:
            await self.reply(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
            return True

        minutes = self.parse_time(parts[-1] if len(parts) > 1 else "0")
        try:
            kwargs = {"chat_id": chat_id, "user_id": user_id}
            if minutes > 0:
                kwargs["until_date"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
            await bot.ban_chat_member(**kwargs)

            duration_text = f"на {minutes} минут" if minutes > 0 else "навсегда"
            await self.reply(bot, chat_id, f"Пользователь {username} забанен {duration_text}")
        except TelegramAPIError as e:
            await self.reply(bot, chat_id, f"Не удалось забанить: {e}")
        return True

    async def handle_unban(
        self, bot: Bot, chat_id: int,
        user_id: Optional[int], username: Optional[str],
    ) -> bool:
        """Разбанить пользователя."""
        if not user_id:
            await self.reply(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
            return True
        try:
            await bot.unban_chat_member(chat_id=chat_id, user_id=user_id)
            await self.reply(bot, chat_id, f"Пользователь {username} разбанен")
        except TelegramAPIError as e:
            await self.reply(bot, chat_id, f"Не удалось разбанить: {e}")
        return True

    async def handle_mute(
        self, bot: Bot, chat_id: int,
        user_id: Optional[int], username: Optional[str], parts: list,
    ) -> bool:
        """Заглушить пользователя."""
        if not user_id:
            await self.reply(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
            return True

        minutes = self.parse_time(parts[-1] if len(parts) > 1 else "10")
        try:
            await bot.restrict_chat_member(
                chat_id=chat_id, user_id=user_id,
                permissions=ChatPermissions(can_send_messages=False),
                until_date=datetime.now(timezone.utc) + timedelta(minutes=minutes),
            )
            await self.reply(bot, chat_id, f"Пользователь {username} заглушен на {minutes} минут")
        except TelegramAPIError as e:
            await self.reply(bot, chat_id, f"Не удалось заглушить: {e}")
        return True

    async def handle_unmute(
        self, bot: Bot, chat_id: int,
        user_id: Optional[int], username: Optional[str],
    ) -> bool:
        """Разглушить пользователя."""
        if not user_id:
            await self.reply(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
            return True
        try:
            await bot.restrict_chat_member(
                chat_id=chat_id, user_id=user_id,
                permissions=ChatPermissions(
                    can_send_messages=True, can_send_media_messages=True,
                    can_send_polls=True, can_send_other_messages=True,
                    can_add_web_page_previews=True, can_invite_users=True,
                    can_change_info=False, can_pin_messages=False,
                ),
            )
            await self.reply(bot, chat_id, f"Пользователь {username} разглушен")
        except TelegramAPIError as e:
            await self.reply(bot, chat_id, f"Не удалось разглушить: {e}")
        return True

    async def handle_delete_time(self, bot: Bot, chat_id: int, parts: list) -> bool:
        """Настроить автоудаление сообщений в группе."""
        if len(parts) < 2:
            await self.reply(bot, chat_id, "Укажите время: /delitetime <секунды>")
            return True
        try:
            seconds = int(parts[1])
        except ValueError:
            await self.reply(bot, chat_id, "Неверный формат времени. Укажите число секунд.")
            return True

        if seconds < 0 or seconds > MAX_AUTO_DELETE_SECONDS:
            await self.reply(bot, chat_id, f"Время должно быть от 0 до {MAX_AUTO_DELETE_SECONDS} секунд (1 год)")
            return True
        try:
            await bot.set_chat_message_auto_delete_time(chat_id=chat_id, message_auto_delete_time=seconds)
            msg = "Автоудаление сообщений отключено" if seconds == 0 else f"Автоудаление установлено на {seconds} секунд"
            await self.reply(bot, chat_id, msg)
        except TelegramAPIError as e:
            await self.reply(bot, chat_id, f"Не удалось установить автоудаление: {e}")
        return True

    async def reply(self, bot: Bot, chat_id: int, text: str) -> None:
        """Отправить ответ в чат."""
        await bot.send_message(chat_id=chat_id, text=text)

    async def check_is_admin(self, bot: Bot, chat_id: int, user_id: int) -> bool:
        """Проверить является ли пользователь администратором."""
        try:
            member = await bot.get_chat_member(chat_id, user_id)
            return member.status in ("administrator", "creator")
        except TelegramAPIError:
            return False

    async def find_group_owner(self, bot: Bot, chat_id: int):
        """Найти владельца (создателя) группы."""
        admins = await bot.get_chat_administrators(chat_id)
        for admin in admins:
            if admin.status == "creator":
                return admin.user
        return None

    def extract_target(self, message: Message) -> tuple[Optional[int], Optional[str]]:
        """Извлечь target user из reply или @username."""
        if message.reply_to_message and message.reply_to_message.from_user:
            user = message.reply_to_message.from_user
            return user.id, user.first_name

        parts = message.text.split()
        if len(parts) > 1 and parts[1].startswith("@"):
            return None, parts[1]

        return None, None

    def build_admin_notification(self, message: Message) -> str:
        """Построить текст уведомления для /admin."""
        user = message.from_user
        user_info = user.first_name
        if user.username:
            user_info += f" (@{user.username})"

        chat_link = f"https://t.me/c/{str(message.chat.id)[4:]}/{message.message_id}"
        chat_title = message.chat.title or "Unknown Group"

        lines = [
            "ВЫЗОВ АДМИНИСТРАТОРА\n",
            f"Пользователь: {user_info}",
            f"Группа: {chat_title}",
            f"Chat ID: `{message.chat.id}`",
            f"Перейти: {chat_link}",
            f"Текст: {message.text or 'N/A'}",
        ]

        replied = message.reply_to_message
        if replied:
            replied_text = (replied.text or replied.caption or "").strip()[:200]
            replied_user = "N/A"
            replied_user_id = None
            if replied.from_user:
                replied_user_id = replied.from_user.id
                replied_user = replied.from_user.first_name
                if replied.from_user.username:
                    replied_user += f" (@{replied.from_user.username})"
            lines.append(f"\nОтвет на: {replied_user}")
            lines.append(f"User ID: `{replied_user_id}`")
            lines.append(f"Сообщение: {replied_text or 'N/A'}")

        if message.date:
            lines.append(f"\nВремя: {message.date.strftime('%Y-%m-%d %H:%M:%S')}")

        return "\n".join(lines)

    def build_admin_buttons(self, message: Message):
        """Построить кнопки для уведомления /admin."""
        replied = message.reply_to_message
        if not replied:
            raise HTTPException(status_code=404, detail="Auto reply not found")

        replied_user_id = replied.from_user.id if replied.from_user else 0
        return build_keyboard([[
            {"text": "Забанить", "callback_data": f"admincall_ban_{message.chat.id}_{replied_user_id}_{replied.message_id}"},
            {"text": "Удалить", "callback_data": f"admincall_del_{message.chat.id}_{replied_user_id}_{replied.message_id}"},
        ]])

    def parse_time(self, time_str: str) -> int:
        """Парсить время из строки (10m, 1h, 2d, 30)."""
        if not time_str or not time_str[0].isdigit():
            return 0

        num_str = ""
        unit = "m"
        for char in time_str:
            if char.isdigit():
                num_str += char
            else:
                unit = char.lower()
                break

        if not num_str:
            return 0

        num = int(num_str)
        multipliers = {"s": 1 / 60, "m": 1, "h": 60, "d": 1440}
        return int(num * multipliers.get(unit, 1))
