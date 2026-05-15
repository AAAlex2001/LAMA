# Create-post

Страница создания публикации в Telegram-каналы. Tiptap-редактор + Redux-store
(локальный для страницы), TanStack Query для серверных данных (каналы, теги,
шаблоны, публикации). Тот же `CreatePostProvider` и слайсы переиспользуются в
`edit-post` и `edit-draft`. Поддерживает одиночные посты, серии постов,
повторы, автоудаление, опросы/викторины, inline-кнопки, теги, ответ на пост и
рекламную атрибуцию.

## Точки входа

- [`page.tsx`](./page.tsx) — оборачивает `CreatePostView` в `AppLayout`
  и `CreatePostProvider`.
- [`store/provider.tsx`](./store/provider.tsx) — `react-redux` `Provider` с
  локальным `createPostStore`. Импортируется также из `edit-post/page.tsx` и
  `edit-draft/page.tsx`.
- [`views/CreatePostView.tsx`](./views/CreatePostView.tsx) — корневой
  компонент, собирает `EditorHeaderConnected` + `PostEditorMainFields` +
  `FooterButtonsConnected` + `PostSettingsConnected` + модалки из
  `PostEditorSharedModals`. Тут же — список аккордеонов для серии и кнопка
  "Добавить серию постов".
- [`components/post-editor/PostEditorMainFields.tsx`](./components/post-editor/PostEditorMainFields.tsx)
  — обёртка над общим `@/components/rich-text-editor` (Tiptap) + связные
  секции `ActionsMenuConnected`, `InlineButtonsConnected`, `QuizFormConnected`,
  `MediaSectionConnected`, `ReplyToPostInfoConnected`, тоггл превью ссылки.

## Поток данных

1. Пользователь печатает в Tiptap — `RichTextEditor.onChange` пишет HTML в
   `editor.text`. Параллельно набивает медиа (`media.files`), inline-кнопки
   (`inlineButtons.rows`), опрос (`quiz`), теги/повтор/автоудаление/рекламу
   (`settings`), даты планирования (`datePicker`), выбранные каналы
   (`channelsSelection.selectedIds`).
2. Превью — `ui.setShowPreviewModal(true)` открывает
   `PostPreviewModalConnected`, который рендерит текущий срез слайсов.
3. Публикация/сохранение — кнопки `FooterButtonsConnected` зовут хук
   [`usePublishHandlers`](./hooks/usePublishHandlers.ts) → thunks
   `publishNow`, `publishSeries`, `schedulePost`, `saveDraft`. Thunks
   валидируют состояние (`validatePost`, `validateTelegramMediaRules`,
   `validateInlineButtons`, `validateQuizState`), загружают файлы через
   `uploadMediaFile`, собирают `CreatePostRequest` в
   [`thunks/utils.ts`](./store/thunks/utils.ts) и шлют `POST /publications`
   (+ `POST /publications/:id/publish` для немедленной отправки). После успеха
   инвалидируется TanStack-кеш (`invalidatePublications`, `invalidateTags`) и
   диспатчатся все `reset*`-экшены.
4. Загрузка существующего черновика — хук
   [`useDraftFromUrl`](./hooks/useDraftFromUrl.ts) читает `?draft=<id>` или
   `?token=<share>`, диспатчит `loadDraftById` / `loadDraftByToken` →
   `loadDraftIntoStore` / `applySeriesToStore` из
   [`applyDraft.ts`](./store/applyDraft.ts) разливает поля по слайсам.

## 9 слайсов

| Слайс | Что хранит | Ключевые actions |
|-------|------------|------------------|
| `editor` | HTML-текст Tiptap, флаг превью ссылки | `setText`, `setShowLinkPreview`, `resetEditor` |
| `media` | Массив `MediaFile[]` (до 10 шт.) с File-объектами | `addFiles`, `removeFile`, `setFiles`, `moveFile`, `toggleBlur`, `clearFiles` |
| `inlineButtons` | `isOpen` + `rows: ButtonRow[]` | `open/close/toggle`, `setRows`, `addRow`, `addColumn`, `updateButton`, `deleteButton` |
| `quiz` | `isOpen`, `mode`, `question`, `answers`, `correctAnswerId` + селектор `selectPollData` | `open/close/toggle`, `setMode`, `setQuestion`, `setAnswerText`, `addAnswer`, `removeAnswer`, `setCorrectAnswer` |
| `settings` | Каналы (кэш + флаги), уведомления/пин, теги, повтор, автоудаление, реклама, `replyToPostId` | `setChannels*`, `setNotifySubscribers`, `setPinPost`, `addTag`/`removeSelectedTag`, `setRepeat*`, `setAutoDelete*`, `setAdSettings`, `setReplyToPostId`, `resetSettings` |
| `ui` | Флаги модалок (preview, mobileSettings, tagsPanel, drafts, templates, reply, datePicker, seriesSchedule) + флаги загрузки (`isPublishing`, `isSavingDraft`, `isScheduling`, `isLoadingAi`) | `setShow*`, `setIs*`, `resetUi` |
| `series` | `snapshots: PostSnapshot[]` + `activeIndex` для серии постов | `addPost`, `removePost`, `setActiveIndex`, `saveCurrentSnapshot`, `setSnapshots`, `resetSeries` |
| `datePicker` | `selectedDate`, `hours`, `minutes` для планирования | `setSelectedDate`, `setHours`, `setMinutes`, `resetDatePicker` |
| `channelsSelection` | `selectedIds: number[]` — реальный источник правды о выбранных каналах | `toggleChannelId`, `setSelectedChannelIds`, `clearSelectedChannels` |

> CLAUDE.md упоминает 13 слайсов (включая отдельные `tags`, `templates`,
> `drafts`, `replyToPost`) — фактически их 9. Теги и `replyToPostId` живут
> внутри `settings`, шаблоны и черновики тянутся напрямую через TanStack Query
> (`useTagsQuery`, `useSaveTextTemplateMutation`, и т.д.) и не имеют слайсов.

## Структура каталога

```
create-post/
├── page.tsx                          # Next.js-точка входа
├── views/
│   └── CreatePostView.tsx            # Корневой view
├── components/
│   ├── editor-header/                # SelectedTagsRow + TagsPanel + Tag* строки
│   ├── post-editor/                  # PostEditorMainFields, PostEditorSharedModals
│   ├── PostSettings/                 # index.tsx + ChannelsSection, AutoDeleteSection, RepeatSection, BottomActions
│   ├── ActionsMenuConnected.tsx      # Кнопки: черновики, шаблоны, опрос, inline, reply
│   ├── FooterButtonsConnected.tsx    # Опубликовать сейчас / запланировать / в черновик
│   ├── MediaSectionConnected.tsx     # Дропзона + media-preview
│   ├── InlineButtonsConnected.tsx
│   ├── QuizFormConnected.tsx
│   ├── ReplyToPostInfoConnected.tsx
│   ├── ReplyModalConnected.tsx
│   ├── DraftsModalConnected.tsx
│   ├── TemplatesModalConnected.tsx
│   ├── DatePickerModalConnected.tsx
│   ├── PostPreviewModalConnected.tsx
│   ├── SeriesScheduleModalConnected.tsx
│   └── MobileSettingsModalConnected.tsx
├── hooks/
│   ├── useCreatePostHandlers.ts      # add/select/remove поста серии
│   ├── usePublishHandlers.ts         # publishNow/publishSeries/schedule + валидация + тосты
│   ├── useSelectedChannels.ts        # TQ-каналы ∩ channelsSelection.selectedIds
│   ├── useTokenFromUrl.ts            # access_token из ?token=… в localStorage
│   ├── useDateFromUrl.ts             # ?date=YYYY-MM-DD → datePicker
│   ├── useDraftFromUrl.ts            # ?draft=<id> или share ?token → loadDraft*
│   └── usePostEditorChannelEffects.ts# Показ ошибок useChannelsQuery
├── store/
│   ├── index.ts                      # configureStore (9 reducers, ignored paths для File-объектов)
│   ├── provider.tsx                  # CreatePostProvider
│   ├── selectors.ts                  # (пусто, комментарий о TQ)
│   ├── types.ts                      # MediaFile, PostSnapshot, PostSettings, CreatePostRequest…
│   ├── applyDraft.ts                 # Draft → store (одиночный или серия)
│   ├── snapshotSettings.ts           # capture/applySnapshotSettings — настройки per-post
│   ├── slices/                       # 9 файлов (см. таблицу выше)
│   └── thunks/
│       ├── index.ts                  # Реэкспорт
│       ├── publish.ts                # publishNow
│       ├── publishSeries.ts          # publishSeries
│       ├── schedule.ts               # schedulePost
│       ├── scheduleSeries.ts         # scheduleSeries
│       ├── draft.ts                  # saveDraft (single + series, create + update)
│       ├── updatePost.ts             # updatePost, createSingleOccurrence, moveToDraft
│       ├── loaders.ts                # loadDraftById, loadDraftByToken
│       └── utils.ts                  # prepareMediaPayload, buildCreatePostRequest, validate*
└── utils/
    ├── draftToPostSnapshot.ts        # Draft API → PostSnapshot
    └── mediaFilesFromInput.ts        # FileList → MediaFile[] (превью, video duration)
```

## Особые места

### Реюз в edit-post / edit-draft

`edit-post/page.tsx` и `edit-draft/page.tsx` импортируют
`CreatePostProvider` из `../create-post/store/provider`. Соответственно вся
эта store-инфраструктура — слайсы, thunks (`updatePost`,
`createSingleOccurrence`, `moveToDraft`, `loadDraftById`), `applyDraft`,
`snapshotSettings` — общая. Различия только в собственных view-компонентах
(`EditPostView`, `EditDraftView`) и сценариях footer-кнопок.

### Tiptap-композиция

`useTiptapEditor` (в общем `@/components/rich-text-editor`) собран на
`StarterKit` + `extension-code`, `extension-underline`, `extension-link`,
`extension-code-block-lowlight` (с `common` + `nginx` + `dockerfile`). Сверху
— собственные расширения: `MonospaceCode`, `CustomCodeBlock`,
`SpoilerMark` (`<tg-spoiler>`), `AutoCodeDetect` (paste-плагин, ловит
код-вставки и оборачивает в codeBlock с автодетектом языка),
`OverLimitHighlight` (декорации красным цветом сверх `maxLength` —
1024 при наличии медиа, 4096 без), `AiSelectionHighlight` (подсветка
диапазона при работе AI-ввода). Bubble-menu реализован через собственный
`FloatingToolbar` — не через `@tiptap/extension-bubble-menu`. Плейсхолдер
тоже свой — `placeholder`-расширения нет, отрисовывается через CSS-псевдо.

### Декомпозиция `PostSettings`

[`PostSettings/index.tsx`](./components/PostSettings/index.tsx) держит
только `openDropdown` (одна открытая секция за раз) и собирает
`ChannelsSection` / `AutoDeleteSection` / `RepeatSection` / `BottomActions`.
Каждая секция сама делает `useAppSelector` по своему срезу и `dispatch`
своих экшенов — index ничего не пробрасывает пропсами. `BottomActions`
держит тоггл уведомлений, пин, рекламу и кнопки "Предпросмотр"/"Сбросить".

### Media: только Redux, без `useMessageMedia`

Несмотря на упоминание в `frontend/CLAUDE.md`, страница `create-post` не
использует хук `useMessageMedia` — все файлы лежат в Redux-слайсе
[`media`](./store/slices/media.ts) как массив `MediaFile`. Несериализуемые
`File`-объекты пропущены в `serializableCheck.ignoredPaths` стора. Перед
сохранением в snapshot серии `File` вырезается (`toSerializableSnapshot` в
`useCreatePostHandlers` / `usePublishHandlers`). `useMessageMedia` живёт в
`app/hooks` и применяется в inbox / bot-command / auto-reply.

### AI-генерация контента

Отдельного thunk нет. AI работает через `AiInputBar`, встроенный в
`RichTextEditor`, и обращается к API напрямую. Слайс `ui` держит флаг
`isLoadingAi`, но он сейчас никем не выставляется. Подсветка выделения,
которое редактирует AI, реализована расширением `AiSelectionHighlight` и
методом `setAiHighlight` редактора.

### Серии постов

[`series`](./store/slices/series.ts) хранит массив `PostSnapshot` (включая
per-post `settings: PostSettings`). При переключении вкладок
`useCreatePostHandlers.handleSelectPostSnapshot` сохраняет текущий редактор
в активный snapshot (`saveCurrentSnapshot`) и заливает выбранный snapshot
обратно в `editor`/`media`/`inlineButtons`/`quiz`/`settings` через
`applySnapshotSettings`. Это позволяет каждому посту в серии иметь свои
каналы, повтор, теги. Сохранение серии (`publishSeries`, `scheduleSeries`,
`saveDraft` при `snapshots.length >= 2`) сначала создаёт
`POST /publications/series`, затем шлёт `POST /publications` с `series_id`
+ `series_order` для каждого snapshot. При редактировании существующей
серии (`editingExistingSeries`) каждый snapshot обновляется через
`PUT /publications/:id`.

## Что улучшить

- **`thunks/utils.ts` (≈13КБ) и `thunks/draft.ts` (≈7КБ)** — слишком
  крупные. `draft.ts` практически трижды дублирует сборку `pollData` из
  snapshot'а; есть `buildPollDataFromSnapshot` в `utils.ts`, который уже
  используется в `publishSeries.ts` — стоит подтянуть и сюда. Логика
  "single / new series / existing series" в `saveDraft` просится в
  отдельные функции.
- **Несоответствие документации коду** — CLAUDE.md перечисляет 13
  несуществующих слайсов и упоминает `useMessageMedia` / `bubble-menu` /
  `placeholder` / `character-count`, которых здесь нет. Стоит привести
  CLAUDE.md в порядок или принять текущую реальность за норму.
- **`ui.isLoadingAi`** объявлен, но не используется — мёртвый код.
- **`console.log` в `useTokenFromUrl`** и `console.warn` в
  `publish.ts` / `schedule.ts` (`Failed to create ad revenue`) — стоит
  заменить на нормальный логгер или показ нотификации.
- **`AdToggleSection` создаёт запись о выручке только в `publishNow` и
  `schedulePost`** — при `saveDraft` и в серийных thunks (`publishSeries`,
  `scheduleSeries`) `createAdRevenue` не вызывается. Либо это намеренно
  (выручка только за немедленную одиночную публикацию), либо это баг —
  стоит проверить продуктовое поведение.
- **Авто-выбор всех каналов** в `ChannelsSection` через `didAutoSelectRef`
  работает только при первом маунте — при переходе со страницы редактирования
  обратно ref может сработать неожиданно. Логика на стыке маунта и загрузки
  TanStack Query хрупкая.
- **`mediaFiles.length === 0 && !pollData` валидация в `saveDraft`** —
  одиночные посты с одними только inline-кнопками отдадут ошибку "Текст
  поста или медиа не могут быть пустыми". В серийном режиме такая проверка
  снята.
