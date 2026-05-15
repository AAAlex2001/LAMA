from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, MessageType
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.webhook.features.messages.save_outgoing_if_direct import (
    SaveOutgoingIfDirect,
)
from backend.services.webhook.features.messages.send_bot_response import SendBotResponse
from backend.services.webhook.types import GetShortcodeContext


class SendCommandResponse:
    """Отправляет ответ на кастомную команду из bot_commands."""

    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot

    async def execute(self, message: Message, command) -> None:
        context = GetShortcodeContext().execute(message, self.bot_model)
        text = ShortcodeProcessor.process(command.response_text, context)
        buttons = self.get_buttons(command)
        sent_message = await SendBotResponse().execute(
            telegram_bot=self.telegram_bot,
            chat_id=message.chat.id,
            text=text,
            media_url=command.response_media_url,
            media_urls=getattr(command, "response_media_urls", None),
            media_type=command.response_media_type,
            buttons=buttons,
        )
        await SaveOutgoingIfDirect(self.db, self.bot_model).execute(
            chat_id=message.chat.id,
            tg_message=sent_message,
            fallback_type=command.response_media_type or MessageType.TEXT,
            fallback_media_url=command.response_media_url,
        )

    @staticmethod
    def get_buttons(command) -> dict | None:
        buttons = command.response_buttons
        if not buttons or not isinstance(buttons, dict) or "buttons" not in buttons:
            return buttons

        rows = []
        for row_index, row in enumerate(buttons.get("buttons", [])):
            if not isinstance(row, list):
                continue

            output_row = []
            for button_index, button in enumerate(row):
                normalized = SendCommandResponse.get_button(
                    command.id,
                    row_index,
                    button_index,
                    button,
                )
                if normalized:
                    output_row.append(normalized)

            if output_row:
                rows.append(output_row)

        return {"buttons": rows} if rows else None

    @staticmethod
    def get_button(
        command_id: int,
        row_index: int,
        button_index: int,
        button: dict,
    ) -> dict | None:
        if not isinstance(button, dict):
            return None

        if button.get("type") == "url" and button.get("url"):
            return {"text": button.get("text", ""), "url": button["url"]}

        has_hidden_text = bool(
            button.get("hidden_text_subscribed")
            or button.get("hidden_text_unsubscribed")
        )
        if not (button.get("callback_action") or has_hidden_text):
            return None

        button_id = button.get("id") or f"{row_index}-{button_index}"
        prefix = "cmd_hidden" if has_hidden_text else "cmd_callback"
        return {
            "text": button.get("text", ""),
            "callback_data": f"{prefix}:{command_id}:{button_id}",
        }
