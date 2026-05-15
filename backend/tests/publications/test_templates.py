"""Тесты use-case'ов для текстовых шаблонов."""

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.publications import TextTemplate
from backend.schemas.publications.templates import TextTemplateCreate, TextTemplateUpdate
from backend.services.publications.features.templates.create_template import CreateTextTemplate
from backend.services.publications.features.templates.delete_template import DeleteTextTemplate
from backend.services.publications.features.templates.list_templates import ListTextTemplates
from backend.services.publications.features.templates.lookup import find_template_or_404
from backend.services.publications.features.templates.update_template import UpdateTextTemplate


@pytest.mark.asyncio
async def test_create_writes_template(db, test_user):
    template = await CreateTextTemplate(db).execute(
        test_user.id,
        TextTemplateCreate(name="Welcome", formatted_content={"text": "Hi"}),
    )
    await db.commit()

    assert template.id is not None
    assert template.name == "Welcome"
    assert template.owner_id == test_user.id


@pytest.mark.asyncio
async def test_list_filters_by_search(db, test_user):
    for name in ["Welcome", "Goodbye", "WelcomeBack"]:
        db.add(TextTemplate(owner_id=test_user.id, name=name, formatted_content={}))
    await db.commit()

    found = await ListTextTemplates(db).execute(test_user.id, search="welcome")
    names = [t.name for t in found.items]

    assert sorted(names) == ["Welcome", "WelcomeBack"]
    assert found.total == 2


@pytest.mark.asyncio
async def test_list_isolates_owners(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    db.add(TextTemplate(owner_id=other.id, name="Foreign", formatted_content={}))
    await db.commit()

    found = await ListTextTemplates(db).execute(test_user.id)
    assert found.items == []


@pytest.mark.asyncio
async def test_update_changes_only_provided_fields(db, test_user):
    tpl = TextTemplate(owner_id=test_user.id, name="Old", formatted_content={"a": 1})
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)

    updated = await UpdateTextTemplate(db).execute(
        tpl.id, test_user.id, TextTemplateUpdate(name="New"),
    )
    await db.commit()

    assert updated.name == "New"
    assert updated.formatted_content == {"a": 1}


@pytest.mark.asyncio
async def test_delete_removes_template(db, test_user):
    tpl = TextTemplate(owner_id=test_user.id, name="Bye", formatted_content={})
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    tpl_id = tpl.id

    await DeleteTextTemplate(db).execute(tpl_id, test_user.id)
    await db.commit()

    remaining = (await db.execute(
        select(TextTemplate).where(TextTemplate.id == tpl_id)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_find_or_404_for_unknown(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await find_template_or_404(db, 999, test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_find_or_404_filters_foreign(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    tpl = TextTemplate(owner_id=other.id, name="X", formatted_content={})
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)

    with pytest.raises(HTTPException) as exc:
        await find_template_or_404(db, tpl.id, test_user.id)
    assert exc.value.status_code == 404
