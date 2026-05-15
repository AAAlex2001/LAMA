from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.bots.messages import (
    BotMessageBatchResponse,
    BotMessageResponse,
    SendMessageRequest,
)
from backend.schemas.direct.message import ChatHistoryResponse, EditMessageRequest
from backend.services.direct.features.chats.get_chat_messages import GetChatMessages
from backend.services.direct.features.chats.reset_unread import ResetUnread
from backend.services.direct.features.messages.delete_message import DeleteMessage
from backend.services.direct.features.messages.edit_message import EditMessage
from backend.services.direct.features.messages.send_message import SendMessage

router = APIRouter(prefix="", tags=["Direct / Messages"])


@router.get(
    "/chats/{bot_id}/{tg_chat_id}/messages",
    response_model=ChatHistoryResponse,
    summary="История сообщений в чате",
    description=(
        "Постранично с reply-preview (текст / медиа того сообщения, на которое отвечают) "
        "и обогащением raw_data (media_group_id, имя файла, размер). "
        "Режимы навигации: обычная страница / around_message_id (половина до + половина после, "
        "для перехода по reply-ссылке) / after_message_id (только новее указанного telegram_message_id). "
        "Side effect: при открытии чата сбрасывает unread_count в 0."
    ),
)
async def get_chat_messages(
    bot_id: int,
    tg_chat_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    around_message_id: Optional[int] = Query(None, description="Load messages around this ID"),
    after_message_id: Optional[int] = Query(None, description="Load messages newer than this telegram_message_id"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages, total = await GetChatMessages(db).execute(
        bot_id, tg_chat_id,
        owner_id=current_user.id,
        skip=skip, limit=limit,
        around_message_id=around_message_id,
        after_message_id=after_message_id,
    )
    await ResetUnread(db).execute(bot_id, tg_chat_id, owner_id=current_user.id)
    return {
        "items": messages,
        "total": total,
        "page": (skip // limit) + 1,
        "page_size": limit,
        "has_more": (skip + limit) < total,
    }


@router.post(
    "/chats/{bot_id}/{tg_chat_id}/messages",
    response_model=BotMessageBatchResponse,
    summary="Отправить сообщение пользователю от лица бота",
    description=(
        "Маршрут отправки: 0 media + текст → send_message; 1 media → send_<photo|video|...>; "
        "2..10 media → send_media_group (альбом, caption на первом). "
        "Поддерживает inline-клавиатуру (buttons), reply_to_message_id. "
        "После успешной отправки сохраняет BotMessage(is_incoming=False), обновляет превью чата "
        "и шлёт WS-событие message_new (для синхронизации других открытых клиентов). "
        "При ошибке TG-отправки возвращает пустой items=[]."
    ),
)
async def send_message(
    bot_id: int,
    tg_chat_id: int,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = await SendMessage(db).execute(bot_id, tg_chat_id, current_user.id, request)
    return {"items": messages}


@router.patch(
    "/messages/{message_id}",
    response_model=BotMessageResponse,
    summary="Редактировать отправленное сообщение",
    description=(
        "Меняет text_content. Под капотом — edit_message_text для TEXT, edit_message_caption для медиа. "
        "Работает только для исходящих сообщений (is_incoming=False), TG не даёт менять чужие. "
        "После успеха шлёт WS-событие message_edited."
    ),
)
async def edit_message(
    message_id: int,
    request: EditMessageRequest,
    bot_id: int = Query(..., description="Bot ID"),
    tg_chat_id: int = Query(..., description="Telegram chat ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await EditMessage(db).execute(
        message_id, current_user.id, request, bot_id=bot_id, tg_chat_id=tg_chat_id,
    )


@router.delete(
    "/messages/{message_id}",
    summary="Удалить отправленное сообщение",
    description=(
        "Сначала delete_message в TG, потом DELETE из BotMessage, потом WS-событие message_deleted. "
        "Если TG-вызов упал — БД-запись не трогаем (HTTP 400). "
        "Только для исходящих сообщений; TG не даёт удалять входящие старше 48ч."
    ),
)
async def delete_message(
    message_id: int,
    bot_id: int = Query(..., description="Bot ID"),
    tg_chat_id: int = Query(..., description="Telegram chat ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteMessage(db).execute(
        message_id, current_user.id, bot_id=bot_id, tg_chat_id=tg_chat_id,
    )
    return {"status": "ok"}
