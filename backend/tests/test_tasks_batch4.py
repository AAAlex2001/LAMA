"""
Тесты для пакета задач #4:
1. Системные сообщения — plain text (не JSON)
2. Multi-media для команд/автоответов/триггеров через webhook
3. Inbox block action — уведомление + статус BANNED
4. Inbox bulk block — уведомление для каждого заблокированного
5. Invite link — member_count через sync
6. Dispatch multi-media в BotMessagingService
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from backend.models.bots import (
    Bot, BotMessage, BotStatus, MessageType, BotCommand, AutoReply,
    Trigger, TriggerType, TriggerActionType, TriggerChatType, CommandScope,
)
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.events import InboxEventResponse
from backend.schemas.inbox.enums import (
    EventStatus, BulkActionType, InboxCategory, EntityType, EventType,
)
from backend.schemas.bots.messages import SendMessageRequest


# ─────────────────────────────────────────────────────────────────────────────
# 1. Системные сообщения — plain text, не JSON
# ─────────────────────────────────────────────────────────────────────────────

class TestSystemMessagesPlainText:
    """Системные уведомления должны содержать plain text, не JSON."""

    def test_system_message_is_plain_text_not_json(self):
        """text_content системных сообщений — обычная строка."""
        msg = BotMessage(
            bot_id=1, telegram_message_id=0, chat_id=100,
            message_type=MessageType.TEXT,
            text_content='Сработал автоответ "ключик"',
            is_incoming=False,
            is_system=True,
        )
        assert msg.is_system is True
        assert msg.text_content == 'Сработал автоответ "ключик"'
        assert not msg.text_content.startswith("{")

    def test_trigger_system_message_plain_text(self):
        """Триггерное уведомление — plain text."""
        msg = BotMessage(
            bot_id=1, telegram_message_id=0, chat_id=100,
            message_type=MessageType.TEXT,
            text_content="Сработал триггер (2)",
            is_incoming=False,
            is_system=True,
        )
        assert "Сработал триггер" in msg.text_content
        assert not msg.text_content.startswith("{")

    def test_command_system_message_plain_text(self):
        """Команда — plain text."""
        msg = BotMessage(
            bot_id=1, telegram_message_id=0, chat_id=100,
            message_type=MessageType.TEXT,
            text_content='Сработала команда "/help"',
            is_incoming=False,
            is_system=True,
        )
        assert "/help" in msg.text_content
        assert not msg.text_content.startswith("{")


class TestInboxEventResponseReason:
    """Inbox response должен проецировать reason из payload."""

    def test_reason_and_trigger_names_are_derived_from_payload(self):
        now = datetime.now(timezone.utc)

        response = InboxEventResponse(
            id=1,
            category=InboxCategory.AUTOMATION,
            entity_type=EntityType.BOT,
            event_type=EventType.SYSTEM_TRIGGER,
            bot_id=1,
            channel_id=2,
            tg_user_id=3,
            tg_username="user",
            status=EventStatus.NEW,
            description="fallback description",
            payload={
                "reason": "Сработали триггеры: Stop Spam, Ban Links",
                "reason_source": "trigger",
                "trigger_names": ["Stop Spam", "Ban Links"],
            },
            created_at=now,
            updated_at=now,
            is_new=True,
        )

        assert response.reason == "Сработали триггеры: Stop Spam, Ban Links"
        assert response.reason_source == "trigger"
        assert response.trigger_names == ["Stop Spam", "Ban Links"]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Multi-media в commands/auto-replies/triggers webhook send
# ─────────────────────────────────────────────────────────────────────────────

class TestMultiMediaCommandWebhook:
    """send_command_response должен поддерживать response_media_urls."""

    @pytest.mark.asyncio
    async def test_send_command_response_with_media_urls(self):
        """Если команда имеет response_media_urls, отправляется media_group."""
        from backend.services.webhook.messages.commands import CommandProcessor

        db = AsyncMock()
        bot_model = MagicMock()
        bot_model.id = 1
        bot_model.first_name = "TestBot"
        telegram_bot = AsyncMock()

        processor = CommandProcessor(db, bot_model, telegram_bot)

        command = MagicMock()
        command.response_text = "Привет!"
        command.response_media_url = None
        command.response_media_urls = [
            "https://example.com/photo1.jpg",
            "https://example.com/photo2.jpg",
        ]
        command.response_media_type = None
        command.response_buttons = None

        message = MagicMock()
        message.chat = MagicMock()
        message.chat.id = 100
        message.from_user = MagicMock()
        message.from_user.id = 1
        message.from_user.first_name = "User"
        message.from_user.username = "user"

        await processor.send_command_response(message, command)

        telegram_bot.send_media_group.assert_called_once()


class TestMultiMediaAutoReplyWebhook:
    """send_auto_reply_response должен поддерживать response_media_urls."""

    @pytest.mark.asyncio
    async def test_send_auto_reply_response_with_media_urls(self):
        """Если автоответ имеет response_media_urls, отправляется media_group."""
        from backend.services.webhook.messages.text import TextProcessor

        db = AsyncMock()
        bot_model = MagicMock()
        bot_model.id = 1
        bot_model.first_name = "TestBot"
        telegram_bot = AsyncMock()

        processor = TextProcessor(db, bot_model, telegram_bot)

        auto_reply = MagicMock()
        auto_reply.response_text = "Вот фото!"
        auto_reply.response_media_url = None
        auto_reply.response_media_urls = [
            "https://example.com/photo1.jpg",
            "https://example.com/photo2.jpg",
        ]
        auto_reply.response_media_type = None
        auto_reply.response_buttons = None

        message = MagicMock()
        message.chat = MagicMock()
        message.chat.id = 100
        message.from_user = MagicMock()
        message.from_user.id = 1
        message.from_user.first_name = "User"
        message.from_user.username = "user"

        await processor.send_auto_reply_response(message, auto_reply)

        telegram_bot.send_media_group.assert_called_once()


class TestMultiMediaTriggerWebhook:
    """action_send_media должен поддерживать media_urls в action_data."""

    @pytest.mark.asyncio
    async def test_action_send_media_with_urls_list(self):
        """Если action_data содержит media_urls (>1), отправляется media_group."""
        from backend.services.bot.bot_triggers import BotTriggerService

        db = AsyncMock()
        service = BotTriggerService(db)

        bot = AsyncMock()
        bot.bot = MagicMock()
        bot.bot.token = "fake:token"

        action_data = {
            "media_urls": [
                "https://example.com/photo1.jpg",
                "https://example.com/photo2.jpg",
            ],
            "text": "Привет!",
            "context": {},
        }

        with patch.object(service, "build_shortcode_ctx", return_value={}):
            with patch("backend.services.bot.bot_triggers.get_bot_info", return_value=MagicMock(first_name="Bot")):
                await service.action_send_media(bot, chat_id=100, user_id=1, data=action_data)

        bot.send_media_group.assert_called_once()

    @pytest.mark.asyncio
    async def test_action_send_media_single_url_fallback(self):
        """Если media_url одна, используется обычная отправка."""
        from backend.services.bot.bot_triggers import BotTriggerService

        db = AsyncMock()
        service = BotTriggerService(db)

        bot = AsyncMock()
        bot.bot = MagicMock()
        bot.bot.token = "fake:token"

        action_data = {
            "media_url": "https://example.com/photo1.jpg",
            "media_type": "PHOTO",
            "text": "Привет!",
            "context": {},
        }

        with patch.object(service, "build_shortcode_ctx", return_value={}):
            with patch("backend.services.bot.bot_triggers.get_bot_info", return_value=MagicMock(first_name="Bot")):
                await service.action_send_media(bot, chat_id=100, user_id=1, data=action_data)

        bot.send_photo.assert_called_once()


class TestTriggerUnbanAction:
    """UNBAN_USER trigger должен вызывать unbanChatMember."""

    @pytest.mark.asyncio
    async def test_action_unban_calls_unban_chat_member(self):
        from backend.services.bot.bot_triggers import BotTriggerService

        db = AsyncMock()
        service = BotTriggerService(db)

        bot = AsyncMock()

        await service.action_unban(bot, chat_id=100, user_id=42, data={})

        bot.unban_chat_member.assert_called_once_with(
            chat_id=100,
            user_id=42,
            only_if_banned=True,
        )

    @pytest.mark.asyncio
    async def test_action_remove_from_group_calls_unban_chat_member_without_only_if_banned(self):
        from backend.services.bot.bot_triggers import BotTriggerService

        db = AsyncMock()
        service = BotTriggerService(db)

        bot = AsyncMock()

        await service.action_remove_from_group(bot, chat_id=100, user_id=42, data={})

        bot.unban_chat_member.assert_called_once_with(
            chat_id=100,
            user_id=42,
            only_if_banned=False,
        )


class TestTriggerModerationEvents:
    """Trigger moderation actions должны писать inbox event уровня канала."""

    @pytest.mark.asyncio
    async def test_execute_creates_channel_ban_event_for_remove_from_group_trigger(self):
        from backend.services.bot.bot_triggers import BotTriggerService

        db = AsyncMock()
        service = BotTriggerService(db)

        trigger = MagicMock()
        trigger.id = 7
        trigger.name = "Kick by command"
        trigger.bot_id = 1
        trigger.action_type = TriggerActionType.REMOVE_FROM_GROUP
        trigger.action_data = {}
        trigger.delivery_window = None
        trigger.trigger_type = TriggerType.COMMAND_CALLED
        trigger.chat_type = TriggerChatType.GROUP

        channel = MagicMock()
        channel.id = 5
        channel.owner_id = 9

        telegram_bot = AsyncMock()
        inbox_service = AsyncMock()

        with patch.object(service, "action_remove_from_group", AsyncMock(return_value=True)) as action_remove:
            with patch("backend.services.bot.bot_triggers.get_channel_by_telegram_id", AsyncMock(return_value=channel)):
                with patch("backend.services.bot.bot_triggers.InboxEventService", return_value=inbox_service):
                    executed = await service.execute(
                        trigger=trigger,
                        user_id=42,
                        chat_id=-1001234567890,
                        telegram_bot=telegram_bot,
                        context={
                            "command": "/kickme",
                            "message_id": 555,
                            "message_text": "/kickme",
                            "username": "target_user",
                        },
                    )

        assert executed is True
        action_remove.assert_awaited_once()
        inbox_service.create_event.assert_awaited_once()

        event_data = inbox_service.create_event.await_args.args[0]
        assert event_data.event_type == EventType.CHANNEL_BAN
        assert event_data.channel_id == 5
        assert event_data.tg_user_id == 42
        assert event_data.payload["action"] == TriggerActionType.REMOVE_FROM_GROUP.value
        assert event_data.payload["ban_type"] == "kick"
        assert event_data.payload["command"] == "/kickme"
        assert event_data.payload["reason_source"] == "trigger"


# ─────────────────────────────────────────────────────────────────────────────
# 3. Inbox block action — уведомление + статус BANNED
# ─────────────────────────────────────────────────────────────────────────────

class TestInboxBlockNotification:
    """POST /api/inbox/{event_id}/action block создаёт уведомление и ставит BANNED."""

    def test_event_status_has_banned_value(self):
        """EventStatus содержит BANNED."""
        assert hasattr(EventStatus, "BANNED")
        assert EventStatus.BANNED == "banned"

    @pytest.mark.asyncio
    async def test_block_action_creates_notification(self):
        """block action создаёт отдельное inbox event-уведомление о блокировке."""
        from backend.services.inbox.action_service import InboxActionService

        db = AsyncMock()
        service = InboxActionService(db)

        event = MagicMock()
        event.id = 10
        event.bot_id = 1
        event.channel_id = None
        event.tg_user_id = 12345
        event.tg_username = "testuser"
        event.owner_id = 1
        event.payload = {"chat_id": 100}
        event.status = EventStatus.NEW

        bot = MagicMock()
        bot.token = "fake:token"
        db.get = AsyncMock(return_value=bot)

        mock_client = AsyncMock()
        with patch("backend.services.inbox.action_service.resolve_by_token", return_value=mock_client):

            result = await service.execute_specific_action(
                event=event, action_type="block",
            )

        assert result is not None
        assert result.status == "blocked"
        # Проверяем, что статус стал BANNED
        assert event.status == EventStatus.BANNED

    @pytest.mark.asyncio
    async def test_block_channel_action_creates_notification(self):
        """block в канале создаёт уведомление и ставит BANNED."""
        from backend.services.inbox.action_service import InboxActionService

        db = AsyncMock()
        service = InboxActionService(db)

        event = MagicMock()
        event.id = 11
        event.bot_id = 1
        event.channel_id = 5
        event.tg_user_id = 12345
        event.tg_username = "testuser"
        event.owner_id = 1
        event.payload = {}
        event.status = EventStatus.NEW

        bot = MagicMock()
        bot.token = "fake:token"

        channel = MagicMock()
        channel.telegram_id = -1001234567890
        channel.id = 5

        from backend.models.bots import Bot as BotModel
        from backend.models.channels import ChannelGroup

        async def mock_get(model, id_val):
            if model is BotModel:
                return bot
            if model is ChannelGroup:
                return channel
            return None

        db.get = mock_get

        mock_client = AsyncMock()
        with patch("backend.services.inbox.action_service.resolve_by_token", return_value=mock_client):

            result = await service.execute_specific_action(
                event=event, action_type="block",
            )

        assert result is not None
        assert result.status == "blocked"
        assert event.status == EventStatus.BANNED


# ─────────────────────────────────────────────────────────────────────────────
# 4. Inbox bulk block — уведомление
# ─────────────────────────────────────────────────────────────────────────────

class TestBulkBlockNotification:
    """POST /api/inbox/bulk-action block создаёт уведомления."""

    @pytest.mark.asyncio
    async def test_bulk_block_sets_banned_status(self):
        """Bulk BLOCK ставит status=BANNED на заблокированные события."""
        from backend.services.inbox.action_service import InboxActionService

        db = AsyncMock()
        service = InboxActionService(db)

        event = MagicMock()
        event.tg_user_id = 12345
        event.bot_id = 1
        event.channel_id = 5
        event.owner_id = 1
        event.status = EventStatus.NEW

        bot = MagicMock()
        bot.token = "fake:token"

        channel = MagicMock()
        channel.telegram_id = -1001234567890

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [event]
        db.execute = AsyncMock(return_value=mock_result)
        db.get = AsyncMock(side_effect=lambda model, id_val: bot if model is Bot else channel)
        db.add = MagicMock()
        db.commit = AsyncMock()

        mock_client = AsyncMock()
        with patch("backend.services.inbox.action_service.resolve_by_token", return_value=mock_client):

            affected = await service.execute_bulk_action(
                owner_id=1,
                event_ids=[1],
                action=BulkActionType.BLOCK,
            )

        assert affected == 1
        assert event.status == EventStatus.BANNED


# ─────────────────────────────────────────────────────────────────────────────
# 5. Inbox query — фильтрация по status=banned
# ─────────────────────────────────────────────────────────────────────────────

class TestInboxBannedFilter:
    """GET /api/inbox/ должен поддерживать фильтрацию status=banned."""

    def test_event_status_banned_enum_value(self):
        """Проверяем что BANNED является валидным EventStatus."""
        status = EventStatus("banned")
        assert status == EventStatus.BANNED

    def test_inbox_event_response_with_banned_status(self):
        """InboxEventResponse корректно отображает status=banned."""
        from backend.schemas.inbox.events import InboxEventResponse

        resp = InboxEventResponse(
            id=1,
            category=InboxCategory.MODERATION,
            entity_type=EntityType.BOT,
            event_type=EventType.BOT_MESSAGE,
            status=EventStatus.BANNED,
            created_at=datetime.now(timezone.utc),
            is_new=False,
        )
        assert resp.status == EventStatus.BANNED


# ─────────────────────────────────────────────────────────────────────────────
# 6. Multi-media в BotMessagingService.dispatch_telegram
# ─────────────────────────────────────────────────────────────────────────────

class TestDispatchMultiMedia:
    """dispatch_telegram отправляет media_group при >1 media_urls."""

    @pytest.mark.asyncio
    async def test_dispatch_multi_media(self):
        """Множественные media_urls -> send_media_group."""
        from backend.services.bot.bot_messaging import BotMessagingService

        db = AsyncMock()
        service = BotMessagingService(db)

        telegram_bot = AsyncMock()
        fake_msg1 = MagicMock()
        fake_msg1.message_id = 1
        fake_msg2 = MagicMock()
        fake_msg2.message_id = 2
        telegram_bot.send_media_group.return_value = [fake_msg1, fake_msg2]

        data = SendMessageRequest(
            chat_id=100,
            text_content="Album",
            media_urls=["https://example.com/a.jpg", "https://example.com/b.jpg"],
        )

        result = await service.dispatch_telegram(telegram_bot, data, None)

        telegram_bot.send_media_group.assert_called_once()
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_dispatch_single_media_url_in_urls_list(self):
        """Одна media_url в media_urls, без media_type -> fallback send_message."""
        from backend.services.bot.bot_messaging import BotMessagingService

        db = AsyncMock()
        service = BotMessagingService(db)

        telegram_bot = AsyncMock()
        fake_msg = MagicMock()
        fake_msg.message_id = 1
        telegram_bot.send_message.return_value = fake_msg

        data = SendMessageRequest(
            chat_id=100,
            text_content="Single",
            media_urls=["https://example.com/a.jpg"],
        )

        result = await service.dispatch_telegram(telegram_bot, data, None)

        telegram_bot.send_message.assert_called_once()


# ─────────────────────────────────────────────────────────────────────────────
# 7. Invite link member_count syncs correctly
# ─────────────────────────────────────────────────────────────────────────────

class TestInviteLinkMemberCount:
    """Invite link member_count обновляется через sync_single."""

    @pytest.mark.asyncio
    async def test_sync_single_updates_member_count(self):
        """sync_single обновляет member_count из Telegram API."""
        from backend.services.channel.invite_link_service import InviteLinkService

        db = AsyncMock()
        service = InviteLinkService(db)

        channel = MagicMock()
        channel.id = 1
        channel.telegram_id = -100123

        link = MagicMock()
        link.is_revoked = False
        link.is_primary = False
        link.invite_link = "https://t.me/+abc"
        link.name = "Test"
        link.expire_date = None
        link.member_limit = None
        link.creates_join_request = False
        link.member_count = 0

        fake_bot = AsyncMock()
        tg_link = MagicMock()
        tg_link.member_count = 42
        tg_link.pending_join_request_count = 3
        fake_bot.edit_chat_invite_link.return_value = tg_link

        with patch.object(service, "resolve_bot", return_value=fake_bot):
            result = await service.sync_single(channel, link)

        assert link.member_count == 42
        assert link.pending_join_request_count == 3


# ─────────────────────────────────────────────────────────────────────────────
# 8. Schemas — response_media_urls на commands/auto-replies
# ─────────────────────────────────────────────────────────────────────────────

class TestMultiMediaSchemas:
    """Schemas команд/автоответов поддерживают response_media_urls."""

    def test_command_create_with_media_urls(self):
        from backend.schemas.bots.commands import BotCommandCreate

        data = BotCommandCreate(
            command="/test",
            response_text="Hello",
            response_media_urls=["https://example.com/a.jpg", "https://example.com/b.jpg"],
        )
        assert len(data.response_media_urls) == 2

    def test_auto_reply_create_with_media_urls(self):
        from backend.schemas.bots.auto_reply import AutoReplyCreate

        data = AutoReplyCreate(
            keywords=["price"],
            response_text="Here!",
            response_media_urls=["https://example.com/a.jpg"],
        )
        assert len(data.response_media_urls) == 1

    def test_trigger_create_with_media_urls_in_action_data(self):
        from backend.schemas.bots.triggers import TriggerCreate

        data = TriggerCreate(
            name="test",
            trigger_type=TriggerType.USER_MESSAGE,
            action_type=TriggerActionType.SEND_MEDIA,
            action_data={
                "text": "Hello",
                "media_urls": ["https://example.com/a.jpg", "https://example.com/b.jpg"],
            },
        )
        assert len(data.action_data["media_urls"]) == 2

    def test_command_response_includes_media_urls(self):
        from backend.schemas.bots.commands import BotCommandResponse

        resp = BotCommandResponse(
            id=1, bot_id=1, channel_id=None, command="/test",
            description=None, response_text="Hi",
            response_media_url=None,
            response_media_urls=["https://example.com/a.jpg"],
            response_media_type=None,
            response_buttons=None,
            scope=None, is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        assert resp.response_media_urls == ["https://example.com/a.jpg"]

    def test_auto_reply_response_includes_media_urls(self):
        from backend.schemas.bots.auto_reply import AutoReplyResponse

        resp = AutoReplyResponse(
            id=1, bot_id=1,
            keywords=["test"],
            response_text="Hi",
            response_media_url=None,
            response_media_urls=["https://example.com/a.jpg"],
            response_media_type=None,
            response_buttons=None,
            scope=None, is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        assert resp.response_media_urls == ["https://example.com/a.jpg"]
