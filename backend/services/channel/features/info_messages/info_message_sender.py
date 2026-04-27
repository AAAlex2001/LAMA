from dataclasses import dataclass
from typing import Optional

from aiogram.enums import ParseMode
from aiogram.types import InputMediaDocument, InputMediaPhoto, InputMediaVideo, Message

from backend.models.bots import MessageType
from backend.models.channels import InformationalMessage
from backend.services.publications.utils.html_utils import clean_html_for_telegram
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard
from backend.utils.media import is_document_url, is_video_url


@dataclass
class SentInfoMessage:
    """Результат отправки info-сообщения: что прилетело от Telegram."""
    sent: Message
    type: MessageType
    media_url: Optional[str]
    text: str


async def send_info_message(
    bot: RateLimitedBot,
    chat_id: int,
    msg: InformationalMessage,
) -> Optional[SentInfoMessage]:
    """Отправляет info-сообщение и возвращает результат, либо None если контента нет."""
    text = clean_html_for_telegram(msg.text)
    keyboard = build_keyboard(msg.inline_keyboard) if msg.inline_keyboard else None
    urls = pick_urls(msg)

    if len(urls) > 1:
        sent = await send_album(bot, chat_id, urls, text, keyboard)
        return SentInfoMessage(sent=sent, type=MessageType.PHOTO, media_url=urls[0], text=text)

    if len(urls) == 1 and msg.media_type:
        sent, sent_type = await send_one_media(bot, chat_id, urls[0], msg.media_type.upper(), text, keyboard)
        return SentInfoMessage(sent=sent, type=sent_type, media_url=urls[0], text=text)

    if text:
        sent = await bot.send_message(chat_id=chat_id, text=text, parse_mode=ParseMode.HTML, reply_markup=keyboard)
        return SentInfoMessage(sent=sent, type=MessageType.TEXT, media_url=None, text=text)

    return None


def pick_urls(msg: InformationalMessage) -> list[str]:
    """Список url-ов медиа в порядке приоритета (media_urls > media_url)."""
    urls = [u for u in (msg.media_urls or []) if u]
    if urls:
        return urls
    return [msg.media_url] if msg.media_url else []


async def send_album(
    bot: RateLimitedBot,
    chat_id: int,
    urls: list[str],
    caption: str,
    keyboard,
) -> Message:
    """Отправляет альбом из 2..10 медиа; клавиатура шлётся отдельным сообщением."""
    media = [build_media_item(url, caption if i == 0 else None) for i, url in enumerate(urls[:10])]
    sent_messages = await bot.send_media_group(chat_id=chat_id, media=media)
    if keyboard:
        await bot.send_message(chat_id=chat_id, text="​", reply_markup=keyboard)
    return sent_messages[0]


def build_media_item(url: str, caption: Optional[str]):
    """Создаёт InputMedia* по типу URL."""
    parse_mode = ParseMode.HTML if caption else None
    if is_video_url(url):
        return InputMediaVideo(media=url, caption=caption, parse_mode=parse_mode)
    if is_document_url(url):
        return InputMediaDocument(media=url, caption=caption, parse_mode=parse_mode)
    return InputMediaPhoto(media=url, caption=caption, parse_mode=parse_mode)


async def send_one_media(
    bot: RateLimitedBot,
    chat_id: int,
    url: str,
    media_type: str,
    caption: str,
    keyboard,
) -> tuple[Message, MessageType]:
    """Отправляет одиночное photo/video/document или просто текст."""
    common = dict(chat_id=chat_id, caption=caption, parse_mode=ParseMode.HTML, reply_markup=keyboard)
    if media_type == "PHOTO":
        return await bot.send_photo(photo=url, **common), MessageType.PHOTO
    if media_type == "VIDEO":
        return await bot.send_video(video=url, **common), MessageType.VIDEO
    if media_type == "DOCUMENT":
        return await bot.send_document(document=url, **common), MessageType.DOCUMENT
    sent = await bot.send_message(
        chat_id=chat_id, text=caption or "", parse_mode=ParseMode.HTML, reply_markup=keyboard,
    )
    return sent, MessageType.TEXT
