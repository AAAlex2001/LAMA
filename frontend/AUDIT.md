# Frontend Audit & Refactoring Plan

Дата: 2026-05-04. Цель: постепенно навести порядок без поломок. Каждый шаг — атомарный, проверяемый, deployable.

---

## TL;DR — главные боли

1. **9 Redux-сторов** + двойная архитектура (Redux + TanStack Query параллельно). Server-data (`channels`, `tags`, `publications`, `bots`) грузится в 3-8 местах независимо.
2. **Cross-boundary imports** — `components/` (shared) импортирует из `app/[locale]/<feature>/`. Архитектурный слой нарушен.
3. **Дубликаты компонентов** — `Button` (deprecated, 49 импортов) ↔ `new-button/Button` (58); 4 разных date-picker; 10+ модалок без единого паттерна.
4. **Огромные компоненты** — `ModerationSection.tsx` 1088 строк, `post-settings.tsx` 56 props.
5. **Перформанс** — `PostSettingsConnected` имеет 22 отдельных `useSelector`; селекторы возвращают новые объекты без `useMemo`.
6. **AsyncThunks делают много** — `publishNow` = 1 API + 1 wallet API + 8 reset-dispatch + fetch tags. 5+ concerns в одной функции.
7. **CLAUDE.md в проекте устарела** — описывает архитектуру с `Depends(get_xxx_service)` которой нет.

---

## Принципы рефакторинга

- **Всё по одному PR**. Один файл / один паттерн / одна боль за подход.
- **Никогда не ломать рабочее.** Каждый шаг проверяется `tsc --noEmit` + ручной smoke на странице.
- **Постепенный переход**, а не big-bang. Старый код может ещё некоторое время сосуществовать с новым.
- **Server-data → TanStack Query.** Local UI state → Redux. Это правило-разделитель.
- **Shared не зависит от features.** Зависимость только в одну сторону: `app/[locale]/<feature>` → `components/`.

---

## Проблемы по приоритету

### 🔴 P0 — больно прямо сейчас

#### P0.1 Cross-boundary imports
Shared компоненты импортируют из feature — это самая простая для исправления и самая злая для архитектуры проблема.

**Места:**
- [components/ad-toggle-section/AdToggleSection.tsx:7](components/ad-toggle-section/AdToggleSection.tsx#L7) — `import CurrencySelect from '@/app/[locale]/wallet/components/CurrencySelect'`
- [components/auto-reply/AutoReplyListModal.tsx:14](components/auto-reply/AutoReplyListModal.tsx#L14) — стили `draft-card.module.scss` из `drafts`
- [components/auto-reply/CreateAutoReplyModal.tsx:26-27](components/auto-reply/CreateAutoReplyModal.tsx#L26) — `useMessageMedia`, `useInlineButtons` из `inbox/chat`
- [components/bot-command/BotCommandListModal.tsx:15](components/bot-command/BotCommandListModal.tsx#L15) — стили из `drafts`
- [components/bot-command/CreateBotCommandModal.tsx:20-29](components/bot-command/CreateBotCommandModal.tsx#L20) — хуки из `inbox/chat`, селекторы из `channels`
- [components/time-picker/useRecentTimes.ts:4](components/time-picker/useRecentTimes.ts#L4) — `apiRequest` из `create-post/store`

**Чинить:** перенести импортируемые сущности в `components/` или в общий `lib/`/`hooks/`. Вариант перенести `apiRequest` в `frontend/lib/api.ts` решает 30+ импортов разом.

**Время:** ~3-4 часа на все случаи.

---

#### P0.2 `apiRequest` живёт в feature-папке
Главный API helper находится в `app/[locale]/create-post/store/thunks/api.ts`. Любая другая feature импортирует его оттуда — это **единственная причина** почему `create-post/store/` нельзя удалить или переименовать.

**Чинить:** перенести в `frontend/lib/api.ts` (новая папка) или в существующий `frontend/store/api.ts` (он уже есть!). Старый `create-post/store/thunks/api.ts` оставить как re-export-shim на 1 релиз для обратной совместимости.

**Время:** 30 мин.

---

#### P0.3 `mediaFileStore` ломает SSR/strict mode
[`create-post/store/mediaFileStore.ts`](app/%5Blocale%5D/create-post/store/mediaFileStore.ts) — глобальная переменная `mediaFileStoreRef`. Хранит `Map<string, File>` вне Redux (правильно — File несериализуемы). Но:
- В Strict Mode React дважды рендерит — `setMediaFileStoreRef` может затереть состояние
- Между переходами между страницами Map сохраняется — если открыть create-post → edit-draft → create-post, медиа из черновика может оказаться в новом посте

**Чинить:** использовать `useRef` + Context. Не менять интерфейс thunks (они так и читают `getMediaFile`), но контекст делает store scoped к provider'у.

**Время:** 2 часа (требует тестирования на уровне страниц).

---

### 🟠 P1 — серьёзная боль, требует нескольких сессий

#### P1.1 9 Redux-сторов, дубли channels/tags/publications/bots
Server-data грузится N раз с N селекторами:
- **`channels`** грузится в `channels`, `inbox`, `bots`, `create-post`, `calendar` — 5 параллельных запросов при переходах
- **`tags`** грузится через Redux thunk + 2 разных useQuery с разными ключами (`['calendar-all-tags']` vs `['drafts-tags']`) — нет shared cache
- **`publications`** — Redux thunk в calendar + Redux thunk в drafts + useQuery в drafts (!)
- **`bots`** — Redux в `bots`, `inbox`, `channels` сторах

**Чинить — постепенно (не big bang):**

Шаг 1: Сделать **глобальный QueryClient** уже стоит, добавить hooks: `useChannelsQuery()`, `useBotsQuery()`, `useTagsQuery()`, `usePublicationsQuery(filters)`. Эти hooks инкапсулируют API call + правильный queryKey.

Шаг 2: По одной фиче — **выпилить Redux-thunk для server-data, заменить на hook**. Локальный UI state (например `selectedChannelIds`) остаётся в Redux.

Шаг 3: После каждой mutation — `queryClient.invalidateQueries(['channels'])`. Это убирает «после публикации календарь не обновился».

**Время:** ~10-15 часов на все 4 сущности. По одной — 2-3 часа.

---

#### P1.2 PostSettings монстр
[components/post-settings/post-settings.tsx](components/post-settings/post-settings.tsx) — 274 строки, **56 props**. [PostSettingsConnected.tsx](app/%5Blocale%5D/create-post/components/PostSettingsConnected.tsx) — **22 отдельных `useSelector`** + 25+ `dispatch` callback.

**Чинить:**
- Декомпозировать на `RepeatSettings`, `AutoDeleteSettings`, `ChannelsSettings`, `AdSettings` — каждый со своим Connected
- Каждый берёт свой кусок state одним мемоизированным селектором
- PostSettings становится оркестратором (40-60 строк)

**Время:** 4-5 часов.

---

#### P1.3 Огромные секции
- [ModerationSection.tsx](app/%5Blocale%5D/channels/components/ModerationSection.tsx) — **1088 строк**
- [JoinSettingsSection.tsx](app/%5Blocale%5D/channels/components/JoinSettingsSection.tsx) — 701
- [CreateAutoReplyModal.tsx](components/auto-reply/CreateAutoReplyModal.tsx) — 690
- [CreateBotCommandModal.tsx](components/bot-command/CreateBotCommandModal.tsx) — 689

**Чинить:** разбить на под-секции. Для модалок — вынести каждую таб/панель в отдельный компонент.

**Время:** ~2 часа на каждый = 8 часов всего.

---

#### P1.4 Селекторы без `useMemo`
**Файлы:**
- [calendar/store/selectors.ts:53,58](app/%5Blocale%5D/calendar/store/selectors.ts#L53) — `Object.entries().map()`
- [inbox/store/selectors.ts:140,170,177](app/%5Blocale%5D/inbox/store/selectors.ts#L140) — `.map().filter()`
- [inbox/store/selectors.ts:114-127](app/%5Blocale%5D/inbox/store/selectors.ts#L114) — фабричные селекторы

**Чинить:** обернуть в `createSelector` (RTK уже стоит).

**Время:** 1-2 часа.

---

### 🟡 P2 — стоит сделать когда дойдут руки

#### P2.1 Два Button компонента
- [components/button/button.tsx](components/button/button.tsx) — старый, маркер `@deprecated`, **49 импортов** (!)
- [components/new-button/index.tsx](components/new-button/index.tsx) — 58 импортов

49 файлов на миграцию. Старый имеет другой API (`text` prop вместо children). Скрипт-мигратор сделать сложно из-за разного API.

**Чинить:** по одному feature за раз — заменить старые `Button` на новые. После миграции удалить `components/button/`.

**Время:** ~6-8 часов (постепенно).

---

#### P2.2 Дубли date-pickers
- `date-picker/` (DatePicker для одной даты)
- `date-picker-modal/` (DatePicker + TimePicker, для расписания публикации)
- `date-range-picker/` (мой свежий, для range)
- `month-date-picker/` (для повтора по месяцам)

Можно объединить в один с режимами (`mode="single" | "range" | "datetime" | "month"`), но это сложно. **Пока не критично** — каждый используется в своём месте.

**Время:** не делать в этом подходе.

---

#### P2.3 150+ сырых `<button>` в коде
Везде разные варианты «icon button» / «text button» с inline стилями. Нужен компонент `IconButton` (24x24 transparent + svg).

**Чинить:** создать `IconButton` в shared, постепенно заменить.

**Время:** ~4 часа.

---

#### P2.4 AsyncThunk-монстры
[publish.ts:39-85](app/%5Blocale%5D/create-post/store/thunks/publish.ts#L39) — 1 API call + 1 wallet API + 8 reset-dispatch + fetch tags.

**Чинить (вариант):**
- Хелпер `resetCreatePostState(dispatch)` — один dispatch, в нём reducer обнуляет всё
- AsyncThunk остаётся тонким: validate → API → reset → fetch

**Время:** 1-2 часа.

---

#### P2.5 Mini-stores в компонентах
- [components/post-preview-modal/store/](components/post-preview-modal/store/)
- [components/rich-text-editor/store/](components/rich-text-editor/store/)

Каждый — отдельный Redux store внутри компонента. Скорее всего эти state можно держать локально (`useState`/`useReducer`) — посмотреть зачем понадобился Redux.

**Время:** на изучение — 1 час, на рефакторинг по результатам — variable.

---

### 🟢 P3 — косметика

#### P3.1 CLAUDE.md в frontend и backend устарела
Описаны паттерны которых нет (DI с `Depends(get_xxx_service)`, `view/` директория). Обновить чтобы соответствовала реальности.

**Время:** 1 час.

#### P3.2 mediaFile в имени файла vs scope
`mediaFileStore.ts` vs `media` slice. Создаёт путаницу — что хранится где.

**Время:** часть P0.3.

---

## Предлагаемый порядок работ (incremental)

### Этап 1 — Чистка фундамента (~5 часов)
Минимально-инвазивный, никаких функциональных изменений.

1. **P0.2** — перенести `apiRequest` в `frontend/store/api.ts` (он уже там), удалить shim из `create-post/store/thunks/api.ts` (или оставить deprecated re-export). 30 мин.
2. **P0.1** — починить cross-boundary imports. По одному. 3-4 часа.
3. **P3.1** — обновить CLAUDE.md (но только после понимания что реально используется). 30 мин.
4. **P1.4** — обернуть проблемные селекторы в `createSelector`. 1-2 часа.

### Этап 2 — TanStack Query для server data (~10 часов, по одному ресурсу)
Самый большой кусок, но он вернёт максимум: убирает дубли фетчей, чинит cache-инвалидацию.

5. **P1.1.1** — `useChannelsQuery()` + миграция всех мест. 3 часа.
6. **P1.1.2** — `useTagsQuery()` + миграция. 2 часа.
7. **P1.1.3** — `useBotsQuery()` + миграция. 2 часа.
8. **P1.1.4** — `usePublicationsQuery()` (calendar + drafts). 3 часа — самый сложный, потому что pagination/фильтры.

### Этап 3 — Декомпозиция монстров (~12 часов)
9. **P1.2** — разбить PostSettings. 4-5 часов.
10. **P1.3** — разбить ModerationSection / JoinSettings / CreateAutoReplyModal / CreateBotCommandModal. По 2 часа = 8 часов.

### Этап 4 — Унификация UI kit (~10-15 часов)
11. **P2.1** — мигрировать старый Button → new-button. 6-8 часов.
12. **P2.3** — IconButton + замена сырых кнопок. 4 часа (постепенно).

### Этап 5 — Прочее
13. **P0.3** — mediaFileStore через Context. 2 часа.
14. **P2.4** — упростить AsyncThunks. 1-2 часа.
15. **P2.5** — изучить mini-stores и решить. variable.

---

## Что НЕ делать в этом рефакторинге

- **Не переписывать Tiptap-редактор.** Он работает, его API — внешний пакет, не наш проблема.
- **Не трогать landing/, admin/, login/, register/.** Там минимальный код, не зависит от feature stores.
- **Не выкидывать Redux совсем.** Он остаётся для local UI state в `create-post` (editor / media / inlineButtons / quiz / settings) — это правильное использование Redux.
- **Не трогать calendar slices полностью** — там сложная кеш-логика (`weekItems`, `dayPageState`), её нужно понимать прежде чем мигрировать.

---

## Метрики успеха

После всех 5 этапов:
- [ ] Server-data (channels/tags/publications/bots) грузится **1 раз** через TanStack Query
- [ ] После любой mutation UI обновляется автоматически (через `invalidateQueries`)
- [ ] `frontend/components/` не имеет ни одного импорта из `frontend/app/[locale]/`
- [ ] Один `Button` компонент. Один `Input`. Один `IconButton`
- [ ] Ни одного компонента с >25 props
- [ ] Ни одного файла >500 строк (за исключением миграций)
- [ ] PostSettingsConnected имеет ≤5 useSelector
- [ ] CLAUDE.md актуальна
