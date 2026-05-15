# schemas/

Pydantic v2 схемы для HTTP-роутов: request payloads и response models. Каждый домен — отдельный пакет (`schemas/<domain>/__init__.py` реэкспортирует всё для удобного `from backend.schemas.<domain> import X`).

## Карта пакетов

| Пакет | Что описывает | Главные классы |
|---|---|---|
| [auth/](auth/) | Логин, регистрация, сессии, токены | `AuthResponse`, `RegisterRequest`, `EmailLoginRequest`, `TelegramAuthPayload`, `BotLoginRequest`, `RefreshTokenRequest`, `UserResponse`, `UserStatsResponse`, `SessionListResponse`, `UserUpdateRequest`, `AddEmailRequest` |
| [bots/](bots/) | CRUD ботов и их сущностей | `BotCreate/Update/Response`, `BotCommandCreate/Response`, `TriggerCreate/Response`, `AutoReplyCreate/Response`, `RecurringMessage*`, `WelcomeSettings`, `SendMessageRequest`, `BotMessageResponse`, `AutoApprovalSettings` |
| [channels/](channels/) | CRUD каналов + 14 настроек (antispam/flood/banned_words/captcha/...) | `ChannelGroupCreate/Update/Response`, `ChannelModerationRule*`, `AntispamSettings*`, `FloodSettings*`, `ChannelAutoDeleteSettings*`, `InviteLink*`, `BackupModeUpdateRequest`, `BackedUpPost*`, `RestoreBackup*`, `ChannelStatsResponse`, `InfoMessage*`, `ForumTopic*`, `BannedWordsSettings*`, `CaptchaSettings*`, `MediaBlockSettings*`, `NightModeSettings*`, `QuickCommandsSettings*`, `SyncChannelRequest/Response` |
| [publications/](publications/) | Публикации + публикация в TG + теги + серии + AI + шаблоны | `PublicationBase/Create/Update/Response`, `TagResponse`, `PublicationSeriesResponse`, `EditPublishedRequest`, `PublishResult`, `ChannelPublishResult`, `NotificationResponse`, `TelegramMessageResponse`, `GenerateContentRequest`, `EditContentRequest`, `InlineKeyboard`, `PollData`, `TextTemplate*` |
| [direct/](direct/) | DM-чаты и сообщения | `DirectChatResponse`, `DirectChatListResponse`, `DirectChatCreate/Update`, `ChatHistoryResponse`, `EditMessageRequest` |
| [inbox/](inbox/) | События inbox и действия | `InboxEventCreate`, `InboxEventResponse`, `InboxListResponse`, `BulkActionRequest`, `SpecificActionRequest`, `SpecificActionResult` |
| [ad_revenues/](ad_revenues/) | Учёт рекламы | `AdRevenueCreate/Update/Response`, `AdRevenueListResponse`, `MonthlyStatsResponse`, `CommunityStatsResponse` |
| [webhook/](webhook/) | Приём webhook от Telegram | `TelegramWebhookRequest`, `WebhookAcceptedResponse` |
| [landing.py](landing.py) (single file) | Контент лендинга для PUT-запросов | `HeroContentRequest`, `AdvantagesContentRequest`, `FAQContentRequest`, `PricingContentRequest`, `HeaderContentRequest`, `FooterContentRequest`, `UsersContentRequest`, `LamaContentRequest`, `ToolsContentRequest`, `KeyAdvantagesContentRequest`, `TemplateContentRequest`, `CreateTemplateRequest`, `UpdateTemplateRequest` |
| [knowledge_base.py](knowledge_base.py) | KB категории + статьи + feedback | `CreateKBCategoryRequest`, `UpdateKBCategoryRequest`, `CreateKBArticleRequest`, `UpdateKBArticleRequest`, `FeedbackRequest`, `ArticleListResponse`, `ArticleResponse`, `CategoryResponse`, `NavigationCategory`, `FeedbackResponse` |
| [link_preview.py](link_preview.py) | OG-превью | `LinkPreview` |
| [common.py](common.py) | Универсальные DTO | `TokenPair`, `DownloadedMedia`, `IncomingMediaInfo`, `PaginatedResponse` |

## Enums

Enum-ы лежат в отдельных модулях рядом со схемами и переэкспортируются:

| Файл | Enums |
|---|---|
| [auth/](auth/) | — (юзерские enums в `backend/models/auth.py::UserRole`) |
| [bots/...](bots/) | enums тут не отдельно, в схемах используются модельные (`BotStatus`, `TriggerType`, `MessageType`, `CaptchaMode`, `ApprovalMode`, `ApprovalDestination`, `TriggerActionType`, `RecurringMessageInterval`, `CommandScope`, `TriggerChatType`) |
| [channels/enums.py](channels/enums.py) | `ChannelType`, `BackupMode`, `BackupStatus` (+ модельные `ActionType`, `LinkFilterMode`, `CaptchaFailAction`) |
| [publications/enums.py](publications/enums.py) | `ContentType`, `PublicationStatus`, `RepeatInterval`, `RepeatCustomUnit` |
| [inbox/enums.py](inbox/enums.py) | `InboxCategory`, `EntityType`, `EventType`, `EventStatus`, `BulkActionType`, `SortDir` |
| [ad_revenues/enums.py](ad_revenues/enums.py) | `DataType`, `Currency`, `Scope` |

## Конвенции

### Naming

- `*Create` — payload для POST (поля обязательные)
- `*Update` — payload для PATCH (все поля optional)
- `*Response` — для ответа клиенту (с `id`, `created_at`, `updated_at`)
- `*Request` — для специфичных POST/PUT (когда не CRUD)
- `*ListResponse` — `{items: [...], total: int, has_more: bool}` или `{items, total, page, page_size}`

### Pydantic v2

Везде используется Pydantic v2 API:
- `model_config = ConfigDict(from_attributes=True)` вместо старого `class Config: orm_mode = True`
- `@field_validator(...)` + `@classmethod` вместо `@validator(...)`
- `@model_validator(mode="after")` — instance-метод (`def foo(self)`), а не classmethod
- `.model_dump(mode="python")` вместо `.dict()`

### `from_attributes`

Для всех `*Response` схем, которые маппятся напрямую с SQLAlchemy-моделей — `model_config = ConfigDict(from_attributes=True)`. Это позволяет FastAPI делать `Response.model_validate(orm_obj)`.

### Optional поля и None

Для `*Update`-схем все поля `Optional[...] = None`. Сервис проверяет `is not None` чтобы не затереть существующие значения дефолтами.

### Cross-model валидаторы

В `publications/publications.py` есть `@model_validator(mode="after")` которые проверяют согласованность полей:
- `validate_content_payload` — есть ли `text_content`/`media_urls` под выбранный `content_type`
- `validate_auto_delete` — нельзя задать и `auto_delete_hours`, и `auto_delete_delay_seconds`
- `validate_repeat_end_time` — `repeat_end_time` должен быть позже `scheduled_time`

### Реэкспорт через `__init__.py`

Каждый пакет (например `schemas/channels/`) имеет `__init__.py` который реэкспортирует все классы. Это позволяет:

```python
from backend.schemas.channels import (
    ChannelGroupCreate,
    AntispamSettingsResponse,
    InviteLinkResponse,
)
```

Импортирующему коду не нужно знать в каком конкретном файле живёт схема. Это удобно при рефакторинге — можно перенести `InviteLinkResponse` из `invite_links.py` в `channels.py` без изменения вызовов.

## Особые схемы

### `InboxEventResponse` ([inbox/events.py](inbox/events.py))

Имеет `@model_validator(mode="after")` который дополняет поля из `payload`:
- `trigger_names` ← `payload["trigger_names"]`
- `reason` ← `payload["reason"]` / `payload["block_reason"]` / `payload["trigger_reason"]`, или собирается из trigger_names, или из description
- `reason_source` ← `payload["reason_source"]`

Это даёт фронту готовый человекочитаемый текст без копания в `payload`.

### `PublicationBase` ([publications/publications.py](publications/publications.py))

Самая большая схема — ~50 полей. Объединяет:
- Контент (text/media/keyboard/poll)
- Расписание (scheduled_time, timezone)
- Повторения (repeat_* серия полей)
- Auto-delete
- AI-генерация (ai_prompt)
- Реклама (is_ad, ad_buyer, ad_amount)
- Каналы и теги

`Create` добавляет всё обязательное, `Update` делает всё `Optional`.

### `ChannelPublishResult` + `PublishResult` ([publications/publishing.py](publications/publishing.py))

`ChannelPublishResult` — что произошло при отправке в один канал: success/error/permanent/replied_to/telegram_messages_data. Имеет `arbitrary_types_allowed=True` потому что хранит `channel_obj` и `sent_messages` как-есть (для дальнейшей обработки).

`PublishResult` агрегирует список `ChannelPublishResult` + общий success_count.

### `TelegramWebhookRequest` ([webhook/telegram.py](webhook/telegram.py))

```python
class TelegramWebhookRequest(BaseModel):
    bot_token: str           # из URL path: /telegram/webhook/{bot_token}
    secret_token: str | None # из header X-Telegram-Bot-Api-Secret-Token
```

⚠ `bot_token` обязательный — Pydantic не пропустит None.

### `SpecificActionResult` ([inbox/events.py](inbox/events.py))

Полиморфный ответ для разных action_type:
- `mark_resolved` / `ignore` / `accept` / `reject` / `block` / `unban` / `delete_message` → только `status`
- `reply` → `status="reply"` + `bot_id` + `tg_user_id` + `chat_id` + `message_id` (для перехода в Direct)
- `change_ban` → `status="changed"` + `affected_channels[]`

## SQL-mapping vs Pydantic типы

| SQL | Pydantic |
|---|---|
| `Integer` / `BigInteger` | `int` |
| `String(N)`, `Text` | `str` |
| `Boolean` | `bool` |
| `Numeric` / `DECIMAL` | `Decimal` |
| `DateTime(timezone=True)` | `datetime` |
| `JSONB` | `dict[str, Any]` или вложенный pydantic-класс |
| `Enum(MyEnum)` | `MyEnum` |
| `Nullable=True` | `Optional[T] = None` |

## Где какие схемы используются

См. README соответствующих сервисов / routes — там всегда указаны конкретные `*Request`/`*Response`.
