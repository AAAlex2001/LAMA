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

Next.js App Router with i18n prefix: `app/[locale]/`. Supported locales: `ru` (default), `sr`, `en`. Locale detection and redirect is handled in `middleware.ts` — no `next-intl` middleware, it's a manual implementation.

Route groups:
- `app/[locale]/(authed)/` — authenticated pages (calendar, inbox, create-post/drafts flows). Wrapped by `AppLayout` (header + sidebar + main).
- `app/[locale]/login`, `register`, `landing/`, `admin/` — unauthenticated / special pages.

Pages are thin: they import a `*View` or `*PageConnected` component from `views/` or `app/.../components/`.

### State Management

Each major feature has its own **isolated Redux store** with a `Provider` wrapper:
- `app/[locale]/calendar/store/` → `CalendarProvider`
- `app/[locale]/create-post/store/` → `CreatePostProvider`
- `app/[locale]/drafts/store/` → own Provider

Store structure per feature: `slices/`, `thunks/`, `selectors.ts`, `index.ts`, `provider.tsx`.

There is **no global Redux store** — each feature wraps itself. TanStack Query (`QueryProvider`) is global (in locale layout) and used alongside Redux.

### API Layer

API calls use a shared `apiRequest<T>()` utility from `app/[locale]/create-post/store/thunks/api.ts` (imported by other features too). It reads `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000/api`) and attaches a Bearer token from `localStorage` (`lamaplanner_access_token`).

Auth token is stored in `localStorage` under `lamaplanner_access_token`.

### Component Conventions

- **Styling**: SCSS Modules (`.module.scss`) for all components. No Tailwind in component files (Tailwind is installed but not the primary styling approach).
- **`classnames`** library is used for conditional class composition.
- **`'use client'`** is required on any component using hooks, Redux, or browser APIs. Pages/layouts that only render server components omit it.
- Connected components (suffixed `Connected`) handle Redux wiring; presentational components are prop-driven.
- `views/` directory holds feature-level view components referenced by Next.js pages, keeping `app/` pages thin.

### Notifications

Global toast system via `NotificationProvider` (in locale layout). Use `useNotifications()` hook → `showSuccess(msg)` / `showError(msg)` from `components/notifications/NotificationProvider.tsx`.

### Infinite Scroll

`useInView` hook lives at `app/[locale]/calendar/store/useInView/`. Pattern: place a sentinel element at list end, `useEffect` triggers `onLoadMore` when `inView === true`. `WeeklyCalendarView` uses a per-day `DaySentinel` component to avoid calling hooks in loops.

### Calendar Feature

Views: `day`, `week`, `month`, `list`. State in `store/slices/calendar.ts`. Thunks (`fetchCalendarData`, `fetchMore`, `fetchDayCounts`, `navigation`) fetch from backend and populate per-dateKey buckets. Utils in `app/[locale]/calendar/utils/`: `calendar-helpers.ts` (date math, `parseDate`, `getRangeForView`, `getVisibleDayKeys`), `post-helpers.ts` (`formatCompact` returns `"0"` not `"—"` for zero stats), `filterPosts.ts`, `buildFilterConfigs.ts`.

### Create-Post / Edit Flow

Rich-text editor powered by **Tiptap** (extensions: link, underline, placeholder, code-block-lowlight, character-count, bubble-menu). Media files are stored in a `Map<string, File>` ref (`mediaFileStore.ts`) outside Redux to avoid serialization issues. Slices cover: `editor`, `media`, `settings`, `datePicker`, `inlineButtons`, `quiz`, `series`, `tags`, `templates`, `drafts`, `channels`, `replyToPost`, `ui`.

## Key Paths

| Path | Purpose |
|------|---------|
| `middleware.ts` | Locale redirect + admin Basic Auth |
| `components/app-layout/` | Shell: header, sidebar, main |
| `components/notifications/` | Global toast via `useNotifications()` |
| `components/icons/` | All SVG icons as React components |
| `app/[locale]/create-post/store/thunks/api.ts` | Shared `apiRequest<T>` + `getAuthToken()` |
| `app/[locale]/calendar/store/useInView/` | IntersectionObserver hook for infinite scroll |
| `app/[locale]/calendar/utils/` | Date math, post formatting, filter configs |
| `views/Inbox/` | Inbox feature (currently using static mock data) |
