"""
Модели данных для модуля "Каналы/группы".
CRUD операции, синхронизация через Telegram API, бекапы и перезалив постов.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Literal, Any
from datetime import datetime
from enum import Enum


class ChannelType(str, Enum):
    """Тип канала/группы."""
    CHANNEL = "channel"
    GROUP = "group"
    SUPERGROUP = "supergroup"


class BackupMode(str, Enum):
    """Режим бекапа канала."""
    DISABLED = "disabled"  # выключено
    INSTANT = "instant"  # моментально
    POSTFACTUM = "postfactum"  # постфактум


class ChannelCreate(BaseModel):
    """Создание нового канала/группы."""
    
    telegram_chat_id: str = Field(..., description="ID канала/группы в Telegram (например, @channel или -1001234567890)")
    bot_id: str = Field(..., description="ID бота, который будет работать с каналом")
    name: Optional[str] = Field(None, description="Название канала (если не указано, будет получено из Telegram)")
    backup_mode: BackupMode = Field(default=BackupMode.DISABLED, description="Режим бекапа")
    backup_channel_id: Optional[str] = Field(None, description="ID канала-ретранслятора для бекапа (для режима instant)")


class ChannelUpdate(BaseModel):
    """Обновление параметров канала/группы."""
    
    name: Optional[str] = None
    backup_mode: Optional[BackupMode] = None
    backup_channel_id: Optional[str] = None
    auto_sync: Optional[bool] = Field(None, description="Автоматическая синхронизация данных из Telegram")


class ChannelResponse(BaseModel):
    """Информация о канале/группе."""
    
    id: str = Field(..., description="Внутренний ID канала")
    telegram_chat_id: str = Field(..., description="ID канала в Telegram")
    bot_id: str = Field(..., description="ID бота, работающего с каналом")
    name: Optional[str] = None
    username: Optional[str] = Field(None, description="Username канала (например, @channel)")
    type: ChannelType
    description: Optional[str] = None
    members_count: Optional[int] = Field(None, description="Количество участников")
    photo_url: Optional[str] = Field(None, description="URL фото канала")
    backup_mode: BackupMode
    backup_channel_id: Optional[str] = None
    auto_sync: bool = Field(default=True, description="Автоматическая синхронизация")
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ChannelSyncRequest(BaseModel):
    """Запрос на синхронизацию данных канала из Telegram."""
    
    channel_id: str


class ChannelSyncResponse(BaseModel):
    """Ответ на синхронизацию."""
    
    success: bool
    channel_id: str
    synced_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PostBackup(BaseModel):
    """Модель сохраненного поста для бекапа."""
    
    message_id: int = Field(..., description="ID сообщения в оригинальном канале")
    text: Optional[str] = None
    media: Optional[List[Dict[str, Any]]] = None
    inline_buttons: Optional[List[List[Dict[str, Any]]]] = None
    date: datetime = Field(..., description="Дата публикации поста")
    channel_id: str = Field(..., description="ID канала, откуда был сохранен пост")
    original_chat_id: str = Field(..., description="Telegram chat_id оригинального канала")


class BackupPostResponse(BaseModel):
    """Информация о сохраненном посте."""
    
    id: str
    message_id: int
    channel_id: str
    date: datetime
    has_media: bool
    has_text: bool


class CopyPostsRequest(BaseModel):
    """Запрос на копирование постов в другой канал."""
    
    source_channel_id: str = Field(..., description="ID исходного канала")
    target_channel_id: str = Field(..., description="ID целевого канала")
    start_date: Optional[datetime] = Field(None, description="Начальная дата постов для копирования")
    end_date: Optional[datetime] = Field(None, description="Конечная дата постов для копирования")
    limit: Optional[int] = Field(None, description="Максимальное количество постов (если не указано - все)")


class CopyPostsResponse(BaseModel):
    """Ответ на копирование постов."""
    
    success: bool
    copied_count: int
    source_channel_id: str
    target_channel_id: str
    error: Optional[str] = None


class ChannelListResponse(BaseModel):
    """Список каналов."""
    
    channels: List[ChannelResponse]
    total: int


__all__ = [
    "ChannelType",
    "BackupMode",
    "ChannelCreate",
    "ChannelUpdate",
    "ChannelResponse",
    "ChannelSyncRequest",
    "ChannelSyncResponse",
    "PostBackup",
    "BackupPostResponse",
    "CopyPostsRequest",
    "CopyPostsResponse",
    "ChannelListResponse",
]

