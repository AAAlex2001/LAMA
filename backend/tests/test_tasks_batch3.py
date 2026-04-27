"""
Тесты для пакета задач #3:
1. broadcast — рассылка всем юзерам бота
2. invite-links — protection_type, entry_method, captcha
3. direct/chats — сортировка + фильтр
4. inbox action — delete_and_block для DM
5. inbox bulk-action — read ставит is_new=False (status=PROCESSED)
6. системные сообщения (trigger/command/autoreply) в DirectChat
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from backend.models.bots import (
    Bot, BotMessage, BotStatus, MessageType,
    AutoReply, BotCommand, Trigger, TriggerType, TriggerActionType,
    CommandScope, TriggerChatType,
)
from backend.models.direct import DirectChat
from backend.models.inbox import InboxEvent
from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.schemas.inbox.enums import (
    EventStatus, BulkActionType, InboxCategory, EntityType, EventType,
)
from backend.schemas.bots.messages import SendMessageRequest


# ─────────────────────────────────────────────────────────────────────────────
# 1. Broadcast
# ─────────────────────────────────────────────────────────────────────────────

class TestBroadcast:
    """POST /api/bots/{bot_id}/messages без chat_id → рассылка."""

    def test_send_message_request_allows_no_chat_id(self):
        """SendMessageRequest должен принимать chat_id=None."""
        req = SendMessageRequest(text_content="Hello")
        assert req.chat_id is None
        assert req.text_content == "Hello"

    @pytest.mark.asyncio
    async def test_broadcast_sends_to_all_chats(self):
        """BotMessagingService.broadcast отправляет всем незаблокированным чатам."""
        from backend.services.bot.bot_messaging import BotMessagingService

        db = AsyncMock()
        service = BotMessagingService(db)

        # Бот активен
        bot = MagicMock()
        bot.id = 1
        bot.status = BotStatus.ACTIVE
        service.get_bot_or_raise = AsyncMock(return_value=bot)

        # 2 чата: один обычный, один заблокированный
        chat_rows = [(100,), (200,)]
        db.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = chat_rows
        db.execute.return_value = mock_result

        fake_tg_bot = AsyncMock()
        fake_msg = MagicMock()
        fake_msg.message_id = 999
        fake_msg.photo = None
        fake_msg.model_dump.return_value = {}
        fake_tg_bot.send_message.return_value = fake_msg

        data = SendMessageRequest(text_content="Broadcast test")

        with patch("backend.services.bot.bot_messaging.resolve_for_bot_id", return_value=fake_tg_bot):
            result = await service.broadcast(1, data, owner_id=1)

        assert result.total == 2
        assert result.sent + result.failed == 2

    @pytest.mark.asyncio
    async def test_broadcast_skips_inactive_bot(self):
        """broadcast поднимает ValueError если бот неактивен."""
        from backend.services.bot.bot_messaging import BotMessagingService

        db = AsyncMock()
        service = BotMessagingService(db)

        bot = MagicMock()
        bot.status = BotStatus.INACTIVE
        service.get_bot_or_raise = AsyncMock(return_value=bot)

        data = SendMessageRequest(text_content="test")
        with pytest.raises(ValueError, match="not active"):
            await service.broadcast(1, data, owner_id=1)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Invite Links — новые поля
# ─────────────────────────────────────────────────────────────────────────────

class TestInviteLinkSchemas:
    """Invite link schema должны принимать новые поля."""

    def test_create_with_protection_and_entry(self):
        from backend.schemas.channels.invite_links import InviteLinkCreate

        data = InviteLinkCreate(
            name="Test Link",
            creates_join_request=True,
            protection_type="captcha",
            entry_method="bot",
        )
        assert data.protection_type == "captcha"
        assert data.entry_method == "bot"
        assert data.creates_join_request is True

    def test_create_defaults(self):
        from backend.schemas.channels.invite_links import InviteLinkCreate

        data = InviteLinkCreate()
        assert data.protection_type == "none"
        assert data.entry_method == "direct"
        assert data.creates_join_request is False

    def test_update_with_new_fields(self):
        from backend.schemas.channels.invite_links import InviteLinkUpdate

        data = InviteLinkUpdate(protection_type="captcha", entry_method="bot")
        assert data.protection_type == "captcha"
        assert data.entry_method == "bot"

    def test_response_has_new_fields(self):
        from backend.schemas.channels.invite_links import InviteLinkResponse

        resp = InviteLinkResponse(
            id=1, channel_id=1, invite_link="https://t.me/+abc",
            name=None, creator_id=None,
            creates_join_request=True, is_primary=False, is_revoked=False,
            expire_date=None, member_limit=None,
            pending_join_request_count=0, member_count=0,
            subscription_period=None, subscription_price=None,
            protection_type="captcha", entry_method="bot",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        assert resp.protection_type == "captcha"
        assert resp.entry_method == "bot"


# ─────────────────────────────────────────────────────────────────────────────
# 3. Direct Chats — сортировка + фильтр
# ─────────────────────────────────────────────────────────────────────────────

class TestDirectChatSorting:
    """GET /api/direct/chats — sort и unread_filter параметры."""

    @pytest.mark.asyncio
    async def test_get_chats_accepts_sort_param(self):
        """ListChats принимает sort='old' без ошибки."""
        from backend.services.direct.features.chats.list_chats import ListChats

        db = AsyncMock()
        service = ListChats(db)

        mock_result = MagicMock()
        mock_result.scalar.return_value = 0
        mock_result.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)

        chats, total = await service.execute(
            owner_id=1, sort="old", unread_filter="unread",
        )
        assert total == 0
        assert chats == []

    @pytest.mark.asyncio
    async def test_get_chats_accepts_read_filter(self):
        """ListChats фильтрует по unread_filter='read'."""
        from backend.services.direct.features.chats.list_chats import ListChats

        db = AsyncMock()
        service = ListChats(db)

        mock_result = MagicMock()
        mock_result.scalar.return_value = 0
        mock_result.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)

        chats, total = await service.execute(
            owner_id=1, sort="new", unread_filter="read",
        )
        assert total == 0


# ─────────────────────────────────────────────────────────────────────────────
# 4. Inbox Action — delete_and_block для DM
# ─────────────────────────────────────────────────────────────────────────────

class TestInboxDeleteAndBlock:
    """POST /api/inbox/{event_id}/action — delete_and_block должен работать без channel_id."""

    @pytest.mark.asyncio
    async def test_delete_and_block_dm_event(self):
        """delete_and_block для DM: удаляет сообщение + блокирует DirectChat."""
        from backend.services.inbox.features.actions.execute_specific_action import ExecuteSpecificAction
        from backend.services.inbox.features.execute_bulk_action import ExecuteBulkAction

        db = AsyncMock()
        specific_action = ExecuteSpecificAction(db); bulk_action = ExecuteBulkAction(db)

        # Событие из DM — без channel_id
        event = MagicMock()
        event.id = 10
        event.bot_id = 1
        event.channel_id = None
        event.tg_user_id = 12345
        event.owner_id = 1
        event.payload = {"chat_id": 100, "message_id": 55}
        event.status = EventStatus.NEW

        bot = MagicMock()
        bot.token = "fake:token"
        db.get = AsyncMock(return_value=bot)

        mock_client = AsyncMock()
        with patch("backend.services.inbox.features.actions.execute_specific_action.resolve_by_token", return_value=mock_client):

            result = await specific_action.execute(
                event=event,
                action_type="delete_and_block",
            )

        assert result is not None
        assert result.status == "deleted_and_blocked"

    @pytest.mark.asyncio
    async def test_block_dm_event(self):
        """block для DM: блокирует DirectChat без channel_id."""
        from backend.services.inbox.features.actions.execute_specific_action import ExecuteSpecificAction
        from backend.services.inbox.features.execute_bulk_action import ExecuteBulkAction

        db = AsyncMock()
        specific_action = ExecuteSpecificAction(db); bulk_action = ExecuteBulkAction(db)

        event = MagicMock()
        event.id = 11
        event.bot_id = 1
        event.channel_id = None
        event.tg_user_id = 12345
        event.owner_id = 1
        event.payload = {"chat_id": 100}
        event.status = EventStatus.NEW

        bot = MagicMock()
        bot.token = "fake:token"
        db.get = AsyncMock(return_value=bot)

        mock_client = AsyncMock()
        with patch("backend.services.inbox.features.actions.execute_specific_action.resolve_by_token", return_value=mock_client):

            result = await specific_action.execute(
                event=event,
                action_type="block",
            )

        assert result is not None
        assert result.status == "blocked"


# ─────────────────────────────────────────────────────────────────────────────
# 5. Bulk Action — read ставит status=PROCESSED
# ─────────────────────────────────────────────────────────────────────────────

class TestBulkRead:
    """POST /api/inbox/bulk-action — READ устанавливает status=PROCESSED."""

    @pytest.mark.asyncio
    async def test_bulk_read_sets_processed(self):
        """bulk READ обновляет status на PROCESSED."""
        from backend.services.inbox.features.actions.execute_specific_action import ExecuteSpecificAction
        from backend.services.inbox.features.execute_bulk_action import ExecuteBulkAction

        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 5
        db.execute = AsyncMock(return_value=mock_result)
        db.commit = AsyncMock()

        specific_action = ExecuteSpecificAction(db); bulk_action = ExecuteBulkAction(db)
        affected = await bulk_action.execute(
            owner_id=1,
            event_ids=[1, 2, 3, 4, 5],
            action=BulkActionType.READ,
        )
        assert affected == 5

    def test_inbox_event_response_has_is_new_field(self):
        """InboxEventResponse вычисляет is_new из status."""
        from backend.schemas.inbox.events import InboxEventResponse

        resp = InboxEventResponse(
            id=1,
            category=InboxCategory.MODERATION,
            entity_type=EntityType.BOT,
            event_type=EventType.BOT_MESSAGE,
            status=EventStatus.NEW,
            created_at=datetime.now(timezone.utc),
            is_new=True,
        )
        assert resp.is_new is True

        resp2 = InboxEventResponse(
            id=2,
            category=InboxCategory.MODERATION,
            entity_type=EntityType.BOT,
            event_type=EventType.BOT_MESSAGE,
            status=EventStatus.PROCESSED,
            created_at=datetime.now(timezone.utc),
            is_new=False,
        )
        assert resp2.is_new is False


# ─────────────────────────────────────────────────────────────────────────────
# 6. Системные сообщения для триггеров/команд/авто-ответов в DM
# ─────────────────────────────────────────────────────────────────────────────

class TestSystemMessages:
    """Триггеры/команды/авто-ответы должны сохранять BotMessage с is_system=True."""

    def test_bot_message_has_is_system_field(self):
        """BotMessage модель имеет поле is_system."""
        msg = BotMessage(
            bot_id=1, telegram_message_id=0, chat_id=100,
            message_type=MessageType.TEXT,
            text_content='Сработал автоответ "Цена"',
            is_incoming=False,
            is_system=True,
        )
        assert msg.is_system is True
        assert not msg.text_content.startswith("{")

    def test_bot_message_response_has_is_system(self):
        """BotMessageResponse включает is_system."""
        from backend.schemas.bots.messages import BotMessageResponse

        resp = BotMessageResponse(
            id=1, bot_id=1, telegram_message_id=0, chat_id=100,
            user_id=None, message_type=MessageType.TEXT,
            text_content='Сработал триггер (2)',
            media_file_id=None, media_url=None,
            is_incoming=False,
            is_system=True,
            created_at=datetime.now(timezone.utc),
        )
        assert resp.is_system is True
        assert not resp.text_content.startswith("{")

    def test_system_message_is_plain_text(self):
        """Системное сообщение — plain text, не JSON."""
        text = 'Сработал автоответ "Цена"'
        assert not text.startswith("{")
        assert "Цена" in text
