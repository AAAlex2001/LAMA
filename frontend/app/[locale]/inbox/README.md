# Inbox

Раздел "Входящие" — единый центр уведомлений и переписки с подписчиками. Состоит из двух независимых под-разделов, переключение между которыми идёт через кнопку "Директ" в `InboxSortingBar` / `ChatSortingBar`:

- **Events feed** (`./page.tsx`) — лента системных событий: `join_request`, `channel_ban`, `bot_command`, `bot_error`, `system_trigger`, `system_autoreply`, `system_notification` и т.д. Источник — backend-модель `InboxEvent`.
- **Direct chats** (`./chat/page.tsx`) — DM-чаты подписчиков с ботом. Имеют WebSocket-канал для live-обновлений списка и сообщений.

Обе страницы делят один Redux-store (`./store/index.ts`) через [`InboxProvider`](./store/provider.tsx) и общий `<AppLayout>`.

## Точки входа

- [`page.tsx`](./page.tsx) → [`InboxView`](./InboxView.tsx) — events feed. Двусторонняя синхронизация URL `?filter=&sort=&status=&bot_ids=&channel_ids=&system=&type_auto_replies=&type_triggers=&type_commands=&search=` ↔ slice `inbox`. До завершения гидрации (`isReady=false`) `InboxSortingBar` не рендерится, чтобы избежать "мигания" дефолтных значений.
- [`chat/page.tsx`](./chat/page.tsx) → [`ChatView`](./chat/ChatView.tsx) — Direct. Управляет URL-параметрами `?chat_id=&bot_id=&message_id=&sort=&unread=`. Параметры `chat_id`/`bot_id`/`message_id` пробрасываются вглубь в [`InboxDirect`](./chat/components/InboxDirect/index.tsx) и используются для deep-link на конкретное сообщение из событий.

Action `reply` в Events автоматически делает `router.push('/inbox/chat?chat_id=...&bot_id=...&message_id=...')` — см. [`useInboxEventActions`](./components/InboxList/components/ListElement/hooks/useInboxEventActions.ts).

## Поток данных

### Events

```
useInboxEventsQuery (TQ infinite, app/store/inbox/queries.ts)
   ↓
InboxList — рендерит ListElement[] + sentinelRef через useInView
   ↓
ListElement → ActionGroup → конкретный *Actions компонент
   ↓
bulk:     useBulkInboxActionMutation     ({ event_ids, action: 'read'|'ignore'|'delete'|'block'|'unblock' })
specific: useSpecificInboxActionMutation ({ eventId, action_type: 'accept'|'reject'|'reply'|... , payload })
   ↓
invalidateInbox(qc) (на onSuccess)
```

Фильтры/сортировка хранятся в slice [`inbox`](./store/slices/inbox.ts) и попадают в queryKey как часть `InboxEventFilters` — изменение фильтра автоматически перезапрашивает страницы. `setSelectedFilter` сбрасывает все вторичные фильтры.

### Direct chats

Server-state Direct-чатов **не** в TanStack Query — он живёт в Redux slice [`directChat`](./store/slices/directChat.ts) (нормализованная мапа `chatsById` + `chatOrder`, отдельная мапа `messages[chatKey]` с `byId`/`order`). Это сделано ради простой мутации из WebSocket-handler'а.

```
useDirectChat() (./store/hooks/useDirectChat.ts) — главный фасад
   ↓
thunks: fetchDirectChatsThunk, fetchMoreDirectChatsThunk,
        fetchDirectMessagesThunk, sendDirectMessageThunk,
        createDirectChatThunk,   updateDirectChatThunk,
        editDirectMessageThunk,  deleteDirectMessageThunk
   ↓
directChatSlice (extraReducers + reducer wsMessageReceived)
   ↓
selectors с `createSelector` + extra-arg для параметризации по `chatKey`
        (см. selectDirectMessages, selectDirectMessagesLoading и т.д.)
```

`chatKey = makeChatKey(bot_id, tg_chat_id) = "${bot_id}_${tg_chat_id}"` — единый идентификатор чата на фронте; `activeChatId` тоже строка-`chatKey`. Отправка `sendMessage` оптимистично добавляет ответ сервера прямо через `wsMessageReceived` (без ожидания эхо-уведомления от WS).

## WebSocket

Singleton-сервис [`directChatWs`](./store/services/directChatWs.ts), URL: `${API_BASE_URL.replace('http','ws')}/direct/ws?token=<JWT>`.

Жизненный цикл (см. `useEffect` в `useDirectChat`):

1. `setHandlers(onEvent, onStatus)` — один раз при монтировании хука.
2. `connect(botId, tgChatId)` — переключение активного чата вызывает реконнект (фильтр серверных событий идёт ещё и на клиенте по `bot_id`/`chat_id`).
3. `disconnect()` — при unmount или сбросе активного чата.

Обработка событий (`WsEvent.type`):

| type | Действие |
|---|---|
| `message_new`, `message_edited`, `message_deleted` | `dispatch(fetchDirectMessagesThunk({ skip: 0, limit: 50 }))` — полный рефреш страницы 0 (детач/ховер-логика учитывается reducer'ом) |
| `chat_updated` | `dispatch(fetchDirectChatsThunk({}))` — перезагрузка списка чатов |

Keep-alive: `ping` каждые 30 с, `pong` фильтруется. Reconnect: базовая задержка 2000 мс с экспоненциальным backoff (`*1.5`, потолок 30 с); 3+ "быстрых" обрыва подряд (<5 с uptime) триггерят более агрессивную задержку.

## Структура каталога

```
inbox/
├── page.tsx, InboxView.tsx, styles.module.scss   — events shell
├── components/
│   ├── InboxSortingBar/                          — фильтры/сортировка events (desktop dropdowns + mobile PopupFilter)
│   ├── InboxList/                                — список событий, ListHeader (bulk-bar), ListElement (Desktop/Mobile)
│   │   └── components/ListElement/actions/       — JoinRequestActions, ReplyActions, ChannelBanActions, BotCommandActions, BotErrorActions, ... + ActionGroup (диспетчер по event_type)
│   ├── BlockModal, ConfirmBlockModal             — выбор причины и каналов для блокировки
│   ├── ConnectBot, CreateCommandModal,
│   │   CreateTriggersModal, CreateInviteLinkModal,
│   │   LinkInvitesModal, AutomatizationModal     — модалки CRUD-форм (state в соответствующих slice)
│   ├── BotSearchSelector, ResponseTextSection, EmptyState
│   └── sortTypes.ts
├── chat/
│   ├── page.tsx, ChatView.tsx
│   └── components/
│       ├── ChatSortingBar/                       — sort (new/old) + unread-фильтр для списка Direct
│       ├── CreateGlobalMesssageModal/            — массовая рассылка (опечатка в имени папки — sic)
│       └── InboxDirect/
│           └── components/
│               ├── DirectMenu/                   — список чатов (Pinned / Все), infinite scroll + ModalBotAutomatization
│               └── DirectChat/                   — собственно интерфейс чата
│                   ├── components/Header, MessageList, MessageElement, MessageField (+ EditReplyBar, ActionsRow)
│                   └── hooks/                    — useMessageScroll, useRenderedMessages, useScrollToMessage, useReplyFromParam, useDateSeparator, useChatActions, useMessageSending, useMessageInputMode, useReplyTextLookup
└── store/
    ├── index.ts, provider.tsx, selectors.ts, types.ts
    ├── hooks/                                    — useDirectChat, useCreateInviteLink, useCommands, useTriggers, useGlobalMessages
    ├── services/directChatWs.ts                  — WebSocket singleton
    ├── slices/
    │   ├── inbox.ts                              — фильтры/сортировка events
    │   ├── directChat.ts                         — нормализованные чаты/сообщения + WS state + флаги модалок (BotAutomatization / Trigger / GlobalMessage)
    │   ├── createInviteLinkModal.ts              — wizard (step + поля формы + previewData + editingLinkIds)
    │   ├── createTriggerModal.ts                 — форма триггера (тип, action, бот-селект)
    │   ├── createCommandModal.ts                 — форма bot-команды (scope PRIVATE/GROUPS)
    │   └── createGlobalMessageModal.ts           — форма массовой рассылки
    └── thunks/directChat.ts                      — все CRUD-запросы Direct + типы DTO
```

## Особые места

- **Bulk actions** в `InboxList`: `useCheckedItems` (хук со своим reducer) накапливает `Set<id>`. `ListHeader` показывает action-bar при `checkedItems.size > 0`. Поддерживаемые `BulkActionType`: `read | ignore | delete | block | unblock`.
- **Specific actions** в `ActionGroup`: разные компоненты под `event_type`. Action-кнопка зовёт `useSpecificInboxActionMutation` с `action_type` из набора `mark_resolved | ignore | reply | accept | reject | unban | block | delete_message | delete_and_block | change_ban`. После ответа результат хранится в локальном `blockStatus` ([`useInboxEventActions`](./components/InboxList/components/ListElement/hooks/useInboxEventActions.ts)) — это позволяет показать "Разблокирован/Проигнорировано" сразу, не дожидаясь refetch.
- **Block-flow двухступенчатый**: `block`-кнопка не зовёт мутацию сразу, а открывает `ConfirmBlockModal` через `blockDispatch` (общий стейт `useBlockConfirmation` на уровне `InboxList`); после подтверждения в `BlockModal` пользователь выбирает причину и затрагиваемые каналы, и только тогда отправляется `action_type: 'block'`.
- **Selectors с extra arg**: `selectDirectMessages(state, chatKey)`, `selectDirectMessagesLoading(state, chatKey)` и т.д. — паттерн `createSelector([..., (_s, chatKey) => chatKey], ...)`, описанный в CLAUDE.md. Используется через `useAppSelector((s) => selectXxx(s, chatKey))` в `useDirectMessages`.
- **Reply-режим и Edit-режим в одном инпуте**: [`useMessageInputMode`](./chat/components/InboxDirect/components/DirectChat/hooks/useMessageInputMode.ts) хранит `editingMessage`/`replyingTo`; [`EditReplyBar`](./chat/components/InboxDirect/components/DirectChat/components/MessageField/EditReplyBar.tsx) — inline-preview над текстареа с кнопкой отмены. `Escape` отменяет edit/reply, `Enter` отправляет, `Shift+Enter` — перенос строки. `startReplyById(id, messages)` нужен для deep-link `?message_id=` из events.
- **Detached / hasNewer**: при `?message_id=` jump'е reducer ставит `messagesDetached[chatKey]=true` и `hasNewer=true`, в `MessageList` появляется bottom-sentinel и кнопка "Прыгнуть к свежим" (`jumpToLatest` → `resetToLatest` + повторный fetch).
- **Templates (quick-reply)**: [`useTemplates`](./chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useTemplates.ts) — локальный хук с собственным `apiRequest`/`fetch` (не TQ, не общий `@/store/api`). Дергает `/publications/text-templates/`. Debounce поиска 300 мс. Выбор шаблона стрипает `<p>` и подставляет plain-text в инпут.
- **Modal-формы**: каждая своя slice + свой `useCreateXxx` хук, который читает форму из стора, шлёт API и закрывает модалку. Все три bot-action slices (`createTriggerModal`, `createCommandModal`, `createGlobalMessageModal`) шарят паттерн `selectedBotIds` + `botSearch`. Открытие глобальных модалок (`isBotAutomatizationModalOpen`, `isTriggerModalOpen`, `isGlobalMessageModalOpen`) живёт в `directChat` slice — это позволяет открывать их из `DirectMenu` без проп-дриллинга.
- **Опечатка в пути**: `chat/components/CreateGlobalMesssageModal/` — три "s" в "Mes**ss**age". Не трогать, на это уже завязаны импорты.
