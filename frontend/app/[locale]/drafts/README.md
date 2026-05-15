# Drafts

Страница списка черновиков публикаций пользователя. Поддерживает сортировку по дате/источнику, фильтр по тегам, превью, редактирование, удаление и шаринг черновика по одноразовой токенизированной ссылке.

## Overview

- Стек: Next.js (App Router), TypeScript, TanStack Query (загрузка/мутации), локальный React-state (UI: dropdowns, modals), SCSS Modules.
- Глобального Redux-slice у фичи нет — UI-state (сортировка, фильтры, выбранный черновик для модалок) живёт внутри хуков `useDraftsPage` / `useDraftsFilters`.
- Список грузится через инфинит-скролл (`usePublicationsListQuery` с `status: 'draft'`) и группируется по сериям через `groupSeriesPosts`.

## Точки входа

- [`page.tsx`](./page.tsx) — серверная обёртка `DraftsPage`. Оборачивает экран в `AppLayout` (заголовок «Черновики») и рендерит клиентский [`DraftsPageView`](./components/DraftsPageView.tsx).
- [`components/DraftsPageView.tsx`](./components/DraftsPageView.tsx) — корневой клиентский компонент: собирает header, список, диалоги (delete + preview) и три share-модалки.
- [`components/SeriesDraftsPageView.tsx`](./components/SeriesDraftsPageView.tsx) — отдельный экран для просмотра одной серии черновиков (используется на маршруте `/drafts/series/[seriesId]`); грузит серию своим `useQuery` и рендерит аккордеон постов.

## Поток данных

### Список

- [`useDraftsPage`](./hooks/useDraftsPage.ts) вызывает `usePublicationsListQuery({ status: 'draft', tagIds, sortOrder, dateMode: 'updated' })` из `@/store/publications/queries`.
- Результат флэтится из `pages` инфинит-запроса и проходит через `groupSeriesPosts` — серии превращаются в один «общий» элемент списка.
- Фильтр по тегам применяется на клиенте поверх уже загруженных страниц.
- Инфинит-скролл реализован вручную: `useEffect` вешает `scroll`-listener на ближайший `<main>` и `window`, при подходе к низу (≤120px) вызывает `fetchNextPage()`. Sentinel-элемент не используется (в отличие от Calendar с `useInView`).

### Действия над черновиком

`DraftsList` принимает четыре колбэка от `DraftsPageView`, которые приходят из `useDraftsPage`:

- **Preview**: `setPreviewDraft(draft)` → `DraftsDialogs` рендерит `PostPreviewModal` с payload от `buildDraftPreviewPayload(draft)`.
- **Edit**: `handleEdit(draft)` → жёсткий редирект `window.location.href = 'edit-draft?draft=<id>'`.
- **Delete**: `setDeleteConfirmDraft(draft)` открывает confirm-модалку, `confirmDelete()` вызывает `DELETE /publications/{id}` (или `/publications/series/{seriesId}` если есть `series_id`). После успеха — `invalidatePublications(queryClient)`.
- **Share**: `setShareDraft(draft)` открывает [`ShareDraftLinkModal`](./components/share-modals/ShareDraftLinkModal.tsx).

## Sharing flow

Поток состоит из двух сторон — отправителя и получателя.

### На стороне отправителя

1. Юзер жмёт «Поделиться» на карточке черновика → открывается [`ShareDraftLinkModal`](./components/share-modals/ShareDraftLinkModal.tsx).
2. Хук [`useShareDraftLink`](./hooks/useShareDraftLink.ts) внутри модалки на маунте вызывает `useShareDraftLinkMutation` → `POST /publications/{id}/share` и получает `share_token`.
3. Из токена собирается публичная ссылка вида `${window.location.origin}/drafts?token=<share_token>`. Юзеру предлагается её скопировать или открыть `https://t.me/share/url?url=...`.
4. Ссылка действительна 7 дней и одноразовая (см. текст в модалке).

### На стороне получателя

1. [`useSharedDraftFromUrl`](./hooks/useSharedDraftFromUrl.ts) на маунте `DraftsPageView` читает `?token=` из `useSearchParams`, сохраняет его в state и чистит query через `router.replace` (чтобы ссылку не нажали повторно из истории).
2. Под этот токен вызывается `useSharedDraftQuery(token)` → `GET /publications/shared/{token}`. Если бэкенд вернул ошибку (истёк / уже использован), `query.isError` поднимает флаг `isExpired`.
3. Успех → открывается [`SharedDraftReceivedModal`](./components/share-modals/SharedDraftReceivedModal.tsx) с тремя действиями:
   - **Preview** — открывает обычный `PostPreviewModal` с данными полученного черновика (через временный флаг `previewingFromShared` в `DraftsPageView`, чтобы по закрытию вернуться к shared-модалке).
   - **Save** — `useSaveSharedDraftMutation` → `POST /publications/shared/{token}/consume`, после успеха редирект на `/drafts`. Требует авторизованного пользователя (`lamaplanner_access_token` в `localStorage`).
   - **Publish** — редирект на `/edit-draft?token=<token>&skipSharedModal=1`; consume и pre-fill формы происходят уже на странице создания/редактирования поста.
4. Ошибка/истёк → рендерится [`ExpiredLinkModal`](./components/share-modals/ExpiredLinkModal.tsx) с предложениями вернуться к списку или создать пост с нуля.

## Структура каталога

```
drafts/
├── page.tsx                                  # AppLayout + DraftsPageView
├── drafts.module.scss                        # стили общего экрана + share-модалок
├── components/
│   ├── DraftsPageView.tsx                    # корневой клиент-компонент
│   ├── DraftsList.tsx                        # карточки + empty state + inline loader
│   ├── DraftsDialogs.tsx                     # delete confirm + PostPreviewModal
│   ├── DraftsHeaderDisabled.tsx              # «замороженный» header (заглушка/SSR)
│   ├── SeriesDraftsPageView.tsx              # экран одной серии (аккордеон)
│   ├── series-drafts.module.scss
│   ├── drafts-header/
│   │   ├── DraftsHeader.tsx                  # sortBar (date / tags / source) + кнопка create
│   │   ├── SortDropdown.tsx                  # обёртка-дропдаун
│   │   ├── SortRadioOptions.tsx              # радио-опции (date / source)
│   │   ├── TagsCheckboxOptions.tsx           # чекбоксы тегов
│   │   ├── MobileFilters.tsx                 # мобильный drawer
│   │   ├── types.ts                          # SortKey = 'date' | 'tags' | 'source' | null
│   │   └── index.ts
│   └── share-modals/
│       ├── ShareDraftLinkModal.tsx           # генерация и копирование ссылки
│       ├── SharedDraftReceivedModal.tsx      # preview / save / publish
│       └── ExpiredLinkModal.tsx              # истёкшая ссылка
└── hooks/
    ├── useDraftsPage.ts                      # данные + действия (edit/delete/share/preview)
    ├── useDraftsFilters.ts                   # UI-state сортировки и фильтров + helpers
    ├── useSharedDraftFromUrl.ts              # token из URL → useSharedDraftQuery
    └── useShareDraftLink.ts                  # генерация share-link для отправителя
```

## Особые места

### Share-modals (три раздельные модалки)

- [`ShareDraftLinkModal`](./components/share-modals/ShareDraftLinkModal.tsx) — для **отправителя**. На каждое открытие генерирует новый токен через мутацию (старые токены остаются у бэкенда). Пока мутация идёт — поле ссылки пустое и показывается `Loader`, кнопки `disabled`.
- [`SharedDraftReceivedModal`](./components/share-modals/SharedDraftReceivedModal.tsx) — для **получателя**. Управляется снаружи: `DraftsPageView` держит флаг `showSharedModal`, чтобы временно скрыть модалку при открытии preview, а потом вернуть. Save проверяет наличие `lamaplanner_access_token` до вызова мутации — иначе показывает ошибку и не consume’ит токен.
- [`ExpiredLinkModal`](./components/share-modals/ExpiredLinkModal.tsx) — фолбэк на ошибку `useSharedDraftQuery`. Триггерится строго через `query.isError`, отдельного эндпоинта проверки нет.

### useDraftsPage

- Возвращает один большой объект (≈25 полей). Все локальные state-сеттеры (`setDeleteConfirmDraft`, `setPreviewDraft`, `setShareDraft`) пробрасываются наружу — `DraftsPageView` дёргает их по событиям из списка.
- `previewData` строится из `previewDraft` на каждом рендере через `buildDraftPreviewPayload`. Это синхронная функция, мемоизация не использовалась.
- `handleEdit` делает **полный** редирект через `window.location.href`, а не `router.push` — это намеренно (см. поведение на `SeriesDraftsPageView`, где для edit-навигации, наоборот, используется `router.push`). Унификации сейчас нет.
- Инфинит-скролл слушает скролл **и** окна, и `<main>` одновременно — на случай разных layout-обёрток. Это отличается от Calendar, где используется `useInView` sentinel.

### Расхождение с CLAUDE.md

CLAUDE.md упоминает `app/[locale]/drafts/store/` (own Provider + Redux slice). Фактически каталога `store/` в фиче нет — UI-state живёт в локальных хуках, серверный state — в TanStack Query через общий `@/store/publications/queries`. Если потребуется Redux-slice (например, для устойчивого выбора нескольких черновиков), его придётся создать с нуля.
