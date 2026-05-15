# LAMA Frontend

Next.js (App Router) фронтенд для LAMA — платформы управления Telegram-каналами. Связан с backend по REST API на `http://localhost:8000/api`.

## Стек

| Что | Версия |
|---|---|
| Next.js | ^16.1 (App Router, standalone build) |
| React | 19.2 |
| TypeScript | ^5 |
| State (server data) | TanStack Query ^5.90 |
| State (UI) | Redux Toolkit ^2.11 + react-redux ^9.2 |
| Стили | SCSS Modules (`sass` ^1.94) |
| i18n | next-intl ^4.6 (ru / sr / en) |
| Rich-text | Tiptap ^3.15 |
| Animations | framer-motion ^12.23 |
| Carousels | swiper ^12 |

## Запуск

```bash
cd frontend
npm install
npm run dev      # localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

### Env

| Переменная | Дефолт | Что |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api` | URL backend API |

Auth-токен сидит в `localStorage` под ключом `lamaplanner_access_token` (читается из [app/store/api.ts](app/store/api.ts)).

## Структура

```
frontend/
├── app/                            ← Next.js App Router
│   ├── page.tsx                    ← redirect на /ru
│   ├── [locale]/                   ← все user-facing страницы под /ru, /sr, /en
│   │   ├── calendar/               ← главный экран: публикации с views (day/week/month/list)
│   │   ├── create-post/            ← Tiptap-редактор + 13 slices
│   │   ├── edit-post/              ← переиспользует CreatePostProvider
│   │   ├── edit-draft/             ← переиспользует CreatePostProvider
│   │   ├── drafts/                 ← список черновиков
│   │   ├── inbox/                  ← события + Direct (DM-чаты)
│   │   ├── inbox/chat/             ← интерфейс Direct-чата
│   │   ├── channels/[id]/          ← страница канала с 9 settings-доменами
│   │   ├── bots/[id]/              ← страница бота
│   │   ├── knowledge-base/[slug]/  ← KB-статьи
│   │   ├── profile/                ← профиль юзера + сессии
│   │   ├── wallet/                 ← рекламный кабинет
│   │   ├── login/, register/, ...
│   ├── admin/                      ← админка лендинга + KB
│   ├── landing/                    ← публичная маркетинг-страница
│   ├── components/                 ← shared presentational components
│   ├── hooks/                      ← shared hooks (useInView, useMessageMedia)
│   ├── store/                      ← TQ queries + Redux + apiRequest
│   └── types/                      ← глобальные TS типы
├── public/                         ← статика
├── middleware.ts                   ← locale redirect + admin Basic Auth
└── package.json
```

### Где живёт что

| Что сделать? | Куда |
|---|---|
| Добавить страницу | `app/[locale]/<name>/page.tsx` + локальные `components/` рядом |
| Добавить переиспользуемый компонент | `app/components/<name>/` (kebab-case) |
| Добавить TQ-хук (server data) | `app/store/<resource>/queries.ts` |
| Добавить UI-state (Redux) | `app/[locale]/<feature>/store/slices/<name>.ts` |
| Добавить иконку | `app/components/icons/<name>.tsx` |
| Глобальный SCSS | `app/globals.scss` |
| Локализация | `messages/<locale>/<file>.json` |
| Middleware (redirect/auth) | `middleware.ts` |

## Архитектура

### Routing

Next.js App Router с i18n-префиксом `app/[locale]/`. Локали: `ru` (default), `sr`, `en`. Локаль определяется в [middleware.ts](middleware.ts) — это **ручная реализация**, не `next-intl` middleware.

Pages "тонкие": они рендерят `*View` или композят секции. Тяжёлая логика — в `app/[locale]/<feature>/components/`.

### State Management

**Server data → TanStack Query.** **UI state → Redux (feature-isolated) или local React state.**

TanStack Query — единственный источник правды для серверных данных. Хуки в `app/store/<resource>/queries.ts`. Provider настроен в `app/[locale]/layout.tsx`.

Redux Toolkit зарезервирован под UI-state каждой фичи отдельно. Глобального стора нет:
- `app/[locale]/calendar/store/` — selectedDate, sidebarDate, currentView, фильтры списка
- `app/[locale]/create-post/store/` — Tiptap editor, media, inline-buttons, quiz, settings, dates (13 slices)
- `app/[locale]/drafts/store/`
- `app/[locale]/inbox/store/` — модалки, фильтры, direct-chat slice

Подробности — [app/store/README.md](app/store/README.md).

### API Layer

Все API-вызовы идут через `apiRequest<T>()` из [app/store/api.ts](app/store/api.ts). Он:
- читает `NEXT_PUBLIC_API_BASE_URL`
- цепляет `Authorization: Bearer <localStorage['lamaplanner_access_token']>`
- бросает на 401 → redirect на `/login`
- парсит JSON

Для медиа — `uploadMediaFile(file)` оттуда же.

### Component Conventions

| Правило | Зачем |
|---|---|
| SCSS Modules (`.module.scss`) для каждого компонента | Изоляция классов |
| `classnames` для условных классов | Стандарт проекта |
| `'use client'` обязателен в компонентах с hooks/Redux/browser API | Next.js требование |
| Cancel-кнопки всегда `variant="outline" intent="gradient"` | Дизайн-консистентность |
| Файл компонента ≤ 300 строк → иначе декомпозируем в `<Comp>/index.tsx + sub-files` | Читаемость |
| Connected-компоненты `useSelector` только из своего slice | Избегаем 22-useSelector |
| Tailwind НЕ используется в компонентах | Только SCSS Modules |

### Architecture Boundaries

- `app/components/` — shared, **никогда не импортирует из `app/[locale]/<feature>/`**.
- Одна фича **не импортирует другую**. Если нужно — выносим в `components/` или `hooks/`.
- `app/store/` — глобальный shared слой (TQ + apiRequest + slices без consumer-ов).

## Per-feature READMEs

| Фича | README |
|---|---|
| Calendar | [app/[locale]/calendar/README.md](app/[locale]/calendar/README.md) |
| Create-post / Edit-post / Edit-draft | [app/[locale]/create-post/README.md](app/[locale]/create-post/README.md) |
| Inbox + Direct-чат | [app/[locale]/inbox/README.md](app/[locale]/inbox/README.md) |
| Channels | [app/[locale]/channels/README.md](app/[locale]/channels/README.md) |
| Bots | [app/[locale]/bots/README.md](app/[locale]/bots/README.md) |
| Drafts | [app/[locale]/drafts/README.md](app/[locale]/drafts/README.md) |

## Прочие READMEs

- [app/components/README.md](app/components/README.md) — shared presentational components
- [app/store/README.md](app/store/README.md) — TQ-паттерны, `apiRequest`, slices
- [app/hooks/README.md](app/hooks/README.md) — shared hooks

## Особые места

### Локали (i18n)

[middleware.ts](middleware.ts) делает manual redirect: `/` → `/ru`, `/foo` → `/ru/foo`. Это **не** `next-intl/middleware` — он переписан под наши нужды.

### Admin (Basic Auth)

`/admin/*` защищён basic-auth в [middleware.ts](middleware.ts). Логин/пароль — env-переменные. Это поверх `Depends(get_current_admin)` на backend-стороне.

### WebSocket для Direct-чатов

`app/[locale]/inbox/chat/` подключается к `/api/direct/ws?token=<JWT>` — live-обновления сообщений. См. [app/[locale]/inbox/README.md](app/[locale]/inbox/README.md).

### Infinite Scroll

Сделан через [useInView](app/hooks/useInView/) хук. Sentinel-элемент в конце списка + IntersectionObserver. Mobile-aware.

Критическая деталь календаря: `pageSize` в `fetchMoreDayPosts` ДОЛЖНО совпадать с `per_day` (50) в `fetchCalendarData`. Любой mismatch ломает offset и `hasMore`.

### Tiptap (create-post)

Rich-text. Расширения: link, underline, placeholder, code-block-lowlight, character-count, bubble-menu. Медиа — через `useMessageMedia` хук (local-state).

### Standalone build

`next build` использует `output: 'standalone'` — минимальный production-bundle с node_modules только для нужных зависимостей. Подходит для Docker.

## Тесты

**Не настроены.** TypeScript проверяется через `tsc --noEmit` в составе `npm run build`. UI-логика — ручное тестирование в браузере.

## CLAUDE.md

[CLAUDE.md](CLAUDE.md) — рабочий гайд для Claude Code AI с актуальной архитектурой. При расхождениях с этим README — приоритет у CLAUDE.md.
