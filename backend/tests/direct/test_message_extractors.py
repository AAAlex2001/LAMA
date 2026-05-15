"""Тесты pure-helpers для разбора Message / dict."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.services.direct.features.utils.message_extractors import (
    extract_file_id_from_collection,
    extract_file_id_from_entity,
    extract_nested_id,
    get_raw_message_data,
    message_get,
)


def test_message_get_from_dict():
    assert message_get({"text": "hi"}, "text") == "hi"
    assert message_get({"text": "hi"}, "missing", default="x") == "x"


def test_message_get_from_object():
    msg = SimpleNamespace(text="привет", chat_id=42)
    assert message_get(msg, "text") == "привет"
    assert message_get(msg, "chat_id") == 42
    assert message_get(msg, "missing") is None
    assert message_get(msg, "missing", default="fallback") == "fallback"


def test_get_raw_returns_dict_as_is():
    data = {"a": 1}
    assert get_raw_message_data(data) is data


def test_extract_nested_id_from_dict():
    assert extract_nested_id({"id": 42}) == 42


def test_extract_nested_id_from_object():
    obj = SimpleNamespace(id=42)
    assert extract_nested_id(obj) == 42


def test_extract_nested_id_custom_key():
    assert extract_nested_id({"telegram_id": 100}, key="telegram_id") == 100


def test_extract_nested_id_raises_when_none():
    with pytest.raises(HTTPException) as exc:
        extract_nested_id(None)
    assert exc.value.status_code == 404


def test_extract_nested_id_raises_when_key_missing():
    with pytest.raises(HTTPException) as exc:
        extract_nested_id({"other_key": 1})
    assert exc.value.status_code == 404


def test_extract_file_id_from_entity_dict():
    assert extract_file_id_from_entity({"file_id": "abc"}) == "abc"


def test_extract_file_id_from_entity_object():
    assert extract_file_id_from_entity(SimpleNamespace(file_id="xyz")) == "xyz"


def test_extract_file_id_from_entity_none():
    assert extract_file_id_from_entity(None) is None


def test_extract_file_id_from_entity_empty_file_id():
    assert extract_file_id_from_entity({"file_id": None}) is None
    assert extract_file_id_from_entity({"file_id": ""}) is None


def test_extract_file_id_from_collection_photo_array():
    """Для фото — берём последний (самый крупный размер)."""
    photos = [
        {"file_id": "small"},
        {"file_id": "medium"},
        {"file_id": "large"},
    ]
    assert extract_file_id_from_collection(photos) == "large"


def test_extract_file_id_from_collection_single():
    assert extract_file_id_from_collection({"file_id": "x"}) == "x"


def test_extract_file_id_from_collection_empty():
    assert extract_file_id_from_collection([]) is None
    assert extract_file_id_from_collection(None) is None


def test_extract_file_id_from_collection_str_not_iterable():
    """Строка не должна обрабатываться как Sequence."""
    assert extract_file_id_from_collection("file_id") is None
