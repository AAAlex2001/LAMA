"""Построение InputMedia* объектов для отправки в Telegram."""

from typing import Optional

from aiogram.enums import ParseMode
from aiogram.types import (
    InputMediaAudio,
    InputMediaDocument,
    InputMediaPhoto,
    InputMediaVideo,
    URLInputFile,
)

from backend.utils.media import is_audio_url, is_document_url, is_video_url


def build_media_item(media_url: str, caption: Optional[str], file_id: Optional[str] = None):
    """InputMedia* по типу URL. Для не-фото обёртывает в URLInputFile с filename."""
    parse_mode = ParseMode.HTML if caption else None
    media = wrap_media(media_url)

    if is_document_url(media_url):
        return InputMediaDocument(media=media, caption=caption, parse_mode=parse_mode)
    if is_audio_url(media_url):
        return InputMediaAudio(media=media, caption=caption, parse_mode=parse_mode)
    if is_video_url(media_url):
        return InputMediaVideo(media=media, caption=caption, parse_mode=parse_mode)
    return InputMediaPhoto(media=media, caption=caption, parse_mode=parse_mode)


def wrap_media(media_url: str):
    """URLInputFile с filename для media-файлов; URL-строку для фото."""
    if is_video_url(media_url) or is_document_url(media_url) or is_audio_url(media_url):
        filename = media_url.rsplit("/", 1)[-1].split("?")[0]
        return URLInputFile(media_url, filename=filename)
    return media_url
