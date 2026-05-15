from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotCommand
from backend.schemas.publications.common import InlineButton


class GetCommandButton:
    """Достаёт кнопку команды бота по (command_id, button_id)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, command_id: int, button_id: str) -> InlineButton | None:
        result = await self.db.execute(
            select(BotCommand.response_buttons).where(BotCommand.id == command_id)
        )
        keyboard = result.scalar_one_or_none()
        rows = keyboard.get("buttons", []) if isinstance(keyboard, dict) else keyboard
        if not isinstance(rows, list):
            return None

        for row_index, row in enumerate(rows):
            button = self.get_button_from_row(row, row_index, button_id)
            if button:
                return button
        return None

    def get_button_from_row(
        self,
        row,
        row_index: int,
        button_id: str,
    ) -> InlineButton | None:
        if not isinstance(row, list):
            return None

        for button_index, button in enumerate(row):
            if self.is_target_button(button, row_index, button_index, button_id):
                return self.create_button(button)
        return None

    @staticmethod
    def is_target_button(
        button,
        row_index: int,
        button_index: int,
        button_id: str,
    ) -> bool:
        if not isinstance(button, dict):
            return False
        stored_id = button.get("id")
        fallback_id = f"{row_index}-{button_index}"
        return stored_id == button_id or (not stored_id and button_id == fallback_id)

    @staticmethod
    def create_button(button: dict) -> InlineButton:
        payload = {}
        for key, value in button.items():
            if key in InlineButton.model_fields:
                payload[key] = value
        return InlineButton.model_validate(payload)
