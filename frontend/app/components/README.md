# app/components/

Shared presentational компоненты. Используются из любой `app/[locale]/<feature>/`. **Никогда не импортируют из features** (правило архитектуры).

61 компонент-папок. Каждый: `index.tsx` или `<name>.tsx` + `*.module.scss`. Все презентационные — state приходит через props, никакого `useSelector` из Redux фичей.

## Core UI

| Папка | Что |
|---|---|
| [new-button/](new-button/) | **Единственная** кнопка. `variant: fill\|outline\|ghost\|tag\|soft` × `intent: primary\|gradient\|destructive\|neutral\|white` × `size: sm\|md\|lg\|transparent`. Старая `components/button/` удалена. |
| [input/](input/) | Текстовый input + variants |
| [checkbox/](checkbox/) | Чекбокс с label |
| [toggle/](toggle/) | Switch on/off |
| [loader/](loader/) | Спиннер |
| [card/](card/) | Базовая card-обёртка |
| [card-action-button/](card-action-button/) | Кнопка в углу карточки |
| [tooltip/](tooltip/) | Hover-подсказка |
| [pagination/](pagination/) | Page-numbers + prev/next |
| [search-bar/](search-bar/) | Input с иконкой поиска + debounce |
| [filter-tabs/](filter-tabs/) | Tab-переключатель фильтров |
| [usage-line/](usage-line/) | Progress-bar текущий/максимум |

## Layout / Navigation

| Папка | Что |
|---|---|
| [app-layout/](app-layout/) | Главный shell: header + sidebar-menu + main |
| [sidebar-menu/](sidebar-menu/) | Левая навигация для авторизованного юзера |
| [admin-menu/](admin-menu/) | Меню админки (`/admin/*` страницы) |
| [responsive-wrappers/](responsive-wrappers/) | `<MobileOnly />`, `<DesktopOnly />` хелперы |

## Modals / Dialogs

| Папка | Что |
|---|---|
| [modal/](modal/), [modal-base/](modal-base/) | Базовый Modal + Modal с overlay/portal |
| [tools-popup/](tools-popup/) | Pop-up меню действий (на mobile) |
| [limits-modal/](limits-modal/) | Уведомление об ограничениях тарифа |
| [drafts-modal/](drafts-modal/) | Выбор черновика для редактирования |
| [shared-draft-modal/](shared-draft-modal/) | Превью shared-черновика перед consume |
| [post-preview-modal/](post-preview-modal/) | Preview публикации в Telegram-стиле |
| [reply-to-post-modal/](reply-to-post-modal/) | Выбор сообщения для reply_to |
| [text-templates-modal/](text-templates-modal/) | Список текстовых шаблонов |

## Иконки

| Папка | Что |
|---|---|
| [icons/](icons/) | Все SVG-иконки как React-компоненты. Включает [icons/flags/](icons/flags/) для языков. |

Использование: `import { CalendarRepeatIcon, QuizIcon, PhotoIcon, ... } from '@/components/icons'`.

**Правило**: `CalendarRepeatIcon` для повторяющихся публикаций (НЕ `ArrowsSpinIcon`). `QuizIcon` для опросов в `MediaIcons` и `DraftContentIcons`.

## Notifications

| Папка | Что |
|---|---|
| [notifications/](notifications/) | `NotificationProvider` + `useNotifications()` хук |
| [notification-accordion/](notification-accordion/) | Стек уведомлений с расхлопыванием |

Использование:
```tsx
const { showSuccess, showError } = useNotifications();
showSuccess('Сохранено');
```

## Date / Time

| Папка | Что |
|---|---|
| [date-picker/](date-picker/) | Календарь выбор даты |
| [date-range-picker/](date-range-picker/) | От-до диапазон |
| [month-date-picker/](month-date-picker/) | Только месяц/год |
| [time-picker/](time-picker/) | Часы:минуты колесо |
| [time-duration-picker/](time-duration-picker/) | Длительность (10 мин, 1 час, 24 часа) |
| [wheel-picker/](wheel-picker/) | iOS-style колесо (база для time-picker) |

## Post Editor (используется в create-post / inbox)

| Папка | Что |
|---|---|
| [rich-text-editor/](rich-text-editor/) | Tiptap-обёртка + toolbar + bubble-menu + own store/action.ts |
| [media-preview/](media-preview/) | Превью загруженных медиа с reorder/удалением + own store |
| [inline-buttons/](inline-buttons/) | Конструктор inline-клавиатуры (rows × buttons) |
| [inline-button-type-picker/](inline-button-type-picker/) | Выбор типа inline-кнопки (URL / callback / hidden text) |
| [callback-action-picker/](callback-action-picker/) | Выбор action для callback-кнопки |
| [quiz-form/](quiz-form/) | Форма создания опроса/квиза |
| [reply-to-post-info/](reply-to-post-info/) | Inline-preview сообщения, на которое отвечаем |
| [repeat-settings/](repeat-settings/) | Настройки повторов (DAILY/WEEKLY/MONTHLY/CUSTOM) |
| [auto-delete-picker/](auto-delete-picker/) | Выбор TTL авто-удаления (hours или seconds) |
| [ad-toggle-section/](ad-toggle-section/) | Switch + поля для рекламных публикаций (buyer/amount) |
| [post-accordion/](post-accordion/) | Раскрывающаяся секция настроек поста |

## Bots / Channels widgets

| Папка | Что |
|---|---|
| [bot-card/](bot-card/) | Карточка бота в списке |
| [bot-command/](bot-command/) | Конструктор bot-команды (form + preview) |
| [channel-picker/](channel-picker/) | Multi-select каналов с фильтром по боту |
| [create-channel/](create-channel/) | Кнопка-CTA "добавить канал" |
| [connect-channel-modal/](connect-channel-modal/) | Modal привязки канала (выбор бота + privacy) |

## Templates (посадочные страницы)

| Папка | Что |
|---|---|
| [template-card/](template-card/) | Карточка шаблона в `/templates` |
| [template-block/](template-block/) | Рендер блока на странице шаблона |
| [template-subscribe/](template-subscribe/) | Subscribe-block внутри template-страницы |

## AI / Specialty

| Папка | Что |
|---|---|
| [ai-input-bar/](ai-input-bar/) | Bottom-bar ввод AI-промпта (в create-post редакторе) |
| [auto-reply/](auto-reply/) | Конструктор автоответов |
| [currency-select/](currency-select/) | Selector валюты (для ad-revenues) |
| [avatar/](avatar/) | Аватар пользователя/бота |
| [draft-card/](draft-card/) | Карточка черновика |

## Dropdowns

| Папка | Что |
|---|---|
| [dropdown-base/](dropdown-base/) | Базовый dropdown с порталом |
| [simple-dropdown/](simple-dropdown/) | Простой select-like |
| [sort-dropdown/](sort-dropdown/) | Sort by с иконкой |

## Конвенции

- **Naming**: kebab-case для папок (`new-button`, `date-picker`)
- **Файлы**: `index.tsx` (точка входа) или `<name>.tsx` для одиночных
- **Стили**: `*.module.scss` рядом с компонентом
- **Props**: типизированный `interface FooProps`
- **Cancel-кнопки**: всегда `<Button variant="outline" intent="gradient">`
- **'use client'**: обязателен если используется hook / browser API
- **Не импортировать** из `app/[locale]/<feature>/` — это ошибка архитектуры

## Большие компоненты с собственным store

Некоторые компоненты держат сложное локальное состояние и имеют свой mini-store (внутри Provider):
- [rich-text-editor/store/](rich-text-editor/store/) — Tiptap commands + bubble-menu state
- [media-preview/useMediaPreviewStore.ts](media-preview/useMediaPreviewStore.ts) — список превью, reorder

Такой подход ОК для **изолированных** UI-stateful компонентов которые могут жить независимо.
