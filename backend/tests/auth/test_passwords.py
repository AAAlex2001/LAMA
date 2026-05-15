"""Тесты bcrypt-обёртки."""

from backend.services.auth.features.email.passwords import hash_password, verify_password


def test_hash_returns_different_each_time():
    """bcrypt.gensalt — соль случайная, два хеша одного пароля разные."""
    assert hash_password("secret") != hash_password("secret")


def test_verify_correct_password():
    password = "Strong_Password_123"
    assert verify_password(password, hash_password(password)) is True


def test_verify_wrong_password():
    assert verify_password("wrong", hash_password("right")) is False


def test_verify_handles_broken_hash():
    """Битый хеш в БД — возвращаем False, не падаем."""
    assert verify_password("any", "not-a-valid-bcrypt-hash") is False


def test_verify_handles_empty_hash():
    assert verify_password("any", "") is False
