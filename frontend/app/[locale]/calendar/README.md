# calendar

Главный экран приложения: показывает публикации (черновики, запланированные, опубликованные посты, bot-сообщения, рекламу) в четырёх режимах — `day`, `week`, `month`, `list`. UI-state живёт в локальном Redux-store, server-data — в TanStack Query (`@/store/calendar`). Общие правила фичи уже описаны в [frontend/CLAUDE.md](../../../CLAUDE.md), здесь только то, что специфично для каталога.

## Точки входа

| Файл | Что |
|---|---|
| [page.tsx](page.tsx) | Next.js route. Оборачивает в `AppLayout` + `CalendarProvider`, динамически (`ssr: false`) грузит `CalendarPageConnected`. |
| [shared/CalendarPageConnected.tsx](shared/CalendarPageConnected.tsx) | Корневой клиентский компонент. Подключает `useCalendarPageData` + `useCalendarPostActions`, считает фильтры (`buildFilterConfigs` + `applyPostFilters`), рендерит `CalendarHeader`, `CalendarMainContent`, мобильный popup, все модалки. |
| [shared/CalendarHeader.tsx](shared/CalendarHeader.tsx) | Заголовок: переключение view, навигация по датам, диапазон в list-view, десктоп/мобильные фильтры. |
| [shared/CalendarMainContent.tsx](shared/CalendarMainContent.tsx) | Свитчер view: `DayCalendarView` / `WeeklyCalendarView` / `MonthCalendarView` (или `MonthGridView`) / `ListCalendarView` + соответствующий sidebar. |
| [hooks/useCalendarPageData.ts](hooks/useCalendarPageData.ts) | Все данные страницы: TQ-запрос + derive `weekItems` / `dayHasMoreMap` / `dayPageMap`, sorted/sidebar/mobile-posts, day-counts по месяцу. |
| [hooks/useCalendarPostActions.ts](hooks/useCalendarPostActions.ts) | Open/preview/edit/share/delete пост (включая series + repeat-mode). |

## Поток данных

```
Redux (calendar slice)                TanStack Query
  selectedDate                          useCalendarDataQuery
  sidebarDate                            ├─ view=month  → fetchMonth (1 день, per_day=50)
  currentView                            ├─ view=week   → fetchWeek  (7 дней, per_day=50)
  listRangeStart/End  ──── queryKey ──── └─ view=list|day → fetchList (page_size=30)
  listSortOrder                                ↓
  listStatusFilter                    CalendarData: 'grid' { results[] } | 'list' { items, hasMore, total }
  countsMonthAnchor                            ↓
                                       useCalendarPageData → derive
                                             ↓
                                  CalendarPageConnected → view-компоненты

useFetchMoreDayPostsMutation  → setQueryData → дописывает items в нужный GridDayResult
useFetchMoreListPostsMutation → setQueryData → дописывает items в CalendarListData
useDayCountsQuery (@/store/publications) → gridPostCounts / gridAdsCounts / monthStatusCounts
```

Подробнее про сам `useCalendarDataQuery` и форматы — в [frontend/CLAUDE.md](../../../CLAUDE.md).

## Структура каталога

| Папка | Что |
|---|---|
| [page.tsx](page.tsx) | Entry route. |
| [shared/](shared/) | Корневые компоненты страницы (`CalendarPageConnected`, `CalendarHeader`, `CalendarMainContent`, `CalendarPostModal`, `CalendarMobilePopup`, `CalendarCard`) + модалки удаления / share. |
| [shared/modals/](shared/modals/) | `DeletePostModal`, `DeleteRepeatModal`, `SharePostModal`. |
| [views/day/](views/day/) | `DayCalendarView` (список постов одного дня) + `CalendarSidebar`. |
| [views/week/](views/week/) | `WeeklyCalendarView` (7 колонок-дней) + `WeeklyCard` + `WeeklySidebar`. |
| [views/month/](views/month/) | `MonthCalendarView` + `MonthGridView` (сетка месяца) + `MonthlySidebar`. |
| [views/list/](views/list/) | `ListCalendarView`, `CalendarList`, `ListFilterBar`. |
| [store/slices/calendar.ts](store/slices/calendar.ts) | Redux slice (UI-state — `selectedDate`, `sidebarDate`, `currentView`, диапазон/sort/status в list, `countsMonthAnchor`). |
| [store/selectors.ts](store/selectors.ts) | Reselect-селекторы: `selectSelectedDateObj`, `selectSidebarDateObj`, `selectIsGridView` и т.д. (возвращают Date-объекты из ISO-строк). |
| [store/thunks/navigation.ts](store/thunks/navigation.ts) | `navigateStep('prev'/'next')` — шаг по дням/неделям/месяцам/годам в зависимости от view; `sidebarDateChange` — клик по дате в sidebar / grid с переключением `selectedDate`, если пересекли границу недели/месяца. |
| [store/index.ts](store/index.ts) / [store/provider.tsx](store/provider.tsx) | Локальный `configureStore` + `<Provider>` (отдельный store, НЕ root). |
| [hooks/](hooks/) | `useCalendarPageData` (server+derived data), `useCalendarPostActions` (modals/CRUD). |
| [utils/calendar-helpers.ts](utils/calendar-helpers.ts) | Барель: реэкспорт `constants`, `date-helpers`, `range-helpers`, `post-helpers`, `media-helpers`, `collection-helpers`, `buildFilterConfigs`, `applyPostFilters`, `previewData`. |
| [utils/date-helpers.ts](utils/date-helpers.ts) / [utils/range-helpers.ts](utils/range-helpers.ts) | `parseDate`, `formatDateOnly`, `getWeekStart`, `getRangeForView`, `getVisibleDayKeys`, `isSameDay`, `isBeforeToday`, форматтеры заголовков. |
| [utils/post-helpers.ts](utils/post-helpers.ts) | `sortPostsByTime`, `getSourceDate`, `getPreviewText/Html`, `getStatusLabel`, `hasRepeat`, `getThumbnail`, `formatCompact`. |
| [utils/media-helpers.ts](utils/media-helpers.ts) | `getMediaFilterTypes`, `MEDIA_TYPE_LABELS`. |
| [utils/collection-helpers.ts](utils/collection-helpers.ts) | `mergeUniqueById` (использует load-more). |
| [utils/buildFilterConfigs.ts](utils/buildFilterConfigs.ts) | Собирает `FilterConfig[]` из постов + опционально date-sort / status / stats для list. |
| [utils/filterPosts.ts](utils/filterPosts.ts) | `applyPostFilters` (channel / tag / media / views / reactions / status). |
| [utils/previewData.ts](utils/previewData.ts) | Маппинг `Draft → PostPreviewModal props`. |
| [calendar.module.scss](calendar.module.scss) | Page-уровень: `page`, `pageWeek/Month/List`, `container`, `mainContent*`, `bottomGradient`. |

## Особые места

### Четыре view, две формы данных

`useCalendarDataQuery` возвращает либо `{type: 'grid', results: GridDayResult[]}` (для `week`/`month`), либо `{type: 'list', items, hasMore, total}` (для `day`/`list`). `deriveFromQueryData` в `useCalendarPageData` нормализует это в плоские `items` + `weekItems[dateKey]` + `dayHasMoreMap` + `dayPageMap`. View получают данные уже в готовом виде.

### Per-day infinite scroll через `useInView`

В `WeeklyCalendarView` и `MonthCalendarView` infinite-scroll работает **отдельно для каждого дня** — иначе невозможно соблюсти rules-of-hooks в цикле. Подход:

- Вынесен компонент `DayColumn` (week) / эквивалент (month), `useInView` вызывается внутри него — один observer на день.
- `root` равен скролл-контейнеру колонки (`scrollRootEl`) на десктопе и `null` (viewport) на мобиле — переключение по `matchMedia('(max-width: 1439px)')`.
- `rootMargin: '0px 0px 400px 0px'` — подгружаем заранее.
- `skip: !dayHasMore || dayLoading || (!isMobile && !scrollRootEl)` — observer не висит вхолостую.
- Колбек `onReachEnd(dateKey)` дергает `fetchMoreDay.mutate({queryKey, dateKey, currentItems, currentPage})`. Хук берёт `loadingRef` / `hasMoreRef` через ref, чтобы не пересоздавать observer.

Сам хук — общий: [frontend/app/hooks/useInView/useInView.ts](../../hooks/useInView/useInView.ts).

### Критический баг: `pageSize` должен совпадать с `per_day`

`fetchWeek` / `fetchMonth` тянут начальную страницу через `/publications/week-batch/?per_day=50`, а `useFetchMoreDayPostsMutation` дозагружает через `/publications/?page_size=50`. **`PER_DAY = 50` в [queries.ts](../../store/calendar/queries.ts) — единая константа, и она же определяет `gotFullPage = res.items.length >= PER_DAY`.** Если рассинхронить (page_size < per_day), `hasMore` мгновенно становится `false` после первой load-more страницы и infinite-scroll ломается без видимой ошибки.

### `formatCompact` возвращает `"0"`, не `"—"`

`formatCompact(undefined)` → `"0"`, `formatCompact(1234)` → `"1.2K"`. Это нужно, чтобы у новых каналов в `CalendarCard`/`WeeklyCard` метрики отображались как `0 / 0 / 0`, а не пустые прочерки.

### Фильтры: два builder, два applier

- **Desktop**: `desktopFilterConfigs` без `withDateSort/Status/Stats` (эти опции — только для `list`). Источник постов: `sortedPosts` для day, `Object.values(weekItems).flat()` для week/month, `[]` для list (в list свой `ListFilterBar`).
- **Mobile**: `mobileFilterConfigs` всегда содержит date/status/stats — мобилка использует общий popup для любого view.
- `applyPostFilters(posts, mobileActiveFilters)` применяется к `sortedPosts` и каждому дню в `weekItems`. В `list` фильтры не применяются на клиенте — sort/status уходят в query string (`useCalendarDataQuery`).

### Повторяющиеся публикации и series

- Иконка повторов — `CalendarRepeatIcon` (НЕ `ArrowsSpinIcon`). Используется в `CalendarCard`, `WeeklyCard`, `ListCalendarView`, `MonthCalendarView` при `hasRepeat(post)`.
- Series-группировка происходит на стороне query (`groupSeriesPosts` из `@/store/publications/groupSeries`) — view получают уже свёрнутые `series_count`.
- Удаление: `useCalendarPostActions` различает обычный пост, series (`useDeleteSeriesMutation`) и repeat-публикацию с режимом `this` / `this_and_following` (`useDeleteRepeatPublicationMutation`). Под repeat показывается отдельный модал `DeleteRepeatModal`.

### Отдельный Redux store

`CalendarProvider` создаёт **локальный** `configureStore({reducer:{calendar}})` — он не подключён к глобальному store приложения. Поэтому `useAppSelector` / `useAppDispatch` экспортируются из `./store`, а не из глобального `@/store`. Если нужно читать/писать состояние календаря снаружи — через TQ-инвалидацию или URL, не через Redux.

### `setSelectedDate` всегда синхронизирует `sidebarDate` и `countsMonthAnchor`

Reducer пишет три поля одновременно: `selectedDate`, `sidebarDate`, `countsMonthAnchor`. Для частичного апдейта (например, sidebar внутри той же недели) есть отдельный `setSidebarDate` — он не двигает выбранную дату. Эту разницу использует `sidebarDateChange` thunk.

### `month` тянет один день

`fetchMonth` запрашивает `week-batch` только за `params.sidebarDate` (один день). Сетка месяца рендерится из `gridPostCounts` (через `useDayCountsQuery`), а пост-айтемы нужны только для текущего выбранного дня + его sidebar.

## Что НЕ покрыто

- Нет unit-тестов для `buildFilterConfigs` / `filterPosts` / `calendar-helpers` (date-math + range), хотя логика нетривиальная.
- `previewData.ts` маппит `Draft` в props модалки в одном месте — если поле `Draft` переименуют, найдут только TS-ошибкой.
- `CalendarPageConnected` принимает на себя оркестрацию (251 строка) — если будет ещё одна view или ещё один тип модалки, файл стоит разбивать.
- `calendar.module.scss` — 461 строка, single file для всей страницы; миксы page/week/month/list классов через шаблонные строки в JSX (см. `pageClass` в `CalendarPageConnected`).
