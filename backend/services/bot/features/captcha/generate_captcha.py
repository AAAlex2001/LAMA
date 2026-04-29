"""Генерация математической капчи (вопрос + правильный ответ)."""

import random


def generate_captcha() -> tuple[str, str]:
    """Возвращает (question, answer); ответ — строка для прямого сравнения."""
    a, b = random.randint(1, 10), random.randint(1, 10)
    return f"Сколько будет {a} + {b}?", str(a + b)
