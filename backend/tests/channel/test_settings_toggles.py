"""Тесты простых update/toggle сервисов: antispam, flood, captcha,
banned_words, night_mode, media_block, quick_commands.
Все они: грузят канал, обновляют поля, бросают 404 для чужого.
"""

import pytest
from fastapi import HTTPException

from backend.models.channels import ActionType, CaptchaFailAction, LinkFilterMode
from backend.services.channel.features.antispam import UpdateAntispamSettings
from backend.services.channel.features.banned_words import ToggleBannedWords
from backend.services.channel.features.captcha import UpdateCaptchaSettings
from backend.services.channel.features.flood import UpdateFloodSettings
from backend.services.channel.features.media_block import UpdateMediaBlock
from backend.services.channel.features.night_mode import UpdateNightModeSettings
from backend.services.channel.features.quick_commands import UpdateQuickCommands


@pytest.fixture(autouse=True)
def stub_apply_permissions(monkeypatch):
    """night_mode и media_block дёргают ApplyChannelPermissions — не пускаем в TG."""
    async def fake_execute(self, channel):
        return False
    monkeypatch.setattr(
        "backend.services.channel.features.permissions.ApplyChannelPermissions.execute",
        fake_execute,
    )


@pytest.mark.asyncio
async def test_antispam_updates_fields(db, test_user, test_channel):
    channel = await UpdateAntispamSettings(db).execute(
        channel_id=test_channel.id, owner_id=test_user.id,
        link_filter_mode=LinkFilterMode.WHITELIST,
        link_whitelist=["t.me/allowed"],
        link_filter_action=ActionType.MUTE,
        link_filter_mute_duration=60,
    )
    await db.commit()
    assert channel.link_filter_mode == LinkFilterMode.WHITELIST
    assert channel.link_whitelist == ["t.me/allowed"]
    assert channel.link_filter_action == ActionType.MUTE
    assert channel.link_filter_mute_duration == 60


@pytest.mark.asyncio
async def test_antispam_404_for_unknown(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await UpdateAntispamSettings(db).execute(
            channel_id=99999, owner_id=test_user.id,
            link_filter_mode=LinkFilterMode.BLOCK_ALL,
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_flood_updates_fields(db, test_user, test_channel):
    channel = await UpdateFloodSettings(db).execute(
        channel_id=test_channel.id, owner_id=test_user.id,
        message_limit=5, interval_seconds=10,
        action=ActionType.MUTE, mute_duration_minutes=15,
    )
    await db.commit()
    assert channel.flood_message_limit == 5
    assert channel.flood_interval_seconds == 10
    assert channel.flood_action == ActionType.MUTE
    assert channel.flood_mute_duration_minutes == 15


@pytest.mark.asyncio
async def test_captcha_updates_fields(db, test_user, test_channel):
    channel = await UpdateCaptchaSettings(db).execute(
        channel_id=test_channel.id, owner_id=test_user.id,
        enabled=True, timeout_seconds=60,
        fail_action=CaptchaFailAction.BAN, fail_duration_seconds=300,
        message_before="Solve captcha",
    )
    await db.commit()
    assert channel.captcha_enabled is True
    assert channel.captcha_timeout_seconds == 60
    assert channel.captcha_fail_action == CaptchaFailAction.BAN
    assert channel.captcha_message_before == "Solve captcha"


@pytest.mark.asyncio
async def test_banned_words_toggle(db, test_user, test_channel):
    channel = await ToggleBannedWords(db).execute(test_channel.id, test_user.id, True)
    await db.commit()
    assert channel.banned_words_enabled is True

    channel = await ToggleBannedWords(db).execute(test_channel.id, test_user.id, False)
    await db.commit()
    assert channel.banned_words_enabled is False


@pytest.mark.asyncio
async def test_night_mode_updates_fields(db, test_user, test_channel):
    channel = await UpdateNightModeSettings(db).execute(
        channel_id=test_channel.id, owner_id=test_user.id,
        enabled=True, start="22:00", end="08:00",
        block_media=True, block_text=False,
    )
    await db.commit()
    assert channel.night_mode_enabled is True
    assert channel.night_mode_start == "22:00"
    assert channel.night_mode_end == "08:00"
    assert channel.night_mode_block_media is True


@pytest.mark.asyncio
async def test_media_block_updates_list(db, test_user, test_channel):
    channel = await UpdateMediaBlock(db).execute(
        test_channel.id, test_user.id, ["voice", "video"],
    )
    await db.commit()
    assert channel.block_media_types == ["voice", "video"]


@pytest.mark.asyncio
async def test_quick_commands_updates_fields(db, test_user, test_channel):
    channel = await UpdateQuickCommands(db).execute(
        test_channel.id, test_user.id, True, ["mute", "ban"],
    )
    await db.commit()
    assert channel.commands_enabled is True
    assert channel.enabled_commands == ["mute", "ban"]


@pytest.mark.asyncio
async def test_all_settings_404_for_foreign(db, test_user):
    """Каждый update-сервис должен бросать 404 для канала чужого пользователя."""
    from backend.models.auth import User, UserRole
    from backend.models.channels import ChannelGroup, ChannelType

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign = ChannelGroup(
        owner_id=other.id, telegram_id=-5,
        channel_type=ChannelType.CHANNEL, title="Other",
    )
    db.add(foreign)
    await db.commit()
    await db.refresh(foreign)

    services = [
        lambda: UpdateAntispamSettings(db).execute(
            channel_id=foreign.id, owner_id=test_user.id, link_filter_mode=LinkFilterMode.BLOCK_ALL,
        ),
        lambda: UpdateFloodSettings(db).execute(
            channel_id=foreign.id, owner_id=test_user.id, message_limit=5,
        ),
        lambda: UpdateCaptchaSettings(db).execute(
            channel_id=foreign.id, owner_id=test_user.id, enabled=True,
        ),
        lambda: ToggleBannedWords(db).execute(foreign.id, test_user.id, True),
        lambda: UpdateNightModeSettings(db).execute(
            channel_id=foreign.id, owner_id=test_user.id,
            enabled=True, start="22:00", end="08:00",
            block_media=True, block_text=True,
        ),
        lambda: UpdateMediaBlock(db).execute(foreign.id, test_user.id, ["voice"]),
        lambda: UpdateQuickCommands(db).execute(foreign.id, test_user.id, True, []),
    ]

    for invocation in services:
        with pytest.raises(HTTPException) as exc:
            await invocation()
        assert exc.value.status_code == 404
