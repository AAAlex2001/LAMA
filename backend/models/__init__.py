"""Пакет SQLAlchemy-моделей.

Приложению важно импортировать модули моделей, чтобы SQLAlchemy корректно
разрешал строковые relationship-ссылки.
"""

from __future__ import annotations

import importlib


def load_models() -> None:

    """Импортировать все модули моделей для регистрации в SQLAlchemy."""

    modules = (
        "backend.models.auth",
        "backend.models.bots",
        "backend.models.channels",
        "backend.models.publications",
        "backend.models.landing",
        "backend.models.inbox",
        "backend.models.direct",
    )

    for module_name in modules:
        importlib.import_module(module_name)


