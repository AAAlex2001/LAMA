# app/hooks/

Shared React-хуки. Используются из любой `app/[locale]/<feature>/` или `app/components/`.

| Файл | Что |
|---|---|
| [useInView/](useInView/) | IntersectionObserver обёртка для infinite scroll |
| [useMessageMedia.ts](useMessageMedia.ts) | Local-state управление медиа (фото/видео/документы) в редакторе |
| [useInlineButtons.ts](useInlineButtons.ts) | Конструктор inline-клавиатуры (rows × buttons) для постов и команд |
| [useDebounce.ts](useDebounce.ts) | Debounce-обёртка для значений (search input, autosave) |

## `useInView`

[useInView/](useInView/) — самый используемый хук в проекте. IntersectionObserver через React.

### API

```ts
// useInView.ts
const { ref, inView } = useInView({
  root: HTMLElement | null,  // scroll-контейнер; null = window
  rootMargin: '100px',       // когда сработать (заранее)
  threshold: 0.1,            // % видимости
});

<div ref={ref}>{inView && 'visible!'}</div>
```

```ts
// useOnInView.ts — императивный callback
useOnInView(ref, (entry) => {
  if (entry.isIntersecting) loadMore();
});
```

```ts
// observe.ts — низкоуровневый imperative observer (без React)
const stop = observe(element, callback, options);
stop();
```

### Mobile-aware пример (из calendar)

```ts
const isMobile = useIsMobile();
const scrollRoot = useRef<HTMLElement>(null);

const { ref, inView } = useInView({
  root: isMobile ? null : scrollRoot.current,
  rootMargin: '200px',
});

useEffect(() => {
  if (inView && hasMore) loadMore();
}, [inView, hasMore]);
```

На mobile скролл идёт по document → `root=null`. На desktop — по внутреннему контейнеру → `root=scrollRoot.current`.

### Per-day grid pattern (calendar)

В `WeeklyCalendarView` каждый день имеет свой sentinel:
```tsx
{daysOfWeek.map((day) => (
  <DaySentinel
    key={day.dateKey}
    dateKey={day.dateKey}
    onLoadMore={fetchMoreDayPosts}
    hasMore={dayHasMore[day.dateKey]}
  />
))}
```

`DaySentinel` — отдельный компонент потому что хуки нельзя вызывать в цикле. Каждый sentinel мониторит свой день.

⚠ **Критический баг**: `fetchMoreDayPosts(pageSize=50)` ДОЛЖНО совпадать с `per_day=50` начального `fetchCalendarData`. Mismatch → дубликаты + сломанный `hasMore`. См. [calendar/README.md](../[locale]/calendar/README.md).

## `useMessageMedia`

[useMessageMedia.ts](useMessageMedia.ts) — управление медиа-файлами в локальном React-state (не Redux).

```ts
const {
  mediaFiles,           // MediaFileItem[]
  addFiles,             // (FileList | File[]) → загружает в backend через uploadMediaFile
  removeFile,           // (index)
  reorder,              // (fromIndex, toIndex)
  setBlur,              // (index, isBlurred)
  isUploading,
  uploadProgress,       // { [filename]: percent }
} = useMessageMedia();
```

Используется в:
- [create-post/components/post-editor/](../[locale]/create-post/components/post-editor/) — основной редактор
- [components/media-preview/](../components/media-preview/) — превью с reorder

Почему local-state, а не Redux: медиа = transient state одной сессии редактирования. После публикации можно сбросить. Меньше boilerplate.

## `useInlineButtons`

[useInlineButtons.ts](useInlineButtons.ts) — конструктор inline-клавиатуры Telegram.

```ts
const {
  rows,                 // ButtonRow[]
  addRow,               // ()
  addButton,            // (rowIndex)
  updateButton,         // (rowIndex, buttonIndex, partial)
  removeButton,         // (rowIndex, buttonIndex)
  reorderButtons,       // (fromRow, fromIdx, toRow, toIdx)
  isEmpty,
} = useInlineButtons();
```

Типы кнопок: `url` / `callback` / `hidden_text` (раскрывается в payload). Используется в:
- create-post (`inline-buttons` slice + этот hook)
- inbox bot-command конструктор

## `useDebounce`

```ts
const debouncedSearch = useDebounce(searchQuery, 300);

useEffect(() => {
  if (debouncedSearch) fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

Простой `setTimeout`-based debounce. Используется в search-bar, autosave.

## Конвенции

- **Naming**: `useFoo.ts` (camelCase, hook-префикс)
- **Папка для составных**: `useFoo/` с `index.ts` + sub-helpers (как `useInView/`)
- **Возврат**: typed object с понятными именами, **не tuple** (`[a, b]`)
- **Никаких side-effects в render** — всё через `useEffect`/`useCallback`/`useMemo`
