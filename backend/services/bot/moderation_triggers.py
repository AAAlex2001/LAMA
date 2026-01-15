"""
Сервис для обработки триггеров модерации
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from aiogram import Bot
from aiogram.types import ChatPermissions, Message
from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from backend.utils.keyboard import build_keyboard


class ModerationTriggerService:
    """Сервис для обработки модерационных команд"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def handle_moderation_command(
        self,
        command: str,
        message: Message,
        telegram_bot: Bot
    ) -> bool:
        """
        Обработать команду модерации
        
        Поддерживаемые команды:
        - /admin - уведомление админа
        - /ban @username time или /ban time (ответ на сообщение)
        - /unban @username или /unban (ответ на сообщение)
        - /mute @username time или /mute time (ответ на сообщение)
        - /unmute @username или /unmute (ответ на сообщение)
        - /delitetime time - настройка автоудаления для группы
        
        Returns:
            True если команда обработана, False если нет
        """
        # Проверяем, что это групповой чат
        if message.chat.type not in ("group", "supergroup"):
            return False

        # Проверяем права пользователя
        if not message.from_user:
            return False

        try:
            member = await telegram_bot.get_chat_member(message.chat.id, message.from_user.id)
            is_admin = member.status in ("administrator", "creator")
        except TelegramAPIError:
            is_admin = False

        if not message.text:
            return False

        parts = message.text.split()
        cmd = command.lower()

        if cmd == "/admin":
            return await self.handle_admin_call(message, telegram_bot)

        if not is_admin:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Эта команда доступна только администраторам."
            )
            return True

        target_user_id = None
        target_username = None

        if message.reply_to_message and message.reply_to_message.from_user:
            target_user_id = message.reply_to_message.from_user.id
            target_username = message.reply_to_message.from_user.first_name

        elif len(parts) > 1 and parts[1].startswith("@"):
            target_username = parts[1]

        if cmd == "/ban":
            return await self.handle_ban(message, telegram_bot, target_user_id, target_username, parts)
        elif cmd == "/unban":
            return await self.handle_unban(message, telegram_bot, target_user_id, target_username)
        elif cmd == "/mute":
            return await self.handle_mute(message, telegram_bot, target_user_id, target_username, parts)
        elif cmd == "/unmute":
            return await self.handle_unmute(message, telegram_bot, target_user_id, target_username)
        elif cmd == "/delitetime":
            return await self.handle_delete_time(message, telegram_bot, parts)

        return False

    async def handle_admin_call(self, message: Message, telegram_bot: Bot) -> bool:
        """Обработать вызов администраторов - только уведомление владельцу в ЛС"""
        try:
            await self.notify_bot_owner(message, telegram_bot)
            return True
        except TelegramAPIError as e:
            print(f"Failed to notify bot owner: {str(e)}")
            return False

    async def notify_bot_owner(self, message: Message, telegram_bot: Bot) -> None:
        """Отправить уведомление владельцу группы (создателю) в ЛС"""
        try:
            admins = await telegram_bot.get_chat_administrators(message.chat.id)

            group_owner = None
            for admin in admins:
                if admin.status == "creator":
                    group_owner = admin.user
                    break

            if not group_owner:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"No group creator found for chat {message.chat.id}")
                return

            chat_title = message.chat.title or "Unknown Group"
            if not message.from_user:
                return
            user_info = f"{message.from_user.first_name}"
            if message.from_user.username:
                user_info += f" (@{message.from_user.username})"

            replied = message.reply_to_message
            replied_user_info = None
            replied_text_preview = None
            replied_user_id = None
            replied_message_id = replied.message_id if replied else None

            if replied:
                replied_text_preview = (
                    replied.text or replied.caption or "").strip()
                if len(replied_text_preview) > 200:
                    replied_text_preview = replied_text_preview[:200] + "…"
                if replied.from_user:
                    replied_user_id = replied.from_user.id
                    replied_user_info = f"{replied.from_user.first_name}"
                    if replied.from_user.username:
                        replied_user_info += f" (@{replied.from_user.username})"

            chat_link = f"https://t.me/c/{str(message.chat.id)[4:]}/{message.message_id}"

            owner_message = (
                f"🚨 ВЫЗОВ АДМИНИСТРАТОРА\n\n"
                f"👤 Пользователь: {user_info}\n"
                f"💬 Группа: {chat_title}\n"
                f"🆔 Chat ID: `{message.chat.id}`\n"
                f"🔗 Перейти: {chat_link}\n"
                f"📝 Текст: {message.text or 'N/A'}\n\n"
                + (
                    f"↩️ Ответ на сообщение: {replied_user_info or 'N/A'}\n"
                    f"🆔 User ID: `{replied_user_id}`\n"
                    f"🧾 Сообщение: {replied_text_preview or 'N/A'}\n\n"
                    if replied_message_id else ""
                )
                + f"⏰ Время: {message.date.strftime('%Y-%m-%d %H:%M:%S') if message.date else 'N/A'}"
            )

            reply_markup = None
            if replied_message_id:
                reply_markup = build_keyboard([[
                    {
                        "text": "🚫 Забанить",
                        "callback_data": f"admincall_ban_{message.chat.id}_{replied_user_id or 0}_{replied_message_id}",
                    },
                    {
                        "text": "🗑 Удалить",
                        "callback_data": f"admincall_del_{message.chat.id}_{replied_user_id or 0}_{replied_message_id}",
                    },
                ]])

            await telegram_bot.send_message(
                chat_id=group_owner.id,
                text=owner_message,
                reply_markup=reply_markup,
            )

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to notify group owner: {str(e)}")

    async def handle_ban(
        self,
        message: Message,
        telegram_bot: Bot,
        target_user_id: Optional[int],
        target_username: Optional[str],
        parts: list
    ) -> bool:
        """Обработать бан пользователя"""
        if not target_user_id:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Ответьте на сообщение пользователя или укажите @username"
            )
            return True

        # Парсим время
        time_minutes = self.parse_time(parts[-1] if len(parts) > 1 else "0")

        try:
            if time_minutes > 0:
                until_date = datetime.now(
                    timezone.utc) + timedelta(minutes=time_minutes)
                await telegram_bot.ban_chat_member(
                    chat_id=message.chat.id,
                    user_id=target_user_id,
                    until_date=until_date
                )
                await telegram_bot.send_message(
                    chat_id=message.chat.id,
                    text=f"🚫 Пользователь {target_username} забанен на {time_minutes} минут"
                )
            else:
                await telegram_bot.ban_chat_member(
                    chat_id=message.chat.id,
                    user_id=target_user_id
                )
                await telegram_bot.send_message(
                    chat_id=message.chat.id,
                    text=f"🚫 Пользователь {target_username} забанен навсегда"
                )
            return True
        except TelegramAPIError as e:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"❌ Не удалось забанить: {str(e)}"
            )
            return True

    async def handle_unban(
        self,
        message: Message,
        telegram_bot: Bot,
        target_user_id: Optional[int],
        target_username: Optional[str]
    ) -> bool:
        """Обработать разбан пользователя"""
        if not target_user_id:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Ответьте на сообщение пользователя или укажите @username"
            )
            return True

        try:
            await telegram_bot.unban_chat_member(
                chat_id=message.chat.id,
                user_id=target_user_id
            )
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"✅ Пользователь {target_username} разбанен"
            )
            return True
        except TelegramAPIError as e:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"❌ Не удалось разбанить: {str(e)}"
            )
            return True

    async def handle_mute(
        self,
        message: Message,
        telegram_bot: Bot,
        target_user_id: Optional[int],
        target_username: Optional[str],
        parts: list
    ) -> bool:
        """Обработать заглушение пользователя"""
        if not target_user_id:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Ответьте на сообщение пользователя или укажите @username"
            )
            return True

        time_minutes = self.parse_time(parts[-1] if len(parts) > 1 else "10")

        try:
            until_date = datetime.now(timezone.utc) + \
                                      timedelta(minutes=time_minutes)
            await telegram_bot.restrict_chat_member(
                chat_id=message.chat.id,
                user_id=target_user_id,
                permissions=ChatPermissions(can_send_messages=False),
                until_date=until_date
            )
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"🔇 Пользователь {target_username} заглушен на {time_minutes} минут"
            )
            return True
        except TelegramAPIError as e:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"❌ Не удалось заглушить: {str(e)}"
            )
            return True

    async def handle_unmute(
        self,
        message: Message,
        telegram_bot: Bot,
        target_user_id: Optional[int],
        target_username: Optional[str]
    ) -> bool:
        """Обработать разглушение пользователя"""
        if not target_user_id:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Ответьте на сообщение пользователя или укажите @username"
            )
            return True

        try:
            await telegram_bot.restrict_chat_member(
                chat_id=message.chat.id,
                user_id=target_user_id,
                permissions=ChatPermissions(
                    can_send_messages=True,
                    can_send_media_messages=True,
                    can_send_polls=True,
                    can_send_other_messages=True,
                    can_add_web_page_previews=True,
                    can_change_info=False,
                    can_invite_users=True,
                    can_pin_messages=False
                )
            )
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"🔊 Пользователь {target_username} разглушен"
            )
            return True
        except TelegramAPIError as e:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"❌ Не удалось разглушить: {str(e)}"
            )
            return True

    async def handle_delete_time(
        self,
        message: Message,
        telegram_bot: Bot,
        parts: list
    ) -> bool:
        """Обработать настройку автоудаления"""
        if len(parts) < 2:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Укажите время: /delitetime <секунды>"
            )
            return True

        try:
            seconds = int(parts[1])
            if seconds < 0 or seconds > 31536000:  # Максимум 1 год
                await telegram_bot.send_message(
                    chat_id=message.chat.id,
                    text="❌ Время должно быть от 0 до 31536000 секунд (1 год)"
                )
                return True

            await telegram_bot.set_chat_message_auto_delete_time(
                chat_id=message.chat.id,
                message_auto_delete_time=seconds
            )

            if seconds == 0:
                await telegram_bot.send_message(
                    chat_id=message.chat.id,
                    text="✅ Автоудаление сообщений отключено"
                )
            else:
                await telegram_bot.send_message(
                    chat_id=message.chat.id,
                    text=f"✅ Автоудаление сообщений установлено на {seconds} секунд"
                )
            return True
        except ValueError:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Неверный формат времени. Укажите число секунд."
            )
            return True
        except TelegramAPIError as e:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=f"❌ Не удалось установить автоудаление: {str(e)}"
            )
            return True

    def parse_time(self, time_str: str) -> int:
        """Парсить время из строки (например: 10m, 1h, 30)"""
        if not time_str or not time_str[0].isdigit():
            return 0

        # Извлекаем число
        num_str = ""
        unit = "m"  # По умолчанию минуты

        for char in time_str:
            if char.isdigit():
                num_str += char
            else:
                unit = char.lower()
                break

        if not num_str:
            return 0

        num = int(num_str)

        # Конвертируем в минуты
        if unit == "s":  # секунды
            return num // 60
        elif unit == "m":  # минуты
            return num
        elif unit == "h":  # часы
            return num * 60
        elif unit == "d":  # дни
            return num * 60 * 24
        else:
            return num  # По умолчанию считаем минутами
