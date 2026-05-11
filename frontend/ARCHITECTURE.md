# Frontend Architecture (Target State)

Это **целевая** архитектура — куда движемся постепенно. Текущее состояние и план миграции — в [`AUDIT.md`](AUDIT.md).

Если ты разработчик и хочешь разобраться **как тут устроено**:
1. Прочитай раздел «Главные правила» (5 минут)
2. Посмотри «Структура папок» — где что искать
3. Открой «Шаблоны» когда будешь писать новый код

---

## Главные правила

### 1. Линейный, читаемый код

Любой разработчик должен **понять файл за 30 секунд**.

- **Один файл = одна ответственность.** Если файл больше 300 строк — он делает слишком много.
- **Сначала самое важное.** В компоненте: импорты → типы → главная функция (она же export default) → вспомогательные. Если читатель видит только верхушку — он должен понять зачем компонент.
- **Никаких фабрик-фабрик-фабрик.** Если `getThing()` возвращает функцию которая возвращает компонент — это плохо. Прямой код побеждает.
- **Никаких "магических" хуков**, которые тащат данные из 5 мест и возвращают объект на 30 полей. Лучше 5 простых hooks.
- **Не оптимизируй преждевременно.** `useMemo` / `useCallback` нужны там где есть **измеренная** проблема, иначе они только мешают читать.

### 2. Жёсткие зависимости (правила импортов)

```
app/[locale]/<feature>/  ───┐
                            ├──→  components/  ──→  store/  ──→  lib/
hooks/  ────────────────────┘
```

Стрелка `A → B` означает «A может импортировать из B». **В обратную сторону — нельзя**. Конкретно:

- `lib/` — низкоуровневые утилиты (api, format, validation). **Ни от кого не зависит.**
- `store/` — глобальные shared API hooks (TanStack Query) + два глобальных Redux slice. Зависит только от `lib/`.
- `components/` — переиспользуемые UI-компоненты. Зависит от `store/` и `lib/`. **НЕ зависит от `app/[locale]/<feature>/`.**
- `hooks/` — переиспользуемые reusable hooks. То же что components.
- `app/[locale]/<feature>/` — feature-код. Может импортировать всё. **НЕ импортирует из других features.**

### 3. Данные

- **Server data → TanStack Query.** Каналы, боты, публикации, теги, ad-revenues — всё что приходит с бэка. Hooks типа `useChannelsQuery()`.
- **Local UI state → useState / Redux.** Открыта ли модалка, выбранные элементы в форме, текст редактора, инлайн-кнопки — это локальное.
- **Не смешивать.** Server data **не дублируется** в Redux. Если страница хочет «выбранные каналы» — она хранит `Set<channelId>` локально, а сами channels берёт из `useChannelsQuery`.

### 4. Размеры

- Компонент: **до 300 строк**.
- Функция: **до 50 строк**. Если больше — почти всегда можно разбить.
- Props у компонента: **до 15**. Больше — оборачивай в группы или дроби компонент.
- `useSelector` в одном файле: **до 5**. Больше — мемоизируй один большой селектор.

---

## Структура папок (целевая)

```
frontend/
├── app/                          # Next.js App Router
│   ├── [locale]/
│   │   ├── (authed)/             # роуты только для залогиненных
│   │   ├── login/, register/, landing/
│   │   ├── <feature>/            # calendar/, inbox/, channels/, bots/,
│   │   │   │                     # create-post/, edit-post/, edit-draft/, drafts/,
│   │   │   │                     # wallet/, knowledge-base/
│   │   │   ├── page.tsx          # thin: импортирует View
│   │   │   ├── components/       # feature-only компоненты
│   │   │   ├── views/            # FeatureView.tsx (главный orchestrator)
│   │   │   ├── hooks/            # feature-only хуки
│   │   │   ├── store/            # feature Redux store (если есть)
│   │   │   │   ├── slices/
│   │   │   │   ├── selectors.ts
│   │   │   │   ├── provider.tsx
│   │   │   │   ├── hooks.ts      # typed useAppDispatch/useAppSelector
│   │   │   │   └── index.ts      # реэкспорт
│   │   │   └── utils/            # чистые утилиты этой feature
│   │   ├── layout.tsx            # AppLayout, QueryProvider, NotificationProvider
│   │   └── page.tsx
│   ├── globals.css
│   └── favicon.ico
│
├── components/                   # SHARED UI компоненты
│   ├── button/                   # Button, IconButton, ToggleButton
│   ├── input/                    # Input, Textarea, Select, ...
│   ├── modal/                    # ModalBase, ConfirmModal
│   ├── date-picker/, date-range-picker/
│   ├── currency-select/
│   ├── filter-tabs/, dropdown/, ...
│   ├── notifications/            # toast NotificationProvider + useNotifications
│   ├── icons/                    # все SVG как React компоненты
│   ├── ad-toggle-section/        # business-ish reusable: AdToggleSection
│   ├── card-action-button/       # shared SCSS для action кнопок в карточках
│   └── post-settings/            # shared post settings (используется в create/edit)
│
├── hooks/                        # SHARED reusable хуки
│   ├── useInView.ts              # IntersectionObserver
│   ├── useDebounce.ts
│   ├── useOnClickOutside.ts
│   └── useMediaUpload.ts         # переехавший useMessageMedia
│
├── store/                        # SHARED глобальный store
│   ├── api.ts                    # apiRequest<T>, getAuthToken, API_BASE_URL
│   ├── query-client.ts           # инициализация QueryClient (новое)
│   ├── channels/                 # channels: queries.ts (TQ) + slice.ts (UI selection only)
│   ├── bots/                     # bots: queries.ts (TQ)
│   ├── tags/                     # tags: queries.ts (TQ)
│   ├── publications/             # publications: queries.ts (TQ) + filters helpers
│   └── auth/                     # auth: queries + login/logout
│
├── lib/                          # NEW — низкоуровневые утилиты (нет реакта)
│   ├── format/                   # formatDate, formatCompact, formatCurrency
│   ├── validation/
│   ├── url.ts
│   └── constants.ts
│
├── types/                        # глобальные TypeScript типы (от бэка/Telegram)
│   ├── api/                      # bot, channel, publication, ad-revenue
│   └── ui.ts
│
├── styles/                       # глобальные стили (если будут — не feature)
├── public/
├── middleware.ts
├── ARCHITECTURE.md               # ← этот файл
├── AUDIT.md                      # план миграции к target state
├── CLAUDE.md                     # AI-ориентир, отражает реальное состояние
└── package.json
```

---

## Где живёт что

### `lib/` — чистые функции
Без React, без Redux, без браузерных API (если строго). Можно тестировать чистым jest.

```typescript
// lib/format/formatDate.ts
export function formatDateRu(iso: string): string { ... }

// lib/validation/email.ts
export function isValidEmail(s: string): boolean { ... }
```

### `store/api.ts` — единственная точка вызова бэка
```typescript
// Только тут. Больше нигде fetch() не пишется.
export async function apiRequest<T>(endpoint: string, opts?): Promise<T> { ... }
export function getAuthToken(): string | null { ... }
export const API_BASE_URL = ...;
```

### `store/<resource>/queries.ts` — server data через TanStack Query
**Шаблон одного ресурса:**
```typescript
// store/channels/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';
import type { ChannelBasic, ChannelsResponse } from '@/types/api/channel';

const KEY = ['channels'] as const;

export function useChannelsQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiRequest<ChannelsResponse>('/channels?...'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/channels/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

### `store/<resource>/slice.ts` (опционально) — UI state
Только если для ресурса нужен **локальный UI state** (например выбор каналов в форме). **Не дублирует server data.**

```typescript
// store/channels/selection-slice.ts
interface State { selectedIds: number[]; }
// reducers: select(id), deselect(id), reset()
```

В компоненте:
```typescript
const { data: channels = [] } = useChannelsQuery();          // server data
const selectedIds = useAppSelector(s => s.selection.selectedIds); // UI state
const isSelected = (id: number) => selectedIds.includes(id);
```

### `components/` — UI компоненты, prop-driven
**Получают всё через props.** Не лезут в Redux, не лезут в QueryClient. Знают только то что им передали.

```typescript
// components/channel-card/ChannelCard.tsx
interface Props {
  channel: ChannelBasic;
  selected: boolean;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}
export default function ChannelCard({ channel, selected, onToggle, onDelete }: Props) {
  return ( ... );
}
```

**Исключение:** `components/notifications/` — единственный shared компонент которому разрешено иметь Provider+Context (toast). Это инфраструктура.

### `app/[locale]/<feature>/` — feature код
Здесь живёт **бизнес-логика конкретной страницы**. Делится на:

- **`page.tsx`** — тонкий entry point, только импортирует View:
```typescript
'use client';
import { ChannelsView } from './views/ChannelsView';
export default function Page() { return <ChannelsView />; }
```

- **`views/<Feature>View.tsx`** — главный orchestrator. Здесь подключается store, дёргаются hooks, склеиваются компоненты:
```typescript
export function ChannelsView() {
  const { data, isLoading } = useChannelsQuery();
  const deleteMutation = useDeleteChannelMutation();
  const [tab, setTab] = useState<'all' | 'channels' | 'groups'>('all');
  // ...
  return <Layout>...<ChannelCard ... /></Layout>;
}
```

- **`components/`** — feature-only компоненты. Если компонент нужен в **двух фичах** — переезжает в `components/` (shared).

- **`store/`** — Redux store этой feature. Только для **UI state** (что открыто, что выбрано, текст в редакторе). Server data там жить **не должен**.

- **`hooks/`** — feature-only хуки. Если хук нужен в **двух фичах** — переезжает в `hooks/` (shared).

---

## Data Flow — детально

### Server data (channels, bots, publications, tags, ad-revenues)
```
[Backend API]
     ↓
[apiRequest in store/api.ts]
     ↓
[useXxxQuery in store/<resource>/queries.ts]   ←── глобальный кэш TanStack Query
     ↓
[Component вызывает useXxxQuery() ]
```

После mutation:
```
useXxxMutation().mutate() → API call → onSuccess → invalidateQueries(['xxx'])
                                                         ↓
                                       все компоненты с useXxxQuery перерисовываются
```

### UI state (что выбрано, что открыто, форма)
```
[Component вызывает action]
     ↓
[Redux slice (feature-store или shared selection-store)]
     ↓
[useAppSelector в компоненте]
```

### Side effects (auth, websocket, toast)
- **Auth токен** — `localStorage` через `getAuthToken()` в `store/api.ts`.
- **WebSocket** — отдельный `store/ws.ts` (ещё не реализовано полностью).
- **Toast** — `useNotifications()` из `components/notifications/`.

---

## Конкретные правила и примеры

### Импорты — alias `@/...`
```typescript
import { Button } from '@/components/button';
import { useChannelsQuery } from '@/store/channels';
import { formatDateRu } from '@/lib/format';
import type { ChannelBasic } from '@/types/api/channel';
```

**Не использовать относительные пути за пределы 1 уровня вверх:**
```typescript
// Плохо
import { foo } from '../../../store/foo';
// Хорошо
import { foo } from '@/store/foo';
```

### Connected vs Presentational
- **Presentational** в `components/` — prop-driven, без Redux, без queries.
- **Connected** в `app/[locale]/<feature>/components/` — может тащить из Redux/queries и передавать в Presentational.

```typescript
// components/post-card/PostCard.tsx (presentational)
export function PostCard({ post, onEdit, onDelete }) { ... }

// app/[locale]/calendar/components/PostCardConnected.tsx (connected)
export function PostCardConnected({ id }: { id: number }) {
  const { data } = usePostQuery(id);
  const deleteMutation = useDeletePostMutation();
  if (!data) return null;
  return <PostCard post={data} onEdit={...} onDelete={() => deleteMutation.mutate(id)} />;
}
```

### Когда заводить feature-store
- **Заводи** если есть >2 связанных кусков UI state (форма с многими полями + аккордеон + табы + DnD).
- **Не заводи** если хватает 1-3 useState в одном компоненте.
- Плохой пример — отдельный store для модалки которая держит 2 поля. Хватит useState.

### Когда что в shared
- Компонент используется в **>=2 фичах** → переезжает в `components/`.
- Хук используется в **>=2 фичах** → `hooks/`.
- Чистая функция — сразу в `lib/`, не дожидаясь дублирования.
- Server data — **сразу** в `store/<resource>/queries.ts`, потому что её обычно дёргают из >=2 мест.

---

## Шаблоны

### Шаблон новой страницы (feature)
```
app/[locale]/my-feature/
├── page.tsx                # 1-3 строки, импортирует View
├── views/
│   └── MyFeatureView.tsx   # главный
├── components/             # feature-only
└── hooks/                  # feature-only
```

`page.tsx`:
```tsx
'use client';
import { MyFeatureView } from './views/MyFeatureView';
import { AppLayout } from '@/components/app-layout';

export default function Page() {
  return (
    <AppLayout pageTitle="Моя фича">
      <MyFeatureView />
    </AppLayout>
  );
}
```

### Шаблон нового ресурса (server data)
1. Тип в `types/api/<resource>.ts`
2. Hooks в `store/<resource>/queries.ts`
3. Реэкспорт через `store/<resource>/index.ts`
4. Использовать в компонентах как `useXxxQuery()`

### Шаблон новой модалки
- Файл: `MyModal.tsx`
- Принимает `isOpen`, `onClose`, бизнес-пропсы
- Использует `<ModalBase>` из `@/components/modal-base`
- НЕ держит свой Redux store. Если форма большая — `useState` или `useReducer` локально.

---

## Правила миграции (мы сейчас тут)

Идём поэтапно. Не ломаем рабочее. Сейчас в `AUDIT.md` 5 этапов:
1. ✅ **Этап 1** Чистка фундамента (apiRequest в shared, селекторы, CLAUDE.md, частично cross-boundary)
2. 🟡 **Этап 2** TanStack Query для server data (channels мигрирован, дальше tags/bots/publications)
3. **Этап 3** Декомпозиция монстров (PostSettings, ModerationSection)
4. **Этап 4** Унификация UI kit (один Button, IconButton)
5. **Этап 5** Прочее (mediaFileStore через Context, упрощение thunks)

После каждого этапа запускаем `tsc --noEmit` и smoke-тестим в браузере. Если что-то падает — откат, разбор, попытка №2.

---

## Известные нарушения текущей архитектуры (TODO)

Эти нарушения **уже есть** в коде. Будут исправлены в ходе миграции (см. AUDIT.md):

| Нарушение | Почему плохо | План |
|-----------|--------------|------|
| `selected` в массиве `ChannelBasic[]` (server data) | Server и UI state смешаны | Этап 2 (channels selection в отдельный slice) |
| `components/auto-reply/CreateAutoReplyModal.tsx` импортирует хуки из `inbox/` | Cross-boundary | Этап 1+ (вынести `useMessageMedia`/`useInlineButtons` в shared `hooks/`) |
| `components/bot-command/CreateBotCommandModal.tsx` импортирует Redux store из `channels/` | Cross-boundary, тяжёлая связь | Этап 3 (рефактор пропсов модалки) |
| `edit-post` и `edit-draft` импортируют Redux store из `create-post/` | Архитектурная зависимость | Этап 3 (вынести общую логику в `components/post-editor/` или `hooks/usePostEditor`) |
| `mediaFileStore.ts` — глобальная переменная вне React | Поломка в Strict Mode, утечки между страницами | Этап 5 (через Context + ref) |
| `ModerationSection.tsx` 1088 строк | Невозможно понять | Этап 3 (разбить на под-секции) |
| `PostSettings` 56 props | Невозможно использовать | Этап 3 (разбить на `RepeatSettings`, `AutoDeleteSettings`, `AdSettings` и пр.) |

---

## Тон и стиль кода (для людей, не только для AI)

- **Русские названия в UI и комментариях для пользователей.** Идентификаторы — английский.
- **Без эмодзи в коде**, в README — можно умеренно.
- **Никаких `// TODO: refactor this later`** без issue-номера. Лучше создать задачу.
- **Никаких глобальных переменных** на уровне модуля, кроме констант.
- **`as any` запрещён** кроме edge cases с явным комментарием почему.
- **Консольный лог в проде** — только `console.warn` / `console.error` для важных событий. Никаких `console.log("here", x)`.

---

## Кому что читать в первый день

- **Backend dev пришёл во фронт** → начать с этого файла, секция «Главные правила» + «Где живёт что» + «Шаблон новой страницы».
- **React dev пришёл в проект** → этот файл целиком + один реальный feature как пример (`app/[locale]/wallet/` — он самый свежий и компактный).
- **Senior пришёл** → AUDIT.md (план рефакторинга и принятые решения).

Если что-то непонятно — это **баг этого документа**, открывай issue.
