"""
Тесты для AI редактора (DeepSeek интеграция).
"""

import pytest
from unittest.mock import MagicMock, patch
import os

from backend.services.publication_service import PublicationService
from backend.models.publication import AITextRequest


class TestAIEditor:
    """Тесты для AI текстового редактора."""

    @pytest.fixture
    def service_with_ai(self):
        """Сервис с настроенным AI клиентом."""
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key"}):
            with patch("backend.services.publication_service.OpenAI") as mock_openai:
                service = PublicationService()
                service.ai_client = MagicMock()
                return service

    @pytest.fixture
    def service_without_ai(self):
        """Сервис без AI ключа."""
        with patch.dict(os.environ, {}, clear=True):
            service = PublicationService()
            return service

    def test_ai_generate_text_success(self, service_with_ai):
        """Успешная генерация текста."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "🚀 Сгенерированный пост о программировании"
        service_with_ai.ai_client.chat.completions.create.return_value = mock_response

        request = AITextRequest(
            action="generate",
            prompt="Напиши пост о программировании"
        )

        result = service_with_ai.ai_generate_text(request)

        assert "Сгенерированный пост" in result.text
        service_with_ai.ai_client.chat.completions.create.assert_called_once()

    def test_ai_edit_text_success(self, service_with_ai):
        """Успешное редактирование текста."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Улучшенный текст ✨"
        service_with_ai.ai_client.chat.completions.create.return_value = mock_response

        request = AITextRequest(
            action="edit",
            text="Исходный текст",
            instruction="Сделай более креативным"
        )

        result = service_with_ai.ai_generate_text(request)

        assert "Улучшенный текст" in result.text

    def test_ai_generate_with_correct_model(self, service_with_ai):
        """Проверка использования правильной модели."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Тест"
        service_with_ai.ai_client.chat.completions.create.return_value = mock_response

        request = AITextRequest(action="generate", prompt="test")
        service_with_ai.ai_generate_text(request)

        call_kwargs = service_with_ai.ai_client.chat.completions.create.call_args[1]
        assert call_kwargs["model"] == "deepseek-chat"

    def test_ai_generate_with_system_prompt(self, service_with_ai):
        """Проверка системного промпта."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Тест"
        service_with_ai.ai_client.chat.completions.create.return_value = mock_response

        request = AITextRequest(action="generate", prompt="test")
        service_with_ai.ai_generate_text(request)

        call_kwargs = service_with_ai.ai_client.chat.completions.create.call_args[1]
        messages = call_kwargs["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "контент-менеджер" in messages[0]["content"]

    def test_ai_without_api_key(self, service_without_ai):
        """Ошибка при отсутствии API ключа."""
        request = AITextRequest(action="generate", prompt="test")
        result = service_without_ai.ai_generate_text(request)

        assert "недоступен" in result.text
        assert "DEEPSEEK_API_KEY" in result.text

    def test_ai_unknown_action(self, service_with_ai):
        """Неизвестное действие."""
        request = AITextRequest(action="unknown", prompt="test")
        result = service_with_ai.ai_generate_text(request)

        assert "Неизвестное действие" in result.text

    def test_ai_api_error_handling(self, service_with_ai):
        """Обработка ошибок API."""
        service_with_ai.ai_client.chat.completions.create.side_effect = Exception("API Error")

        request = AITextRequest(action="generate", prompt="test")
        result = service_with_ai.ai_generate_text(request)

        assert "Ошибка AI" in result.text
        assert "API Error" in result.text

    def test_ai_generate_prompt_format(self, service_with_ai):
        """Проверка формата промпта для генерации."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Результат"
        service_with_ai.ai_client.chat.completions.create.return_value = mock_response

        request = AITextRequest(
            action="generate",
            prompt="О технологиях"
        )
        service_with_ai.ai_generate_text(request)

        call_kwargs = service_with_ai.ai_client.chat.completions.create.call_args[1]
        user_message = call_kwargs["messages"][1]["content"]
        assert "О технологиях" in user_message
        assert "эмодзи" in user_message

    def test_ai_edit_prompt_format(self, service_with_ai):
        """Проверка формата промпта для редактирования."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Результат"
        service_with_ai.ai_client.chat.completions.create.return_value = mock_response

        request = AITextRequest(
            action="edit",
            text="Старый текст",
            instruction="Улучши"
        )
        service_with_ai.ai_generate_text(request)

        call_kwargs = service_with_ai.ai_client.chat.completions.create.call_args[1]
        user_message = call_kwargs["messages"][1]["content"]
        assert "Старый текст" in user_message
        assert "Улучши" in user_message

    def test_ai_temperature_setting(self, service_with_ai):
        """Проверка настройки temperature."""
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Тест"
        service_with_ai.ai_client.chat.completions.create.return_value = mock_response

        request = AITextRequest(action="generate", prompt="test")
        service_with_ai.ai_generate_text(request)

        call_kwargs = service_with_ai.ai_client.chat.completions.create.call_args[1]
        assert call_kwargs["temperature"] == 0.7
        assert call_kwargs["max_tokens"] == 1000


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


