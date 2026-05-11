# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (standalone output)
npm run lint     # ESLint
```

No test suite is configured. TypeScript is checked via `tsc --noEmit` (runs as part of build).

## Architecture

### Routing

Next.js App Router with i18n prefix: `app/[locale]/`. Supported locales: `ru` (default), `sr`, `en`. Locale detection and redirect is handled in `middleware.ts` — manual implementation, no `next-intl` middleware.

Pages are thin: they render an `*View` or directly compose section components. Heavy logic lives in feature directories under `app/[locale]/<feature>/components/`.

### State Management

**Server data → TanStack Query.** Local UI state → React local state or feature-isolated Redux.

**TanStack Query** (`QueryProvider` in locale layout) is the source of truth for server data. Hooks live in `store/<resource>/queries.ts`:
- `store/channels/` — `useChannelsQuery`, `useAddChannelMutation`, plus 9 settings domains: `moderationQueries`, `antispamQueries`, `bannedWordsQueries`, `nightModeQueries`, `channelTelegramQueries`, `backupQueries`, `automationQueries`, `joinSettingsQueries`, `welcomeSettingsQueries`
- `store/bots/` — `useBotsQuery`, `useBotQuery`, mutations for create/delete/activate/update/photo/bind-channel
- `store/tags/` — `useTagsQuery`
- `store/publications/` — `useDayCountsQuery` and related
- `store/inbox/` — `useInboxEventsQuery`, `useInviteLinksQuery`, `useBotCommandsQuery`, `useTriggersQuery`, `useSendBotMessageMutation`
- `store/calendar/` — `useCalendarDataQuery`, `useFetchMoreDayPostsMutation`, `useFetchMoreListPostsMutation`, `useDeletePublicationMutation`, `useDeleteSeriesMutation`, `useDeleteRepeatPublicationMutation`. Returns `{ type: 'grid', results } | { type: 'list', items, hasMore, total }` depending on view. Day-level load-more uses `pageSize=50` to match initial week-batch `per_day=50` (mismatch breaks infinite scroll — historic bug).

Mutations invalidate queries via `qc.invalidateQueries({ queryKey: ... })`. Hooks accept `null` for disabled state (e.g. `useBotQuery(channel.bot_id ?? null)`).

**Redux is reserved for local UI state**, not server data:
- `app/[locale]/calendar/store/` → `CalendarProvider` — UI state only (selectedDate, sidebarDate, currentView, listSortOrder, listStatusFilter, countsMonthAnchor, listRangeStart/End). All server data via TQ.
- `app/[locale]/create-post/store/` → `CreatePostProvider` (also reused by `edit-post` and `edit-draft`) — Tiptap editor / media / inline-buttons / quiz / settings / dates
- `app/[locale]/drafts/store/` → own Provider
- `app/[locale]/inbox/store/` → own Provider — modal forms, sort/filter UI state, direct chat slice
- `bots` and `channels` Redux slices in `store/<resource>/slice.ts` still exist but no consumer reads from them — kept only as a placeholder. inbox-store no longer registers either reducer.

The `app/[locale]/channels/store/` and `app/[locale]/bots/store.ts` were removed — both pages use TQ directly. inbox-store holds only modal-form / sort / direct-chat slices (no server data).

**Selectors with parameters** use the standard RTK pattern with extra arg (NOT factories that create a new selector each call):

```typescript
export const selectMessages = createSelector(
  [(s) => s.messages, (_s, chatKey: string) => chatKey],
  (messages, chatKey) => messages[chatKey] || [],
);
// usage: useAppSelector((s) => selectMessages(s, chatKey))
```

### API Layer

API calls use a shared `apiRequest<T>()` utility from **`store/api.ts`** (`@/store/api`). It reads `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000/api`) and attaches a Bearer token from `localStorage` (`lamaplanner_access_token`).

For media uploads use `uploadMediaFile(file)` from the same module.

### Architecture Boundaries

- **`components/` is shared, presentational.** It must NOT import from `app/[locale]/<feature>/`. Currently clean.
- **One feature should not import from another feature.** Cross-feature shared logic goes into `components/` or `hooks/`.
- **`store/` is shared global** — TQ hooks, slices, `apiRequest`.

### File-size Guideline

- Aim for components under ~300 lines. When a component grows, decompose into a directory: `<Component>/index.tsx` (composer) + sub-section files. See [ModerationSection/](app/[locale]/channels/[id]/components/ModerationSection/), [BackupSection/](app/[locale]/channels/[id]/components/BackupSection/), [JoinSettingsSection/](app/[locale]/channels/[id]/components/JoinSettingsSection/), [CreateInfoMessageModal/](app/[locale]/channels/[id]/components/CreateInfoMessageModal/), [PostSettings/](app/[locale]/create-post/components/PostSettings/) for examples.
- Connected components: split by domain so each only `useSelector`s its own slice — avoid the 22-useSelector anti-pattern.
- Extract `constants.ts`, `helpers.ts`, and shared sub-components (e.g. `PickerRow.tsx`, `TimeMutePicker.tsx`) when they're used in 2+ siblings.

### Component Conventions

- **Styling**: SCSS Modules (`.module.scss`) for all components. No Tailwind in component files.
- **`classnames`** library for conditional class composition.
- **`'use client'`** required on any component using hooks, Redux, browser APIs, or TQ hooks. Pages/layouts that only render server components omit it.
- **Connected components** (suffixed `Connected` or living under a feature directory) handle state wiring; presentational components are prop-driven.
- **Cancel buttons** must always be `variant="outline" intent="gradient"`, never `intent="neutral"`.

### Notifications

Global toast system via `NotificationProvider` (in locale layout). Use `useNotifications()` hook → `showSuccess(msg)` / `showError(msg)` from `components/notifications/NotificationProvider.tsx`.

### Infinite Scroll

Shared `useInView` hook in `frontend/hooks/useInView/`. Pattern: place a sentinel element at list end, `onChange(inView)` triggers `onLoadMore` when `inView === true`. Mobile-aware: `root: isMobile ? null : scrollRootEl` (when scroll happens on the document on mobile vs an inner container on desktop).

For per-day grid views (week/month), use `useInView` per-day with `dayHasMore[dateKey]` from `selectDayHasMoreMap`. Critical: `fetchMoreDayPosts` `pageSize` MUST match initial `per_day` (50) in `fetchCalendarData` — mismatched offsets duplicate items and break `hasMore`.

### Calendar Feature

Views: `day`, `week`, `month`, `list`. UI state (`selectedDate`, `sidebarDate`, `currentView`, etc.) in `store/slices/calendar.ts`. Server data via `useCalendarDataQuery` from `@/store/calendar` — returns either `{type: 'grid', results: GridDayResult[]}` (week/month) or `{type: 'list', items, hasMore, total}` (day/list). Per-day load-more (`useFetchMoreDayPostsMutation`) uses `setQueryData` to append to the day bucket. Utils in `app/[locale]/calendar/utils/`: `calendar-helpers.ts` (date math), `post-helpers.ts` (`formatCompact` returns `"0"` not `"—"`), `filterPosts.ts`, `buildFilterConfigs.ts`.

### Create-Post / Edit Flow

Rich-text editor powered by **Tiptap** (extensions: link, underline, placeholder, code-block-lowlight, character-count, bubble-menu). Media files held in `useMessageMedia` hook (local React state). Slices: `editor`, `media`, `settings`, `datePicker`, `inlineButtons`, `quiz`, `series`, `tags`, `templates`, `drafts`, `channelsSelection`, `replyToPost`, `ui`.

`PostSettings` is decomposed into [PostSettings/](app/[locale]/create-post/components/PostSettings/) — `index.tsx` (composer + openDropdown coordination), and per-domain Connected sub-sections (`ChannelsSection`, `AutoDeleteSection`, `RepeatSection`, `BottomActions`). Each reads only its own slice.

## Key Paths

| Path | Purpose |
|------|---------|
| `middleware.ts` | Locale redirect + admin Basic Auth |
| `components/app-layout/` | Shell: header, sidebar, main |
| `components/notifications/` | Global toast via `useNotifications()` |
| `components/icons/` | All SVG icons as React components |
| `components/new-button/` | The single Button. Variants: `fill\|outline\|ghost\|tag\|soft` × intent `primary\|gradient\|destructive\|neutral\|white` × size `sm\|md\|lg\|transparent`. Old `components/button/` deleted entirely. |
| `store/api.ts` | Shared `apiRequest<T>` + `getAuthToken()` + `uploadMediaFile()` |
| `store/<resource>/queries.ts` | TQ hooks for that resource |
| `hooks/useInView/` | IntersectionObserver hook for infinite scroll |
| `hooks/useMessageMedia.ts` | Local-state media file management |
| `hooks/useInlineButtons.ts` | Inline-keyboard editor state |
| `app/[locale]/calendar/utils/` | Date math, post formatting, filter configs |
