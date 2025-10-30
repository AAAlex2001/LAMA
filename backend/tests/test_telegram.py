"""
Тесты для Telegram интеграции.
Публикация в каналы, управление сообщениями.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from backend.services.telegram_service import TelegramService
from backend.models.publication import (
    PublicationCreate,
    ContentType,
    MediaContent,
    PollContent,
    PollOption,
    InlineButton,
)


@pytest.fixture
def mock_bot():
    """Мок Telegram бота."""
    with patch("backend.services.telegram_service.Bot") as mock:
        bot_instance = MagicMock()
        mock.return_value = bot_instance
        yield bot_instance


@pytest.fixture
def telegram_service(mock_bot):
    """Сервис с моком бота."""
    with patch.dict("os.environ", {"TELEGRAM_BOT_TOKEN": "test_token"}):
        service = TelegramService()
        service.bot = mock_bot
        return service


class TestTelegramPublishing:
    """Тесты публикации в Telegram."""

    @pytest.mark.asyncio
    async def test_send_text(self, telegram_service, mock_bot):
        """Отправка текста."""
        mock_message = MagicMock()
        mock_message.message_id = 123
        mock_bot.send_message = AsyncMock(return_value=mock_message)

        publication = PublicationCreate(
            content_type=ContentType.TEXT,
            text="Тестовое сообщение",
            channel_ids=["@test_channel"]
        )

        result = await telegram_service.send_text("@test_channel", publication)
        
        assert result["message_id"] == 123
        mock_bot.send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_image_with_blur(self, telegram_service, mock_bot):
        """Отправка изображения с блюром."""
        mock_message = MagicMock()
        mock_message.message_id = 456
        mock_bot.send_photo = AsyncMock(return_value=mock_message)

        publication = PublicationCreate(
            content_type=ContentType.IMAGE,
            text="Фото с блюром",
            media=[
                MediaContent(url="https://example.com/image.jpg", blur=True)
            ],
            channel_ids=["@test_channel"]
        )

        result = await telegram_service.send_images("@test_channel", publication)
        
        assert result["message_id"] == 456
        mock_bot.send_photo.assert_called_once()
        call_kwargs = mock_bot.send_photo.call_args[1]
        assert call_kwargs["has_spoiler"] is True

    @pytest.mark.asyncio
    async def test_send_multiple_images(self, telegram_service, mock_bot):
        """Отправка альбома изображений."""
        mock_messages = [MagicMock(message_id=i) for i in range(3)]
        mock_bot.send_media_group = AsyncMock(return_value=mock_messages)

        publication = PublicationCreate(
            content_type=ContentType.IMAGE,
            media=[
                MediaContent(url=f"https://example.com/image{i}.jpg", blur=False)
                for i in range(3)
            ],
            channel_ids=["@test_channel"]
        )

        result = await telegram_service.send_images("@test_channel", publication)
        
        assert result["message_id"] == 0
        mock_bot.send_media_group.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_poll(self, telegram_service, mock_bot):
        """Отправка опроса."""
        mock_message = MagicMock()
        mock_message.message_id = 789
        mock_bot.send_poll = AsyncMock(return_value=mock_message)

        publication = PublicationCreate(
            content_type=ContentType.POLL,
            poll=PollContent(
                question="Как дела?",
                options=[
                    PollOption(text="Отлично"),
                    PollOption(text="Нормально")
                ],
                is_anonymous=True,
                allows_multiple_answers=False
            ),
            channel_ids=["@test_channel"]
        )

        result = await telegram_service.send_poll("@test_channel", publication)
        
        assert result["message_id"] == 789
        mock_bot.send_poll.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_quiz(self, telegram_service, mock_bot):
        """Отправка викторины."""
        mock_message = MagicMock()
        mock_message.message_id = 999
        mock_bot.send_poll = AsyncMock(return_value=mock_message)

        publication = PublicationCreate(
            content_type=ContentType.QUIZ,
            poll=PollContent(
                question="Столица России?",
                options=[
                    PollOption(text="Москва"),
                    PollOption(text="Киев")
                ],
                is_quiz=True,
                correct_option_id=0,
                is_anonymous=False
            ),
            channel_ids=["@test_channel"]
        )

        result = await telegram_service.send_quiz("@test_channel", publication)
        
        assert result["message_id"] == 999
        mock_bot.send_poll.assert_called_once()
        call_kwargs = mock_bot.send_poll.call_args[1]
        assert call_kwargs["type"] == "quiz"
        assert call_kwargs["correct_option_id"] == 0

    @pytest.mark.asyncio
    async def test_send_with_inline_buttons(self, telegram_service, mock_bot):
        """Отправка с inline кнопками."""
        mock_message = MagicMock()
        mock_message.message_id = 111
        mock_bot.send_message = AsyncMock(return_value=mock_message)

        publication = PublicationCreate(
            content_type=ContentType.TEXT,
            text="С кнопками",
            inline_buttons=[
                [
                    InlineButton(text="Кнопка 1", url="https://example.com"),
                    InlineButton(text="Кнопка 2", callback_data="action")
                ]
            ],
            channel_ids=["@test_channel"]
        )

        result = await telegram_service.send_text("@test_channel", publication)
        
        assert result["message_id"] == 111
        call_kwargs = mock_bot.send_message.call_args[1]
        assert call_kwargs["reply_markup"] is not None


class TestTelegramMessageManagement:
    """Тесты управления сообщениями."""

    @pytest.mark.asyncio
    async def test_pin_message(self, telegram_service, mock_bot):
        """Закрепление сообщения."""
        mock_bot.pin_chat_message = AsyncMock()

        result = await telegram_service.pin_message("@test_channel", 123)
        
        assert result is True
        mock_bot.pin_chat_message.assert_called_once_with(
            chat_id="@test_channel",
            message_id=123,
            disable_notification=True
        )

    @pytest.mark.asyncio
    async def test_unpin_message(self, telegram_service, mock_bot):
        """Открепление сообщения."""
        mock_bot.unpin_chat_message = AsyncMock()

        result = await telegram_service.unpin_message("@test_channel", 123)
        
        assert result is True
        mock_bot.unpin_chat_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_message(self, telegram_service, mock_bot):
        """Удаление сообщения."""
        mock_bot.delete_message = AsyncMock()

        result = await telegram_service.delete_message("@test_channel", 123)
        
        assert result is True
        mock_bot.delete_message.assert_called_once_with(
            chat_id="@test_channel",
            message_id=123
        )

    @pytest.mark.asyncio
    async def test_edit_message(self, telegram_service, mock_bot):
        """Редактирование сообщения."""
        mock_bot.edit_message_text = AsyncMock()

        result = await telegram_service.edit_message(
            "@test_channel",
            123,
            "Новый текст"
        )
        
        assert result is True
        mock_bot.edit_message_text.assert_called_once()


class TestTelegramErrors:
    """Тесты обработки ошибок."""

    @pytest.mark.asyncio
    async def test_publish_error_handling(self, telegram_service, mock_bot):
        """Обработка ошибок при публикации."""
        from telegram.error import TelegramError
        
        mock_bot.send_message = AsyncMock(side_effect=TelegramError("Test error"))

        publication = PublicationCreate(
            content_type=ContentType.TEXT,
            text="Ошибка",
            channel_ids=["@test_channel"]
        )

        result = await telegram_service.publish_to_channel(
            "@test_channel",
            publication,
            "test-id"
        )
        
        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_pin_error_handling(self, telegram_service, mock_bot):
        """Обработка ошибок при закреплении."""
        from telegram.error import TelegramError
        
        mock_bot.pin_chat_message = AsyncMock(side_effect=TelegramError("Pin error"))

        result = await telegram_service.pin_message("@test_channel", 123)
        
        assert result is False


class TestChannelInfo:
    """Тесты получения информации о канале."""

    @pytest.mark.asyncio
    async def test_get_channel_info(self, telegram_service, mock_bot):
        """Получение информации о канале."""
        mock_chat = MagicMock()
        mock_chat.id = -1001234567890
        mock_chat.title = "Test Channel"
        mock_chat.username = "test_channel"
        mock_chat.type = "channel"
        mock_chat.description = "Test description"
        
        mock_bot.get_chat = AsyncMock(return_value=mock_chat)

        result = await telegram_service.get_channel_info("@test_channel")
        
        assert result["id"] == -1001234567890
        assert result["title"] == "Test Channel"
        assert result["username"] == "test_channel"


class TestHTMLEscaping:
    """Тесты экранирования HTML в предпросмотре."""

    def test_build_inline_keyboard(self, telegram_service):
        """Построение inline клавиатуры."""
        buttons = [
            [
                InlineButton(text="Button 1", url="https://example.com"),
                InlineButton(text="Button 2", callback_data="test")
            ]
        ]

        keyboard = telegram_service.build_inline_keyboard(buttons)
        
        assert keyboard is not None
        assert len(keyboard.inline_keyboard) == 1
        assert len(keyboard.inline_keyboard[0]) == 2

    def test_build_inline_keyboard_none(self, telegram_service):
        """Пустые кнопки."""
        keyboard = telegram_service.build_inline_keyboard(None)
        assert keyboard is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


