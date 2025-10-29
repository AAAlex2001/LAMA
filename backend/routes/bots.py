"""
API endpoints для модуля "Боты":
- CRUD по токену
- Отправка DM
- Webhook приёма апдейтов
- WebSocket для событий в реальном времени
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request, Depends
from typing import List, Tuple

from backend.models.bot import (
    BotCreate,
    BotUpdate,
    BotResponse,
    SendDMRequest,
    SetWebhookRequest,
    SendMessageRequest,
    ScheduleMessageRequest,
    StatsResponse,
    CommandItem,
    CommandsResponse,
    PreviewRequest,
    PreviewResponse,
)
from backend.services.bot_service import BotService
from backend.services.websocket_service import WebSocketManager
from backend.services.scheduler_service import SchedulerService


router = APIRouter(prefix="/bots", tags=["bots"])


def get_services(request: Request) -> Tuple[BotService, SchedulerService, WebSocketManager]:
    return (
        request.app.state.bot_service,
        request.app.state.scheduler_service,
        request.app.state.ws_manager,
    )


@router.post("", response_model=BotResponse, status_code=201)
async def create_bot(data: BotCreate, deps=Depends(get_services)) -> BotResponse:
    bot_service, scheduler, _ = deps
    try:
        resp = await bot_service.create(data)
        # если включён суффикс — поставить периодическую задачу
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
        resp = bot_service.update(bot_id, data)
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
async def telegram_webhook(bot_id: str, request: Request, deps=Depends(get_services)) -> dict:
    bot_service, _, _ = deps
    payload = await request.json()
    return await bot_service.handle_webhook_update(bot_id, payload)


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
    _, scheduler, _ = deps
    # Для MVP планируем только once и points на ближайший день
    if body.schedule.type == "once" and body.schedule.run_at:
        for target_id in body.target_ids:
            scheduler.schedule_bot_message_once(
                job_id=f"bot_once_{body.bot_id}_{target_id}_{int(body.schedule.run_at.timestamp())}",
                run_at=body.schedule.run_at,
                bot_id=body.bot_id,
                target_type=body.target_type,
                target_id=target_id,
                message=body.message.model_dump(),
            )
        return {"success": True}
    if body.schedule.type == "points" and body.schedule.points:
        from datetime import datetime
        from dateutil import tz

        tzinfo = tz.gettz(body.schedule.timezone or "UTC")
        now = datetime.now(tzinfo)
        for p in body.schedule.points:
            run_at = datetime.combine(now.date(), p.at, tzinfo=tzinfo)
            if run_at <= now:
                continue
            for target_id in body.target_ids:
                scheduler.schedule_bot_message_once(
                    job_id=f"bot_point_{body.bot_id}_{target_id}_{now.date().isoformat()}_{p.at.isoformat()}_{body.schedule.timezone}",
                    run_at=run_at,
                    bot_id=body.bot_id,
                    target_type=body.target_type,
                    target_id=target_id,
                    message=body.message.model_dump(),
                )
        return {"success": True}
    raise HTTPException(status_code=400, detail="Schedule type not supported in MVP")


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
            # Админ может отправлять команды через сокет, пока заглушка
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(bot_id, websocket)


@router.post("/preview", response_model=PreviewResponse)
async def preview(body: PreviewRequest, deps=Depends(get_services)) -> PreviewResponse:
    bot_service, _, _ = deps
    data = await bot_service.render_preview(body.bot_id, body.message, body.user_id, body.timezone)
    return PreviewResponse(**data)


__all__ = ["router"]


