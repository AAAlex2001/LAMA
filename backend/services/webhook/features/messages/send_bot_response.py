from aiogram.types import InputMediaDocument, InputMediaPhoto, InputMediaVideo, Message

from backend.models.bots import MessageType
from backend.utils import build_keyboard
from backend.utils.media import is_document_url, is_video_url


class SendBotResponse:
    """Универсальный шлёт-сообщение от бота: текст + медиа + buttons."""

    async def execute(
        self,
        telegram_bot,
        chat_id: int,
        text: str,
        media_url: str | None = None,
        media_urls: list[str] | None = None,
        media_type: MessageType | None = None,
        buttons: dict | None = None,
    ) -> Message | None:
        reply_markup = build_keyboard(buttons)
        urls = [url for url in (media_urls or []) if url]
        if not urls and media_url:
            urls = [media_url]

        if len(urls) > 1:
            await telegram_bot.send_media_group(
                chat_id=chat_id,
                media=self.get_media_group(text, urls),
            )
            if reply_markup:
                await telegram_bot.send_message(
                    chat_id=chat_id,
                    text=" ",
                    reply_markup=reply_markup,
                )
            return None

        if urls and media_type == MessageType.PHOTO:
            return await telegram_bot.send_photo(
                chat_id=chat_id,
                photo=urls[0],
                caption=text,
                reply_markup=reply_markup,
            )
        if urls and media_type == MessageType.VIDEO:
            return await telegram_bot.send_video(
                chat_id=chat_id,
                video=urls[0],
                caption=text,
                reply_markup=reply_markup,
            )
        if urls and media_type == MessageType.DOCUMENT:
            return await telegram_bot.send_document(
                chat_id=chat_id,
                document=urls[0],
                caption=text,
                reply_markup=reply_markup,
            )

        return await telegram_bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=reply_markup,
        )

    @staticmethod
    def get_media_group(text: str, urls: list[str]) -> list:
        media_group = []
        for index, url in enumerate(urls[:10]):
            caption = text if index == 0 else None
            if is_video_url(url):
                media_group.append(InputMediaVideo(media=url, caption=caption))
            elif is_document_url(url):
                media_group.append(InputMediaDocument(media=url, caption=caption))
            else:
                media_group.append(InputMediaPhoto(media=url, caption=caption))
        return media_group
