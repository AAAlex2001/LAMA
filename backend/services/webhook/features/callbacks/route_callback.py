from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.webhook.features.callbacks.admin.execute_admin_action import (
    ExecuteAdminAction,
)
from backend.services.webhook.features.callbacks.commands.execute_callback_action import (
    ExecuteCallbackAction as ExecuteCommandCallbackAction,
)
from backend.services.webhook.features.callbacks.commands.show_hidden_text import (
    ShowHiddenText as ShowCommandHiddenText,
)
from backend.services.webhook.features.callbacks.publications.execute_callback_action import (
    ExecuteCallbackAction as ExecutePublicationCallbackAction,
)
from backend.services.webhook.features.callbacks.publications.show_hidden_text import (
    ShowHiddenText as ShowPublicationHiddenText,
)
from backend.services.webhook.features.captcha.check_group_captcha import CheckGroupCaptcha
from backend.services.webhook.features.captcha.check_private_captcha import (
    CheckPrivateCaptcha,
)


class RouteCallback:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.private_captcha = CheckPrivateCaptcha(db, bot_model)
        self.group_captcha = CheckGroupCaptcha(db, bot_model)
        self.admin_action = ExecuteAdminAction(db, bot_model)
        self.publication_hidden_text = ShowPublicationHiddenText(db, bot_model)
        self.publication_callback = ExecutePublicationCallbackAction(db, bot_model)
        self.command_hidden_text = ShowCommandHiddenText(db, bot_model)
        self.command_callback = ExecuteCommandCallbackAction(db, bot_model)

    async def execute(self, callback_query: CallbackQuery) -> None:
        callback_data = callback_query.data
        if not callback_data:
            return

        if callback_data.startswith("group_captcha_"):
            await self.group_captcha.execute(callback_query)
            return
        if callback_data.startswith("captcha_"):
            await self.private_captcha.execute(callback_query)
            return
        if callback_data.startswith("admincall_"):
            await self.admin_action.execute(callback_query)
            return
        if callback_data.startswith("hidden_text:"):
            await self.publication_hidden_text.execute(callback_query)
            return
        if callback_data.startswith("callback:"):
            await self.publication_callback.execute(callback_query)
            return
        if callback_data.startswith("cmd_hidden:"):
            await self.command_hidden_text.execute(callback_query)
            return
        if callback_data.startswith("cmd_callback:"):
            await self.command_callback.execute(callback_query)
