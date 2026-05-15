"""Тесты use-case'ов тегов: CRUD + get_or_create."""

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.publications import Tag
from backend.services.publications.features.tags.create_tag import CreateTag
from backend.services.publications.features.tags.delete_tag import DeleteTag
from backend.services.publications.features.tags.get_or_create_tags import GetOrCreateTags
from backend.services.publications.features.tags.list_tags import ListTags
from backend.services.publications.features.tags.lookup import find_tag_or_404
from backend.services.publications.features.tags.search_tags import SearchTags
from backend.services.publications.features.tags.update_tag import UpdateTag


@pytest.mark.asyncio
async def test_create_returns_new(db, test_user):
    tag = await CreateTag(db).execute(test_user.id, "news", "#ff0000")
    await db.commit()

    assert tag.id is not None
    assert tag.name == "news"
    assert tag.color == "#ff0000"
    assert tag.owner_id == test_user.id


@pytest.mark.asyncio
async def test_create_is_idempotent_by_name(db, test_user):
    first = await CreateTag(db).execute(test_user.id, "news", "#ff0000")
    await db.commit()
    second = await CreateTag(db).execute(test_user.id, "news", "#00ff00")
    await db.commit()

    assert first.id == second.id
    assert second.color == "#00ff00"  # цвет обновился


@pytest.mark.asyncio
async def test_list_returns_paginated(db, test_user):
    for n in ["a", "b", "c"]:
        await CreateTag(db).execute(test_user.id, n, None)
    await db.commit()

    items, total = await ListTags(db).execute(test_user.id, page=1, page_size=2)
    assert total == 3
    assert len(items) == 2


@pytest.mark.asyncio
async def test_search_matches_substring(db, test_user):
    for n in ["python", "rust", "pyramid"]:
        await CreateTag(db).execute(test_user.id, n, None)
    await db.commit()

    found = await SearchTags(db).execute(test_user.id, "py", limit=10)
    names = sorted(t.name for t in found)
    assert names == ["pyramid", "python"]


@pytest.mark.asyncio
async def test_update_renames_when_no_conflict(db, test_user):
    tag = await CreateTag(db).execute(test_user.id, "old", None)
    await db.commit()

    updated = await UpdateTag(db).execute(tag.id, test_user.id, "new", None)
    await db.commit()
    assert updated.name == "new"


@pytest.mark.asyncio
async def test_update_rejects_name_conflict(db, test_user):
    a = await CreateTag(db).execute(test_user.id, "a", None)
    b = await CreateTag(db).execute(test_user.id, "b", None)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await UpdateTag(db).execute(b.id, test_user.id, "a", None)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_delete_removes_tag(db, test_user):
    tag = await CreateTag(db).execute(test_user.id, "bye", None)
    await db.commit()
    tag_id = tag.id

    await DeleteTag(db).execute(tag_id, test_user.id)
    await db.commit()

    remaining = (await db.execute(
        select(Tag).where(Tag.id == tag_id)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_find_or_404_filters_foreign(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign = await CreateTag(db).execute(other.id, "x", None)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await find_tag_or_404(db, foreign.id, test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_or_create_creates_missing(db, test_user):
    tags = await GetOrCreateTags(db).execute(
        ["one", "two"], owner_id=test_user.id,
    )
    await db.commit()
    assert sorted(t.name for t in tags) == ["one", "two"]
    assert all(t.id is not None for t in tags)


@pytest.mark.asyncio
async def test_get_or_create_reuses_existing(db, test_user):
    existing = await CreateTag(db).execute(test_user.id, "shared", "#000")
    await db.commit()

    tags = await GetOrCreateTags(db).execute(
        ["shared", "new"], owner_id=test_user.id,
    )
    await db.commit()

    shared = next(t for t in tags if t.name == "shared")
    assert shared.id == existing.id


@pytest.mark.asyncio
async def test_get_or_create_applies_per_index_colors(db, test_user):
    tags = await GetOrCreateTags(db).execute(
        ["a", "b"],
        tag_colors=["#111", "#222"],
        owner_id=test_user.id,
    )
    await db.commit()
    by_name = {t.name: t.color for t in tags}
    assert by_name == {"a": "#111", "b": "#222"}
