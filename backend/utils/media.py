"""Утилиты определения типа медиа по URL."""

VIDEO_EXTENSIONS = (".mp4", ".mov", ".m4v", ".webm", ".avi")
AUDIO_EXTENSIONS = (".mp3", ".wav", ".ogg", ".m4a", ".flac")
DOCUMENT_EXTENSIONS = (".pdf", ".doc", ".docx", ".txt", ".zip", ".rar")


def is_video_url(url: str) -> bool:
    """Проверить что URL указывает на видео-файл."""
    return url.lower().endswith(VIDEO_EXTENSIONS)


def is_document_url(url: str) -> bool:
    """Проверить что URL указывает на документ."""
    return url.lower().endswith(DOCUMENT_EXTENSIONS)


def is_audio_url(url: str) -> bool:
    """Проверить что URL указывает на аудио-файл."""
    return url.lower().endswith(AUDIO_EXTENSIONS)
