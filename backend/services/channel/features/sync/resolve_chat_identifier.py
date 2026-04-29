from typing import Optional, Union

from fastapi import HTTPException


def resolve_chat_identifier(
    telegram_id: Optional[int],
    username: Optional[str],
    invite_link: Optional[str],
) -> Union[int, str]:
    """Привести входные параметры к идентификатору чата для Telegram API."""
    if telegram_id:
        return telegram_id
    if username:
        return username if username.startswith("@") else f"@{username}"
    if invite_link and "t.me/" in invite_link:
        extracted = invite_link.split("t.me/")[-1]
        if extracted.startswith("+") or extracted.startswith("joinchat/"):
            raise HTTPException(
                status_code=400,
                detail="Private invite links are not supported by Telegram API. Add the bot to the channel/group as an administrator and it will appear automatically.",
            )
        return f"@{extracted}"
    if invite_link:
        raise HTTPException(
            status_code=400,
            detail="Unsupported link format. Use a public username (@username) or t.me/username.",
        )
    raise HTTPException(
        status_code=400,
        detail="One of telegram_id, username, or invite_link must be provided",
    )
