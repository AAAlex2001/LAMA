"""
Сервис для обработки триггеров модерации
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from aiogram import Bot
from aiogram.types import ChatPermissions, Message
from aiogram.exceptions import TelegramAPIError


class ModerationTriggerService:
    """Сервис для обработки модерационных команд"""

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
        try:
            member = await telegram_bot.get_chat_member(message.chat.id, message.from_user.id)
            is_admin = member.status in ("administrator", "creator")
        except TelegramAPIError:
            is_admin = False
        
        parts = message.text.split()
        cmd = command.lower()
        
        # /admin - доступно всем
        if cmd == "/admin":
            return await self.handle_admin_call(message, telegram_bot)
        
        # Остальные команды только для админов
        if not is_admin:
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text="❌ Эта команда доступна только администраторам."
            )
            return True
        
        # Определяем целевого пользователя
        target_user_id = None
        target_username = None
        
        # Если это ответ на сообщение
        if message.reply_to_message and message.reply_to_message.from_user:
            target_user_id = message.reply_to_message.from_user.id
            target_username = message.reply_to_message.from_user.first_name
        # Если указан @username
        elif len(parts) > 1 and parts[1].startswith("@"):
            target_username = parts[1]
        
        # Обрабатываем команды
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
        """Обработать вызов администраторов"""
        try:
            # Уведомление в группе
            admins = await telegram_bot.get_chat_administrators(message.chat.id)
            admin_mentions = []
            for admin in admins:
                if admin.user.username:
                    admin_mentions.append(f"@{admin.user.username}")
                else:
                    admin_mentions.append(admin.user.first_name)
            
            notification_text = f"🔔 Вызов администраторов!\n\nПользователь {message.from_user.first_name} запросил помощь.\n\n"
            notification_text += "Администраторы: " + ", ".join(admin_mentions)
            
            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=notification_text
            )
            
            # НОВОЕ: Уведомление владельцу бота в ЛС
            await self.notify_bot_owner(message, telegram_bot)
            
            return True
        except TelegramAPIError as e:
            print(f"Failed to notify admins: {str(e)}")
            return False
    
    async def notify_bot_owner(self, message: Message, telegram_bot: Bot) -> None:
        """Отправить уведомление владельцу бота в ЛС"""
        try:
            from sqlalchemy import select
            from backend.database import AsyncSessionLocal
            from backend.models.bots import Bot as BotModel
            from backend.models.auth import User, TelegramAccount
            import os
            
            # Получаем владельца бота
            async with AsyncSessionLocal() as db:
                master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
                query = select(BotModel).where(BotModel.token == master_token)
                result = await db.execute(query)
                bot_model = result.scalar_one_or_none()
                
                if not bot_model:
                    return
                
                # Получаем Telegram ID владельца
                query = select(User).where(User.id == bot_model.owner_id)
                result = await db.execute(query)
                owner = result.scalar_one_or_none()
                
                if not owner or not owner.telegram_account:
                    return
                
                owner_telegram_id = owner.telegram_account.telegram_id
                
                # Формируем сообщение для владельца
                chat_title = message.chat.title or "Unknown Group"
                user_info = f"{message.from_user.first_name}"
                if message.from_user.username:
                    user_info += f" (@{message.from_user.username})"
                
                owner_message = (
                    f"🚨 ВЫЗОВ АДМИНИСТРАТОРА\n\n"
                    f"👤 Пользователь: {user_info}\n"
                    f"💬 Группа: {chat_title}\n"
                    f"🆔 Chat ID: {message.chat.id}\n"
                    f"📝 Текст: {message.text or 'N/A'}\n\n"
                    f"⏰ Время: {message.date.strftime('%Y-%m-%d %H:%M:%S') if message.date else 'N/A'}"
                )
                
                # Отправляем владельцу
                await telegram_bot.send_message(
                    chat_id=owner_telegram_id,
                    text=owner_message
                )
                
        except Exception as e:
            print(f"Failed to notify bot owner: {str(e)}")

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
                until_date = datetime.now(timezone.utc) + timedelta(minutes=time_minutes)
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
            until_date = datetime.now(timezone.utc) + timedelta(minutes=time_minutes)
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

