from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot.bot_settings import BotSettingsService
from backend.services.bot.bot_messaging import BotMessagingService
from backend.services.bot.bot_commands import BotCommandService
from backend.services.bot.bot_auto_reply import BotAutoReplyService
from backend.services.bot.bot_captcha import BotCaptchaService
from backend.services.bot.bot_welcome import BotWelcomeService
from backend.services.bot.bot_moderation import BotModerationService
from backend.services.bot.bot_recurring import BotRecurringService
from backend.services.bot.bot_triggers import BotTriggerService
from backend.services.bot.bot_shortcodes import ShortcodeProcessor

BotService = BotCrudService
CaptchaService = BotCaptchaService
ModerationTriggerService = BotModerationService
TriggerService = BotTriggerService
WelcomeService = BotWelcomeService
AutoReplyService = BotAutoReplyService
RecurringMessageService = BotRecurringService

__all__ = [
    "BotCrudService",
    "BotSettingsService",
    "BotMessagingService",
    "BotCommandService",
    "BotAutoReplyService",
    "BotCaptchaService",
    "BotWelcomeService",
    "BotModerationService",
    "BotRecurringService",
    "BotTriggerService",
    "ShortcodeProcessor",
    "BotService",
    "CaptchaService",
    "ModerationTriggerService",
    "TriggerService",
    "WelcomeService",
    "AutoReplyService",
    "RecurringMessageService",
]
