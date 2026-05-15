"""Тесты бэкапа: update_mode, list_posts, get_stats."""

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from backend.models.channels import (
    BackedUpPost,
    BackupMode,
    ChannelGroup,
    ChannelType,
    PostRetransmission,
)
from backend.services.channel.features.backup.get_stats import GetBackupStats
from backend.services.channel.features.backup.list_posts import ListBackedUpPosts
from backend.services.channel.features.backup.update_mode import UpdateBackupMode


@pytest.mark.asyncio
async def test_update_mode_saves_fields(db, test_user, test_channel):
    target = ChannelGroup(
        owner_id=test_user.id, telegram_id=-2,
        channel_type=ChannelType.CHANNEL, title="Target",
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)

    channel = await UpdateBackupMode(db).execute(
        channel_id=test_channel.id, owner_id=test_user.id,
        backup_mode=BackupMode.INSTANT,
        backup_target_ids=[target.id],
        backup_post_types=["text_posts", "with_attachments"],
        backup_content_types=["photo", "video"],
    )
    await db.commit()

    assert channel.backup_mode == BackupMode.INSTANT
    assert channel.backup_target_ids == [target.id]
    assert channel.backup_target_id == target.id
    assert channel.backup_post_types == ["text_posts", "with_attachments"]


@pytest.mark.asyncio
async def test_update_mode_404_for_unowned_target(db, test_user, test_channel):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign_target = ChannelGroup(
        owner_id=other.id, telegram_id=-9,
        channel_type=ChannelType.CHANNEL, title="Foreign",
    )
    db.add(foreign_target)
    await db.commit()
    await db.refresh(foreign_target)

    with pytest.raises(HTTPException) as exc:
        await UpdateBackupMode(db).execute(
            channel_id=test_channel.id, owner_id=test_user.id,
            backup_mode=BackupMode.INSTANT,
            backup_target_ids=[foreign_target.id],
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_mode_disabled_accepts_no_targets(db, test_user, test_channel):
    channel = await UpdateBackupMode(db).execute(
        channel_id=test_channel.id, owner_id=test_user.id,
        backup_mode=BackupMode.DISABLED,
    )
    await db.commit()
    assert channel.backup_mode == BackupMode.DISABLED
    assert channel.backup_target_ids is None


@pytest.mark.asyncio
async def test_list_posts_returns_paginated(db, test_user, test_channel):
    for i in range(5):
        db.add(BackedUpPost(
            channel_id=test_channel.id,
            telegram_message_id=100 + i,
            content_type="text",
            text_content=f"post-{i}",
            original_date=datetime(2026, 5, 10 + i, tzinfo=timezone.utc),
            raw_data={"i": i},
        ))
    await db.commit()

    items, total = await ListBackedUpPosts(db).execute(
        channel_id=test_channel.id, page=1, page_size=2,
    )
    assert total == 5
    assert len(items) == 2
    assert items[0].original_date > items[1].original_date


@pytest.mark.asyncio
async def test_list_posts_filters_by_date(db, test_user, test_channel):
    for day in [10, 15, 20]:
        db.add(BackedUpPost(
            channel_id=test_channel.id,
            telegram_message_id=day,
            content_type="text",
            text_content=str(day),
            original_date=datetime(2026, 5, day, tzinfo=timezone.utc),
            raw_data={},
        ))
    await db.commit()

    items, total = await ListBackedUpPosts(db).execute(
        channel_id=test_channel.id, page=1, page_size=50,
        start_date=datetime(2026, 5, 14, tzinfo=timezone.utc),
        end_date=datetime(2026, 5, 19, tzinfo=timezone.utc),
    )
    assert total == 1
    assert items[0].telegram_message_id == 15


@pytest.mark.asyncio
async def test_get_stats_returns_counts_and_dates(db, test_channel):
    for day in [10, 15, 20]:
        db.add(BackedUpPost(
            channel_id=test_channel.id,
            telegram_message_id=day,
            content_type="text",
            text_content=f"text-{day}",
            original_date=datetime(2026, 5, day, tzinfo=timezone.utc),
            raw_data={"k": "v"},
        ))
    await db.commit()

    stats = await GetBackupStats(db).execute(test_channel.id)
    assert stats.total_backed_up_posts == 3
    assert stats.first_post_date.day == 10
    assert stats.last_post_date.day == 20
    assert stats.total_retransmissions == 0
    assert stats.backup_size_mb >= 0


@pytest.mark.asyncio
async def test_get_stats_counts_retransmissions(db, test_user, test_channel):
    target = ChannelGroup(
        owner_id=test_user.id, telegram_id=-2,
        channel_type=ChannelType.CHANNEL, title="Target",
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)

    post = BackedUpPost(
        channel_id=test_channel.id,
        telegram_message_id=1,
        content_type="text",
        text_content="x",
        original_date=datetime(2026, 5, 1, tzinfo=timezone.utc),
        raw_data={},
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    db.add(PostRetransmission(
        original_post_id=post.id,
        target_channel_id=target.id,
        target_message_id=999,
    ))
    await db.commit()

    stats = await GetBackupStats(db).execute(test_channel.id)
    assert stats.total_retransmissions == 1


@pytest.mark.asyncio
async def test_get_stats_empty_channel(db, test_channel):
    stats = await GetBackupStats(db).execute(test_channel.id)
    assert stats.total_backed_up_posts == 0
    assert stats.first_post_date is None
    assert stats.last_post_date is None
