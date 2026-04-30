from aiogram.types import Message, Update


class GetUpdateMessage:
    def execute(self, update: Update) -> Message | None:
        return (
            update.message
            or update.channel_post
            or update.edited_message
            or update.edited_channel_post
        )
