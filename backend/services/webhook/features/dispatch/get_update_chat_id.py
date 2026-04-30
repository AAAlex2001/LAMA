from aiogram.types import Update

from backend.services.webhook.features.dispatch.get_update_message import (
    GetUpdateMessage,
)


class GetUpdateChatId:
    def execute(self, update: Update) -> int | None:
        message = GetUpdateMessage().execute(update)
        if message and message.chat:
            return message.chat.id
        if update.callback_query and update.callback_query.message:
            return update.callback_query.message.chat.id
        if update.chat_join_request and update.chat_join_request.chat:
            return update.chat_join_request.chat.id
        if update.chat_member and update.chat_member.chat:
            return update.chat_member.chat.id
        if update.my_chat_member and update.my_chat_member.chat:
            return update.my_chat_member.chat.id
        return None
