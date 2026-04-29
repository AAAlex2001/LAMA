"""Pure-helpers для извлечения media-полей из SendMessageRequest."""

from typing import List

from backend.schemas.bots.messages import SendMessageRequest


def get_request_media_urls(request: SendMessageRequest) -> List[str]:
    """media_urls > media_url > []; убирает пустые значения."""
    if request.media_urls:
        return [url for url in request.media_urls if url]
    if request.media_url:
        return [request.media_url]
    return []


def get_request_media_file_ids(request: SendMessageRequest) -> List[str]:
    """media_file_ids без пустых; пустой list если нет."""
    if request.media_file_ids:
        return [fid for fid in request.media_file_ids if fid]
    return []
