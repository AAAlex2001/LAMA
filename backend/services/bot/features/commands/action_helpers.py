"""Валидация полей команды по action_type (MESSAGE / CLAIM_ADMIN)."""

from typing import Optional

from fastapi import HTTPException


def require_response_text(response_text: Optional[str]) -> str:
    """Для MESSAGE-команды response_text обязателен (непустая строка)."""
    if not response_text or not str(response_text).strip():
        raise HTTPException(
            status_code=400,
            detail="response_text is required for MESSAGE commands",
        )
    return str(response_text).strip()


def resolve_claim_fields(
    claim_target: Optional[str], claim_channel_ids,
) -> tuple[str, Optional[list]]:
    """Для CLAIM_ADMIN: claim_target → SPECIFIC_CHANNEL по умолчанию; валидируем channel_ids."""
    target = claim_target or "SPECIFIC_CHANNEL"
    if target == "SPECIFIC_CHANNEL":
        if not claim_channel_ids:
            raise HTTPException(
                status_code=400,
                detail="claim_channel_ids is required for SPECIFIC_CHANNEL",
            )
        return target, list(claim_channel_ids)
    return target, None
