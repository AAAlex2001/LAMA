"""Shortcode context builder for trigger actions."""


def build_shortcode_ctx(user_id: int, data: dict, bot_info) -> dict:
    """Build shortcode context from trigger action data and bot info."""
    context = data.get("context", {})
    if not isinstance(context, dict):
        context = {}
    return {
        "user": {
            "id": user_id,
            "first_name": context.get("first_name", ""),
            "username": context.get("username", ""),
        },
        "bot": {"first_name": bot_info.first_name if bot_info else ""},
    }