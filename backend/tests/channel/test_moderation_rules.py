"""Тесты use-case'ов модерации: CRUD правил + проверка сообщения."""

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.channels import ActionType, ChannelModerationRule
from backend.schemas.channels.moderation import (
    ChannelModerationRuleCreate,
    ChannelModerationRuleUpdate,
)
from backend.services.channel.features.moderation_rules.check_message import (
    CheckMessageAgainstRules,
)
from backend.services.channel.features.moderation_rules.create_rule import CreateModerationRule
from backend.services.channel.features.moderation_rules.delete_rule import DeleteModerationRule
from backend.services.channel.features.moderation_rules.list_rules import ListModerationRules
from backend.services.channel.features.moderation_rules.update_rule import UpdateModerationRule


@pytest.mark.asyncio
async def test_create_rule(db, test_user, test_channel):
    rule = await CreateModerationRule(db).execute(
        test_channel.id, test_user.id,
        ChannelModerationRuleCreate(phrase="мат", action=ActionType.DELETE),
    )
    await db.commit()
    assert rule.id is not None
    assert rule.phrase == "мат"
    assert rule.action == ActionType.DELETE


@pytest.mark.asyncio
async def test_create_404_for_foreign_channel(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await CreateModerationRule(db).execute(
            99999, test_user.id,
            ChannelModerationRuleCreate(phrase="x", action=ActionType.DELETE),
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_list_returns_only_channel_rules(db, test_user, test_channel):
    from backend.models.channels import ChannelGroup, ChannelType

    other = ChannelGroup(
        owner_id=test_user.id, telegram_id=-7,
        channel_type=ChannelType.CHANNEL, title="Other",
    )
    db.add(other)
    await db.commit()
    await db.refresh(other)

    for phrase in ["a", "b", "c"]:
        await CreateModerationRule(db).execute(
            test_channel.id, test_user.id,
            ChannelModerationRuleCreate(phrase=phrase, action=ActionType.DELETE),
        )
    await CreateModerationRule(db).execute(
        other.id, test_user.id,
        ChannelModerationRuleCreate(phrase="z", action=ActionType.DELETE),
    )
    await db.commit()

    rules = await ListModerationRules(db).execute(test_channel.id, test_user.id)
    assert {r.phrase for r in rules} == {"a", "b", "c"}


@pytest.mark.asyncio
async def test_update_partial(db, test_user, test_channel):
    rule = await CreateModerationRule(db).execute(
        test_channel.id, test_user.id,
        ChannelModerationRuleCreate(phrase="old", action=ActionType.DELETE),
    )
    await db.commit()

    updated = await UpdateModerationRule(db).execute(
        test_channel.id, rule.id, test_user.id,
        ChannelModerationRuleUpdate(phrase="new"),
    )
    await db.commit()
    assert updated.phrase == "new"
    assert updated.action == ActionType.DELETE


@pytest.mark.asyncio
async def test_delete_rule(db, test_user, test_channel):
    rule = await CreateModerationRule(db).execute(
        test_channel.id, test_user.id,
        ChannelModerationRuleCreate(phrase="bye", action=ActionType.DELETE),
    )
    await db.commit()
    rid = rule.id

    await DeleteModerationRule(db).execute(test_channel.id, rule.id, test_user.id)
    await db.commit()

    remaining = (await db.execute(
        select(ChannelModerationRule).where(ChannelModerationRule.id == rid)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_check_message_matches_rule(db, test_channel):
    db.add(ChannelModerationRule(
        channel_id=test_channel.id, phrase="запрещено", action=ActionType.DELETE,
    ))
    await db.commit()

    matched = await CheckMessageAgainstRules(db).execute(
        test_channel.id, "что-то ЗАПРЕЩЕНО говорить",
    )
    assert matched is not None
    assert matched.phrase == "запрещено"


@pytest.mark.asyncio
async def test_check_message_returns_none_when_no_match(db, test_channel):
    db.add(ChannelModerationRule(
        channel_id=test_channel.id, phrase="badword", action=ActionType.DELETE,
    ))
    await db.commit()

    matched = await CheckMessageAgainstRules(db).execute(
        test_channel.id, "обычное сообщение",
    )
    assert matched is None


@pytest.mark.asyncio
async def test_check_message_empty_text_returns_none(db, test_channel):
    matched = await CheckMessageAgainstRules(db).execute(test_channel.id, "")
    assert matched is None


@pytest.mark.asyncio
async def test_check_message_case_insensitive(db, test_channel):
    db.add(ChannelModerationRule(
        channel_id=test_channel.id, phrase="SHOUTING", action=ActionType.MUTE,
    ))
    await db.commit()

    matched = await CheckMessageAgainstRules(db).execute(
        test_channel.id, "stop shouting at me",
    )
    assert matched is not None
