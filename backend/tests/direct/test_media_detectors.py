"""Тесты pure-helpers для определения типа медиа."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.models.bots import MessageType
from backend.services.direct.features.utils.media_detectors import (
    detect_media_type,
    extract_incoming_media,
    extract_media_file_id,
    extract_media_type,
)


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://cdn/a.jpg", MessageType.PHOTO),
        ("https://cdn/a.png", MessageType.PHOTO),
        ("https://cdn/a.mp4", MessageType.VIDEO),
        ("https://cdn/a.mov", MessageType.VIDEO),
        ("https://cdn/a.mp3", MessageType.AUDIO),
        ("https://cdn/a.pdf", MessageType.DOCUMENT),
        ("https://cdn/a.docx", MessageType.DOCUMENT),
    ],
)
def test_detect_media_type_by_extension(url, expected):
    assert detect_media_type(url) == expected


def test_detect_media_type_unknown_defaults_to_photo():
    assert detect_media_type("https://cdn/file.xyz") == MessageType.PHOTO


def test_extract_incoming_returns_photo():
    photo = [SimpleNamespace(file_id="ph_1"), SimpleNamespace(file_id="ph_2")]
    msg = SimpleNamespace(photo=photo, video=None, document=None, audio=None,
                          voice=None, animation=None, sticker=None,
                          raw_data=None, model_dump=None)
    media_type, file_id = extract_incoming_media(msg)
    assert media_type == MessageType.PHOTO


def test_extract_incoming_returns_video():
    msg = SimpleNamespace(
        photo=None,
        video=SimpleNamespace(file_id="v_id"),
        document=None, audio=None, voice=None, animation=None, sticker=None,
        raw_data=None, model_dump=None,
    )
    media_type, file_id = extract_incoming_media(msg)
    assert media_type == MessageType.VIDEO
    assert file_id == "v_id"


def test_extract_incoming_returns_text_when_nothing():
    msg = SimpleNamespace(
        photo=None, video=None, document=None, audio=None,
        voice=None, animation=None, sticker=None,
        raw_data=None, model_dump=None,
    )
    media_type, file_id = extract_incoming_media(msg)
    assert media_type == MessageType.TEXT
    assert file_id is None


def test_extract_media_type_outgoing_text():
    msg = SimpleNamespace(
        photo=None, video=None, document=None, audio=None,
        voice=None, animation=None, sticker=None,
        text="hello", caption=None,
    )
    assert extract_media_type(msg) == MessageType.TEXT


def test_extract_media_type_outgoing_video():
    msg = SimpleNamespace(
        photo=None, video=SimpleNamespace(file_id="x"),
        document=None, audio=None, voice=None, animation=None, sticker=None,
        text=None, caption=None,
    )
    assert extract_media_type(msg) == MessageType.VIDEO


def test_extract_media_type_uses_fallback():
    msg = SimpleNamespace(
        photo=None, video=None, document=None, audio=None,
        voice=None, animation=None, sticker=None,
        text=None, caption=None,
    )
    assert extract_media_type(msg, fallback=MessageType.PHOTO) == MessageType.PHOTO


def test_extract_media_file_id_photo_picks_last():
    msg = SimpleNamespace(
        photo=[SimpleNamespace(file_id="small"), SimpleNamespace(file_id="large")],
    )
    assert extract_media_file_id(msg, MessageType.PHOTO) == "large"


def test_extract_media_file_id_video():
    msg = SimpleNamespace(video=SimpleNamespace(file_id="v123"))
    assert extract_media_file_id(msg, MessageType.VIDEO) == "v123"


def test_extract_media_file_id_text_returns_none():
    msg = SimpleNamespace()
    assert extract_media_file_id(msg, MessageType.TEXT) is None


def test_extract_media_file_id_404_when_missing():
    msg = SimpleNamespace(video=None)
    with pytest.raises(HTTPException) as exc:
        extract_media_file_id(msg, MessageType.VIDEO)
    assert exc.value.status_code == 404
