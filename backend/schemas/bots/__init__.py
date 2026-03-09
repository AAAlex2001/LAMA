"""
Схемы для работы с ботами. Реэкспорт для обратной совместимости.
Доменная область логически разбита на модули.
"""

from .bot import (
    BotBase,
    BotCreate,
    BotUpdate,
    BotResponse,
    BotListResponse,
    SyncBotRequest,
    SyncBotResponse,
    BotStatsResponse
)

from .commands import (
    BotCommandCreate,
    BotCommandUpdate,
    BotCommandResponse,
    BotCommandListResponse
)

from .auto_reply import (
    AutoReplyCreate,
    AutoReplyUpdate,
    AutoReplyResponse,
    AutoReplyListResponse
)

from .triggers import (
    TriggerCreate,
    TriggerUpdate,
    TriggerResponse,
    TriggerListResponse
)

from .recurring import (
    RecurringMessageCreate,
    RecurringMessageUpdate,
    RecurringMessageResponse,
    RecurringMessageListResponse
)

from .welcome import (
    AutoApprovalUpdate,
    AutoApprovalResponse,
    WelcomeSettingsUpdate,
    WelcomeSettingsResponse
)

from .messages import (
    SendMessageRequest,
    BotMessageResponse,
    BotMessageListResponse,
    BroadcastResult,
    BroadcastResponse,
)

__all__ = [
    "BotBase", "BotCreate", "BotUpdate", "BotResponse", "BotListResponse", "SyncBotRequest", "SyncBotResponse", "BotStatsResponse",
    "BotCommandCreate", "BotCommandUpdate", "BotCommandResponse", "BotCommandListResponse",
    "AutoReplyCreate", "AutoReplyUpdate", "AutoReplyResponse", "AutoReplyListResponse",
    "TriggerCreate", "TriggerUpdate", "TriggerResponse", "TriggerListResponse",
    "RecurringMessageCreate", "RecurringMessageUpdate", "RecurringMessageResponse", "RecurringMessageListResponse",
    "AutoApprovalUpdate", "AutoApprovalResponse", "WelcomeSettingsUpdate", "WelcomeSettingsResponse",
    "SendMessageRequest", "BotMessageResponse", "BotMessageListResponse", "BroadcastResult", "BroadcastResponse",
]