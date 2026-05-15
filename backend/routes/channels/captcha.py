from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.captcha import CaptchaSettingsResponse, CaptchaSettingsUpdate
from backend.services.channel.features.captcha import UpdateCaptchaSettings
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


def build_captcha_response(channel) -> CaptchaSettingsResponse:
    """Достаёт поля капчи из канала в response-модель."""
    return CaptchaSettingsResponse(
        captcha_enabled=channel.captcha_enabled,
        captcha_timeout_seconds=channel.captcha_timeout_seconds,
        captcha_fail_action=channel.captcha_fail_action,
        captcha_fail_duration_seconds=channel.captcha_fail_duration_seconds,
        captcha_restriction_type=channel.captcha_restriction_type,
        captcha_message_before=channel.captcha_message_before,
        captcha_message_fail=channel.captcha_message_fail,
        captcha_message_success=channel.captcha_message_success,
    )


@router.get(
    "/{channel_id}/captcha",
    response_model=CaptchaSettingsResponse,
    summary="Получить настройки капчи для новых участников канала",
)
async def get_captcha_settings(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return build_captcha_response(channel)


@router.put(
    "/{channel_id}/captcha",
    response_model=CaptchaSettingsResponse,
    summary="Обновить настройки капчи (включение, таймаут, действие при провале)",
)
async def update_captcha_settings(
    data: CaptchaSettingsUpdate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateCaptchaSettings(db).execute(
        channel_id=channel_id,
        owner_id=current_user.id,
        enabled=data.captcha_enabled,
        timeout_seconds=data.captcha_timeout_seconds,
        fail_action=data.captcha_fail_action,
        fail_duration_seconds=data.captcha_fail_duration_seconds,
        restriction_type=data.captcha_restriction_type,
        message_before=data.captcha_message_before,
        message_fail=data.captcha_message_fail,
        message_success=data.captcha_message_success,
    )
    return build_captcha_response(channel)
