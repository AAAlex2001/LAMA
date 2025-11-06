"""
API endpoints для модуля "Боты":
- CRUD по токену
- Отправка DM
- Webhook приёма апдейтов
- WebSocket для событий в реальном времени
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request, Depends
from typing import List, Tuple, Dict, Any
from datetime import timedelta

from backend.models.bot import (
    BotCreate,
    BotUpdate,
    BotResponse,
    WelcomeConfig,
    SendDMRequest,
    SetWebhookRequest,
    SendMessageRequest,
    ScheduleMessageRequest,
    StatsResponse,
    CommandItem,
    CommandsResponse,
    PreviewRequest,
    PreviewResponse,
    ScheduleType,
    ModerationRequest,
    ApproveDeclineRequest,
    WorkingChatsRequest,
    ProfileUpdateRequest,
    TemplateItem,
    TriggerType,
    DelayedTriggerConfig,
)
from backend.services.bot_service import BotService
from backend.services.channel_service import ChannelService
from backend.services.websocket_service import WebSocketManager
from backend.services.scheduler_service import SchedulerService


router = APIRouter(prefix="/bots", tags=["bots"])


def get_services(request: Request) -> Tuple[BotService, SchedulerService, WebSocketManager]:
    return (
        request.app.state.bot_service,
        request.app.state.scheduler_service,
        request.app.state.ws_manager,
    )


def get_channel_service(request: Request) -> ChannelService:
    return request.app.state.channel_service


@router.post("", response_model=BotResponse, status_code=201)
async def create_bot(data: BotCreate, deps=Depends(get_services)) -> BotResponse:
    bot_service, scheduler, _ = deps
    try:
        resp = await bot_service.create(data)
        if resp.description_suffix:
            scheduler.schedule_description_suffix_enforcement(resp.id)
        return resp
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[BotResponse])
async def list_bots(deps=Depends(get_services)) -> List[BotResponse]:
    bot_service, _, _ = deps
    return bot_service.list()


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(bot_id: str, deps=Depends(get_services)) -> BotResponse:
    bot_service, _, _ = deps
    try:
        return bot_service.get(bot_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{bot_id}", response_model=BotResponse)
async def update_bot(bot_id: str, data: BotUpdate, deps=Depends(get_services)) -> BotResponse:
    bot_service, scheduler, _ = deps
    try:
        resp = await bot_service.update(bot_id, data)
        if resp.description_suffix:
            scheduler.schedule_description_suffix_enforcement(resp.id)
        return resp
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{bot_id}")
async def delete_bot(bot_id: str, deps=Depends(get_services)) -> dict:
    bot_service, scheduler, _ = deps
    if not bot_service.delete(bot_id):
        raise HTTPException(status_code=404, detail="Bot not found")
    try:
        scheduler.unschedule_description_suffix_enforcement(bot_id)
    except Exception:
        pass
    return {"success": True}


@router.post("/send-dm")
async def send_dm(body: SendDMRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.send_dm(bot_id=body.bot_id, user_id=body.user_id, message=body.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{bot_id}/webhook")
async def telegram_webhook(
    bot_id: str,
    request: Request,
    deps=Depends(get_services),
    channel_service: ChannelService = Depends(get_channel_service),
) -> dict:
    bot_service, _, _ = deps
    payload = await request.json()
    # Обрабатываем бот-события
    result = await bot_service.handle_webhook_update(bot_id, payload)
    # Сохраняем посты в бекап для связанных каналов
    try:
        await channel_service.process_telegram_update(bot_id, payload)
    except Exception:
        pass
    return result


@router.post("/{bot_id}/set-webhook")
async def set_webhook(bot_id: str, body: SetWebhookRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.set_webhook(bot_id, body.url, body.secret_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/send")
async def send_message(body: SendMessageRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.send_message(body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/schedule")
async def schedule_message(body: ScheduleMessageRequest, deps=Depends(get_services)) -> dict:
    bot_service, scheduler, _ = deps
    # Apply simple audience filters using applicants snapshot
    targets = list(body.target_ids)
    if body.audience:
        record = bot_service.require(body.bot_id)
        if body.target_type == "user":
            filtered_targets = []
            for uid in targets:
                # Filter by applicants status
                if body.audience.applicants:
                    status = {
                        "all": None,
                        "approved": "approved",
                        "declined": "declined",
                        "no_response": "pending",
                    }[body.audience.applicants]
                    if status is not None:
                        app_status = record.applicants.get(int(uid), {}).get("status")
                        if app_status != status:
                            continue
                
                # Filter by membership_required
                if body.audience.membership_required:
                    has_all_memberships = True
                    for chat_id in body.audience.membership_required:
                        try:
                            member = await record.bot.get_chat_member(chat_id=chat_id, user_id=int(uid))
                            member_status = getattr(member, "status", None)
                            if member_status not in ("member", "administrator", "creator"):
                                has_all_memberships = False
                                break
                        except Exception:
                            has_all_memberships = False
                            break
                    if not has_all_memberships:
                        continue
                
                # Filter by has_captcha
                if body.audience.has_captcha is not None:
                    has_captcha = int(uid) in record.captcha_states
                    if has_captcha != body.audience.has_captcha:
                        continue
                
                # Filter by recent_days
                if body.audience.recent_days:
                    from datetime import timedelta
                    app = record.applicants.get(int(uid), {})
                    if app.get("ts"):
                        days_ago = (datetime.utcnow() - app["ts"]).days
                        if days_ago > body.audience.recent_days:
                            continue
                
                # Filter by exclude_received_series_id
                if body.audience.exclude_received_series_id:
                    user_progress = record.user_series_progress.get(int(uid), {})
                    if body.audience.exclude_received_series_id in user_progress:
                        continue
                
                filtered_targets.append(uid)
            targets = filtered_targets
    if not targets:
        return {"success": True, "scheduled": 0}
    s = body.schedule
    if s.type == ScheduleType.ONCE and s.run_at:
        for target_id in targets:
            scheduler.schedule_bot_message_once(
                job_id=f"bot_once_{body.bot_id}_{target_id}_{int(s.run_at.timestamp())}",
                run_at=s.run_at,
                bot_id=body.bot_id,
                target_type=body.target_type,
                target_id=target_id,
                message=body.message.model_dump(),
            )
        return {"success": True, "scheduled": len(targets)}
    if s.type == ScheduleType.POINTS and s.points:
        from datetime import datetime
        from dateutil import tz
        tzinfo = tz.gettz(s.timezone or "UTC")
        now = datetime.now(tzinfo)
        for p in s.points:
            run_at = datetime.combine(now.date(), p.at, tzinfo=tzinfo)
            if run_at <= now:
                continue
            for target_id in targets:
                scheduler.schedule_bot_message_once(
                    job_id=f"bot_point_{body.bot_id}_{target_id}_{now.date().isoformat()}_{p.at.isoformat()}_{s.timezone}",
                    run_at=run_at,
                    bot_id=body.bot_id,
                    target_type=body.target_type,
                    target_id=target_id,
                    message=body.message.model_dump(),
                )
        return {"success": True}
    if s.type == ScheduleType.DAILY and s.daily_time:
        for target_id in targets:
            scheduler.schedule_bot_daily(
                job_id=f"bot_daily_{body.bot_id}_{target_id}_{s.daily_time.strftime('%H%M')}_{s.timezone}",
                bot_id=body.bot_id,
                target_type=body.target_type,
                target_id=target_id,
                message=body.message.model_dump(),
                hour=s.daily_time.hour,
                minute=s.daily_time.minute,
                timezone=s.timezone,
            )
        return {"success": True}
    if s.type == ScheduleType.WEEKLY and s.daily_time and s.weekly_days:
        for target_id in targets:
            scheduler.schedule_bot_weekly(
                job_id=f"bot_weekly_{body.bot_id}_{target_id}_{','.join(map(str,s.weekly_days))}_{s.daily_time.strftime('%H%M')}_{s.timezone}",
                bot_id=body.bot_id,
                target_type=body.target_type,
                target_id=target_id,
                message=body.message.model_dump(),
                days=s.weekly_days,
                hour=s.daily_time.hour,
                minute=s.daily_time.minute,
                timezone=s.timezone,
            )
        return {"success": True}
    if s.type == ScheduleType.WEEKDAYS and s.daily_time:
        for target_id in targets:
            scheduler.schedule_bot_weekdays(
                job_id=f"bot_weekdays_{body.bot_id}_{target_id}_{s.daily_time.strftime('%H%M')}_{s.timezone}",
                bot_id=body.bot_id,
                target_type=body.target_type,
                target_id=target_id,
                message=body.message.model_dump(),
                hour=s.daily_time.hour,
                minute=s.daily_time.minute,
                timezone=s.timezone,
            )
        return {"success": True}
    if s.type == ScheduleType.MONTHLY and s.daily_time and s.monthly_days:
        for target_id in targets:
            scheduler.schedule_bot_monthly(
                job_id=f"bot_monthly_{body.bot_id}_{target_id}_{','.join(map(str,s.monthly_days))}_{s.daily_time.strftime('%H%M')}_{s.timezone}",
                bot_id=body.bot_id,
                target_type=body.target_type,
                target_id=target_id,
                message=body.message.model_dump(),
                month_days=s.monthly_days,
                hour=s.daily_time.hour,
                minute=s.daily_time.minute,
                timezone=s.timezone,
            )
        return {"success": True}
    if s.type == ScheduleType.SERIES:
        if not s.run_at:
            raise HTTPException(status_code=400, detail="Series requires schedule.run_at")
        base_id = f"series_{body.bot_id}_{int(s.run_at.timestamp())}"
        steps = [{"offset": timedelta(seconds=0), "message": body.message.model_dump()}]
        for target_id in targets:
            scheduler.schedule_series(base_id=base_id, bot_id=body.bot_id, target_type=body.target_type, target_id=target_id, steps=steps, start_at=s.run_at)
        return {"success": True}
    raise HTTPException(status_code=400, detail="Unsupported schedule type or missing parameters")


@router.get("/{bot_id}/stats", response_model=StatsResponse)
async def bot_stats(bot_id: str, deps=Depends(get_services)) -> StatsResponse:
    bot_service, _, _ = deps
    data = bot_service.get_stats(bot_id)
    return StatsResponse(**data)


@router.get("/{bot_id}/commands", response_model=CommandsResponse)
async def list_commands(bot_id: str, deps=Depends(get_services)) -> CommandsResponse:
    bot_service, _, _ = deps
    commands = bot_service.list_commands(bot_id)
    return CommandsResponse(bot_id=bot_id, commands=commands)


@router.post("/{bot_id}/commands", response_model=CommandsResponse)
async def set_command(bot_id: str, item: CommandItem, deps=Depends(get_services)) -> CommandsResponse:
    bot_service, _, _ = deps
    commands = bot_service.set_command(bot_id, item.command, item.response)
    return CommandsResponse(bot_id=bot_id, commands=commands)


@router.delete("/{bot_id}/commands/{command}", response_model=CommandsResponse)
async def delete_command(bot_id: str, command: str, deps=Depends(get_services)) -> CommandsResponse:
    bot_service, _, _ = deps
    commands = bot_service.delete_command(bot_id, command)
    return CommandsResponse(bot_id=bot_id, commands=commands)


@router.websocket("/{bot_id}/ws")
async def bot_websocket(websocket: WebSocket, bot_id: str, deps=Depends(get_services)):
    _, _, ws_manager = deps
    await ws_manager.connect(bot_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(bot_id, websocket)


@router.post("/preview", response_model=PreviewResponse)
async def preview(body: PreviewRequest, deps=Depends(get_services)) -> PreviewResponse:
    bot_service, _, _ = deps
    data = await bot_service.render_preview(body.bot_id, body.message, body.user_id, body.timezone)
    return PreviewResponse(**data)


@router.post("/{bot_id}/branch")
async def set_branch_mapping(bot_id: str, mapping: Dict[str, Any], deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    record = bot_service.require(bot_id)
    for k, v in mapping.items():
        if not isinstance(v, dict) or "bot_id" not in v or "target_id" not in v or "message" not in v:
            raise HTTPException(status_code=400, detail="Invalid branch mapping value")
    record.branch_map.update(mapping)
    return {"success": True, "size": len(record.branch_map)}


@router.post("/{bot_id}/approve")
async def approve_join(body: ApproveDeclineRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    return await bot_service.approve_request_by_id(body.bot_id, body.chat_id, body.user_id)


@router.post("/{bot_id}/decline")
async def decline_join(body: ApproveDeclineRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    return await bot_service.decline_request_by_id(body.bot_id, body.chat_id, body.user_id)


@router.post("/{bot_id}/working-chats")
async def set_working_chats(body: WorkingChatsRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    return bot_service.set_working_chats(body.bot_id, body.chat_ids)


@router.patch("/{bot_id}/profile")
async def update_profile(body: ProfileUpdateRequest, deps=Depends(get_services)) -> dict:
    bot_service, scheduler, _ = deps
    record = bot_service.require(body.bot_id)
    try:
        if body.name:
            await record.bot.set_my_name(name=body.name)
        if body.description is not None:
            await record.bot.set_my_short_description(short_description=body.description)
        if body.photo_url:
            # Telegram Bot API не принимает URL напрямую для фото профиля; пока отправим как фото в "Saved Messages" недоступно.
            # Оставим заглушку с ошибкой для явности.
            raise HTTPException(status_code=400, detail="photo_url update not supported via Bot API here")
        if record.description_suffix:
            scheduler.schedule_description_suffix_enforcement(body.bot_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{bot_id}/templates")
async def save_template(bot_id: str, item: TemplateItem, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    return bot_service.save_template(bot_id, item.template_id, item.message)


@router.get("/{bot_id}/templates")
async def list_templates(bot_id: str, deps=Depends(get_services)) -> Dict[str, Any]:
    bot_service, _, _ = deps
    return bot_service.get_templates(bot_id)


@router.delete("/{bot_id}/templates/{template_id}")
async def delete_template(bot_id: str, template_id: str, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    return bot_service.delete_template(bot_id, template_id)


@router.post("/{bot_id}/copy-schedule")
async def copy_schedule(target_bot_id: str, source: ScheduleMessageRequest, deps=Depends(get_services)) -> dict:
    # Простая копия: повторно планируем те же настройки на другой bot_id
    _, scheduler, _ = deps
    src = source
    src.bot_id = target_bot_id
    return await schedule_message(src, deps)


@router.post("/moderate/ban")
async def ban_user(body: ModerationRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.ban_user(body.bot_id, body.chat_id, body.user_id, body.minutes, body.reason)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/moderate/mute")
async def mute_user(body: ModerationRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.mute_user(body.bot_id, body.chat_id, body.user_id, body.minutes, body.reason)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/moderate/kick")
async def kick_user(body: ModerationRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.kick_user(body.bot_id, body.chat_id, body.user_id, body.reason)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/moderate/unban")
async def unban_user(body: ModerationRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.unban_user(body.bot_id, body.chat_id, body.user_id, body.reason)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/moderate/unmute")
async def unmute_user(body: ModerationRequest, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    try:
        return await bot_service.unmute_user(body.bot_id, body.chat_id, body.user_id, body.reason)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{bot_id}/trigger-config")
async def set_trigger_config(bot_id: str, config: DelayedTriggerConfig, deps=Depends(get_services)) -> dict:
    """Настройка отложенного триггера для бота."""
    bot_service, _, _ = deps
    record = bot_service.require(bot_id)
    record.trigger_configs[config.trigger_type.value] = config.model_dump()
    return {"success": True, "trigger_type": config.trigger_type.value}


@router.get("/{bot_id}/trigger-config")
async def get_trigger_config(bot_id: str, deps=Depends(get_services)) -> Dict[str, Any]:
    """Получение конфигурации триггеров."""
    bot_service, _, _ = deps
    record = bot_service.require(bot_id)
    return {"bot_id": bot_id, "triggers": record.trigger_configs}


@router.delete("/{bot_id}/trigger-config/{trigger_type}")
async def delete_trigger_config(bot_id: str, trigger_type: str, deps=Depends(get_services)) -> dict:
    """Удаление конфигурации триггера."""
    bot_service, _, _ = deps
    record = bot_service.require(bot_id)
    if trigger_type in record.trigger_configs:
        del record.trigger_configs[trigger_type]
    return {"success": True}


__all__ = ["router"]


