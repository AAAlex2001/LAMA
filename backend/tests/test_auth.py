"""
Тесты для эндпоинтов аутентификации.
Покрывает регистрацию, логин и авторизацию через Telegram.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import os

from backend.main import app

client = TestClient(app)


class TestRegistration:
    """Тесты для эндпоинта регистрации."""

    def test_register_success(self):
        """Успешная регистрация."""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "registered"
        assert data["user_email"] == "test@example.com"

    def test_register_invalid_email(self):
        """Регистрация с некорректным email."""
        response = client.post(
            "/auth/register",
            json={
                "email": "invalid-email",
                "password": "password123"
            }
        )
        assert response.status_code == 422

    def test_register_short_password(self):
        """Регистрация с коротким паролем."""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "123"
            }
        )
        assert response.status_code == 422

    def test_register_empty_data(self):
        """Регистрация с пустыми данными."""
        response = client.post("/auth/register", json={})
        assert response.status_code == 422


class TestLogin:
    """Тесты для эндпоинта логина."""

    def test_login_success(self):
        """Успешный логин."""
        response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "fake-token-for:test@example.com" in data["access_token"]

    def test_login_invalid_credentials(self):
        """Логин с неверными данными (пока заглушка принимает любые валидные данные)."""
        response = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword123"
            }
        )
        # TODO: Когда добавим реальную проверку БД, изменить на 401
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_login_invalid_email_format(self):
        """Логин с некорректным email."""
        response = client.post(
            "/auth/login",
            json={
                "email": "invalid-email",
                "password": "password123"
            }
        )
        assert response.status_code == 422


class TestTelegramAuth:
    """Тесты для авторизации через Telegram."""

    def test_telegram_auth_no_bot_token(self):
        """Ошибка при отсутствии токена бота."""
        with patch.dict(os.environ, {}, clear=True):
            response = client.post(
                "/auth/login/telegram",
                json={
                    "id": 123456789,
                    "first_name": "Test",
                    "last_name": "User",
                    "username": "testuser",
                    "auth_date": 1697234567,
                    "hash": "fake_hash"
                }
            )
            assert response.status_code == 500
            data = response.json()
            assert "Telegram bot token is not configured" in data["detail"]

    def test_telegram_auth_invalid_signature(self):
        """Ошибка при неверной подписи."""
        with patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token"}):
            response = client.post(
                "/auth/login/telegram",
                json={
                    "id": 123456789,
                    "first_name": "Test",
                    "last_name": "User",
                    "username": "testuser",
                    "auth_date": 1697234567,
                    "hash": "invalid_hash"
                }
            )
            assert response.status_code == 401
            data = response.json()
            assert data["detail"] == "Invalid Telegram signature"

    def test_telegram_auth_valid_signature(self):
        """Успешная авторизация с валидной подписью."""
        with patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token"}):
            with patch("backend.routes.auth.verify_telegram_hash", return_value=True):
                response = client.post(
                    "/auth/login/telegram",
                    json={
                        "id": 123456789,
                        "first_name": "Test",
                        "last_name": "User",
                        "username": "testuser",
                        "auth_date": 1697234567,
                        "hash": "valid_hash"
                    }
                )
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["user_id"] == 123456789
                assert "token" in data

    def test_telegram_auth_missing_required_fields(self):
        """Ошибка при отсутствии обязательных полей."""
        with patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token"}):
            response = client.post(
                "/auth/login/telegram",
                json={
                    "id": 123456789,
                    "first_name": "Test"
                }
            )
            assert response.status_code == 422


class TestHealthEndpoint:
    """Тесты для эндпоинта здоровья."""

    def test_health_check(self):
        """Проверка эндпоинта здоровья."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


if __name__ == "__main__":
    pytest.main([__file__])
