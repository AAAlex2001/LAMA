from typing import List, Optional

from backend.models.publications import ContentType as DBContentType, Publication


def validate_media_urls(publication: Publication) -> None:
    """Ensure media URLs exist for content types that require media."""
    content_type = publication.content_type
    if content_type in [DBContentType.IMAGE, DBContentType.VIDEO, DBContentType.AUDIO, DBContentType.DOCUMENT]:
        if not publication.media_urls or not publication.media_urls[0]:
            type_name = content_type.value.upper()
            raise ValueError(f"media_urls is required for {type_name} content type")


def get_spoiler(blur_list: Optional[List[bool]], index: int) -> bool:
    """Return spoiler flag for media item by index."""
    if blur_list and index < len(blur_list):
        return bool(blur_list[index])
    return False
