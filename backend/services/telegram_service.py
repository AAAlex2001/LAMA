"""
Сервис для работы с Telegram Bot API.
Публикация контента в каналы, управление сообщениями.
"""

import os
from typing import Optional, List, Dict
from datetime import datetime
import asyncio

from telegram import Bot, InputMediaPhoto, InputMediaVideo, InputMediaAudio, InputMediaDocument
from telegram.constants import ParseMode
from telegram.error import TelegramError

from backend.models.publication import (
    PublicationCreate,
    PublicationResponse,
    ContentType,
    MediaContent,
)


class TelegramService:
    """Сервис для публикации в Telegram каналы."""

    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not self.bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN not set in environment")
        self.bot = Bot(token=self.bot_token)
        self.message_ids: Dict[str, List[int]] = {}

    async def publish_to_channel(
        self,
        channel_id: str,
        publication: PublicationCreate,
        publication_id: str,
    ) -> Dict[str, any]:
        """Публикация контента в Telegram канал."""
        try:
            result = None

            if publication.content_type == ContentType.TEXT:
                result = await self.send_text(channel_id, publication)

            elif publication.content_type == ContentType.TEXT_WITH_MEDIA:
                result = await self.send_text_with_media(channel_id, publication)

            elif publication.content_type == ContentType.IMAGE:
                result = await self.send_images(channel_id, publication)

            elif publication.content_type == ContentType.VIDEO:
                result = await self.send_videos(channel_id, publication)

            elif publication.content_type == ContentType.AUDIO:
                result = await self.send_audio(channel_id, publication)

            elif publication.content_type == ContentType.DOCUMENT:
                result = await self.send_documents(channel_id, publication)

            elif publication.content_type == ContentType.LINK:
                result = await self.send_link(channel_id, publication)

            elif publication.content_type == ContentType.POLL:
                result = await self.send_poll(channel_id, publication)

            elif publication.content_type == ContentType.QUIZ:
                result = await self.send_quiz(channel_id, publication)

            if result and publication.auto_pin:
                await self.pin_message(channel_id, result["message_id"])

            return {
                "success": True,
                "message_id": result["message_id"] if result else None,
                "channel_id": channel_id,
            }

        except TelegramError as e:
            return {
                "success": False,
                "error": str(e),
                "channel_id": channel_id,
            }

    async def send_text(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка текстового сообщения."""
        reply_markup = self.build_inline_keyboard(publication.inline_buttons)

        message = await self.bot.send_message(
            chat_id=channel_id,
            text=publication.text or "Пустое сообщение",
            parse_mode=ParseMode.HTML,
            reply_markup=reply_markup,
        )

        return {"message_id": message.message_id}

    async def send_text_with_media(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка текста с медиа (с блюром)."""
        if not publication.media or len(publication.media) == 0:
            return await self.send_text(channel_id, publication)

        media = publication.media[0]
        reply_markup = self.build_inline_keyboard(publication.inline_buttons)

        caption = publication.text or media.caption or ""

        message = await self.bot.send_photo(
            chat_id=channel_id,
            photo=media.url,
            caption=caption,
            parse_mode=ParseMode.HTML,
            has_spoiler=media.blur,
            reply_markup=reply_markup,
        )

        return {"message_id": message.message_id}

    async def send_images(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка изображений (одно или альбом)."""
        if not publication.media:
            raise ValueError("No media provided for image publication")

        reply_markup = self.build_inline_keyboard(publication.inline_buttons)

        if len(publication.media) == 1:
            media = publication.media[0]
            message = await self.bot.send_photo(
                chat_id=channel_id,
                photo=media.url,
                caption=publication.text or media.caption,
                parse_mode=ParseMode.HTML,
                has_spoiler=media.blur,
                reply_markup=reply_markup,
            )
            return {"message_id": message.message_id}
        else:
            media_group = [
                InputMediaPhoto(
                    media=m.url,
                    caption=m.caption if i == 0 and not publication.text else publication.text if i == 0 else None,
                    parse_mode=ParseMode.HTML,
                    has_spoiler=m.blur,
                )
                for i, m in enumerate(publication.media[:10])
            ]
            messages = await self.bot.send_media_group(chat_id=channel_id, media=media_group)
            return {"message_id": messages[0].message_id}

    async def send_videos(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка видео."""
        if not publication.media:
            raise ValueError("No media provided for video publication")

        media = publication.media[0]
        reply_markup = self.build_inline_keyboard(publication.inline_buttons)

        message = await self.bot.send_video(
            chat_id=channel_id,
            video=media.url,
            caption=publication.text or media.caption,
            parse_mode=ParseMode.HTML,
            has_spoiler=media.blur,
            reply_markup=reply_markup,
        )

        return {"message_id": message.message_id}

    async def send_audio(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка аудио."""
        if not publication.media:
            raise ValueError("No media provided for audio publication")

        media = publication.media[0]
        reply_markup = self.build_inline_keyboard(publication.inline_buttons)

        message = await self.bot.send_audio(
            chat_id=channel_id,
            audio=media.url,
            caption=publication.text or media.caption,
            parse_mode=ParseMode.HTML,
            reply_markup=reply_markup,
        )

        return {"message_id": message.message_id}

    async def send_documents(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка документов."""
        if not publication.media:
            raise ValueError("No media provided for document publication")

        media = publication.media[0]
        reply_markup = self.build_inline_keyboard(publication.inline_buttons)

        message = await self.bot.send_document(
            chat_id=channel_id,
            document=media.url,
            caption=publication.text or media.caption,
            parse_mode=ParseMode.HTML,
            reply_markup=reply_markup,
        )

        return {"message_id": message.message_id}

    async def send_link(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка ссылки с текстом."""
        text = f"{publication.text}\n\n{publication.link}" if publication.text else publication.link
        reply_markup = self.build_inline_keyboard(publication.inline_buttons)

        message = await self.bot.send_message(
            chat_id=channel_id,
            text=text,
            parse_mode=ParseMode.HTML,
            reply_markup=reply_markup,
            disable_web_page_preview=False,
        )

        return {"message_id": message.message_id}

    async def send_poll(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка опроса."""
        if not publication.poll:
            raise ValueError("No poll data provided")

        message = await self.bot.send_poll(
            chat_id=channel_id,
            question=publication.poll.question,
            options=[opt.text for opt in publication.poll.options],
            is_anonymous=publication.poll.is_anonymous,
            allows_multiple_answers=publication.poll.allows_multiple_answers,
        )

        return {"message_id": message.message_id}

    async def send_quiz(self, channel_id: str, publication: PublicationCreate) -> Dict:
        """Отправка викторины."""
        if not publication.poll:
            raise ValueError("No quiz data provided")

        message = await self.bot.send_poll(
            chat_id=channel_id,
            question=publication.poll.question,
            options=[opt.text for opt in publication.poll.options],
            type="quiz",
            correct_option_id=publication.poll.correct_option_id,
            is_anonymous=publication.poll.is_anonymous,
        )

        return {"message_id": message.message_id}

    def build_inline_keyboard(self, buttons: Optional[List[List[any]]]):
        """Построение inline клавиатуры."""
        if not buttons:
            return None

        from telegram import InlineKeyboardButton, InlineKeyboardMarkup

        keyboard = []
        for row in buttons:
            button_row = []
            for btn in row:
                button = InlineKeyboardButton(
                    text=btn.text,
                    url=btn.url if btn.url else None,
                    callback_data=btn.callback_data if btn.callback_data else None,
                )
                button_row.append(button)
            keyboard.append(button_row)

        return InlineKeyboardMarkup(keyboard)

    async def pin_message(self, channel_id: str, message_id: int) -> bool:
        """Закрепление сообщения в канале."""
        try:
            await self.bot.pin_chat_message(
                chat_id=channel_id,
                message_id=message_id,
                disable_notification=True,
            )
            return True
        except TelegramError:
            return False

    async def unpin_message(self, channel_id: str, message_id: int) -> bool:
        """Открепление сообщения."""
        try:
            await self.bot.unpin_chat_message(
                chat_id=channel_id,
                message_id=message_id,
            )
            return True
        except TelegramError:
            return False

    async def delete_message(self, channel_id: str, message_id: int) -> bool:
        """Удаление сообщения из канала."""
        try:
            await self.bot.delete_message(chat_id=channel_id, message_id=message_id)
            return True
        except TelegramError:
            return False

    async def edit_message(
        self,
        channel_id: str,
        message_id: int,
        new_text: str,
        inline_buttons: Optional[List[List[any]]] = None,
    ) -> bool:
        """Редактирование сообщения в канале."""
        try:
            reply_markup = self.build_inline_keyboard(inline_buttons)
            await self.bot.edit_message_text(
                chat_id=channel_id,
                message_id=message_id,
                text=new_text,
                parse_mode=ParseMode.HTML,
                reply_markup=reply_markup,
            )
            return True
        except TelegramError:
            return False

    async def get_channel_info(self, channel_id: str) -> Dict:
        """Получение информации о канале."""
        try:
            chat = await self.bot.get_chat(chat_id=channel_id)
            return {
                "id": chat.id,
                "title": chat.title,
                "username": chat.username,
                "type": chat.type,
                "description": chat.description,
            }
        except TelegramError as e:
            return {"error": str(e)}


__all__ = ["TelegramService"]


