from aiogram.types import ChatMemberUpdated


class GetSubscriptionJoinState:
    """Возвращает join_state из payload последнего join-event."""

    def is_new_join(self, chat_member: ChatMemberUpdated) -> bool:
        old_status = chat_member.old_chat_member.status
        new_status = chat_member.new_chat_member.status
        old_active = old_status in ("member", "administrator", "creator") or (
            old_status == "restricted"
            and getattr(chat_member.old_chat_member, "is_member", False)
        )
        new_member = new_status in ("member", "administrator", "creator") or (
            new_status == "restricted"
            and getattr(chat_member.new_chat_member, "is_member", False)
        )
        return new_member and not old_active

    def is_direct_link_join(self, chat_member: ChatMemberUpdated) -> bool:
        invite_link = getattr(chat_member, "invite_link", None)
        return invite_link is None or not getattr(invite_link, "creates_join_request", False)

    def get_invite_link_url(self, chat_member: ChatMemberUpdated) -> str | None:
        invite_link = getattr(chat_member, "invite_link", None)
        return invite_link.invite_link if invite_link else None
