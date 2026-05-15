# Channels (frontend)

## Overview

Раздел управления Telegram-каналами и группами. Включает список подключённых каналов, форму подключения (через бота, выбранного из списка), и детальную страницу настроек с четырьмя табами: общая информация, резервное копирование, модерация, автоматизация. Все запросы идут через TanStack Query — Redux-slice для каналов остался в `store/channels/slice.ts` как legacy и страницами не используется.

## Точки входа

| Файл | Назначение |
|---|---|
| [`page.tsx`](./page.tsx) | Серверная обёртка, рендерит `AppLayout` + `ChannelsView`. |
| [`ChannelsView.tsx`](./ChannelsView.tsx) | Клиентский список каналов с фильтрами «Все / Каналы / Группы», кнопкой «Подключить», иконкой ручной синхронизации (`useRefreshChannelsMutation`) и модалкой удаления. |
| [`[id]/page.tsx`](./[id]/page.tsx) | Серверная обёртка детальной страницы, разворачивает `params.id`. |
| [`[id]/ChannelSettingsView.tsx`](./[id]/ChannelSettingsView.tsx) | Управляет состоянием `settingsTab` и переключает четыре секции: `BotsSection` (общая), `BackupSection`, `ModerationSection`, `AutomationSection`. Канал ищется в кэше `useChannelsQuery` по `id`. |

## 9 settings-доменов

| Домен | Query-хук (из [`store/channels`](../../store/channels)) | Где в UI | Что хранит |
|---|---|---|---|
| moderation | [`moderationQueries`](../../store/channels/moderationQueries.ts) (`useFloodSettingsQuery`, `useAutoDeleteSettingsQuery`, `useMediaBlockQuery`, `useQuickCommandsQuery`) | `ModerationSection/FloodBlock`, `AutoDeleteBlock`, `MediaBlockBlock`, `QuickCommandsBlock` | Антифлуд, авто-удаление, блокировка медиа, быстрые команды модератора. |
| antispam | [`antispamQueries`](../../store/channels/antispamQueries.ts) | [`ModerationSection/AntispamBlock`](./[id]/components/ModerationSection/AntispamBlock.tsx) | Режим фильтрации ссылок и реакция на нарушение. |
| banned-words | [`bannedWordsQueries`](../../store/channels/bannedWordsQueries.ts) | [`ModerationSection/BannedWordsBlock`](./[id]/components/ModerationSection/BannedWordsBlock.tsx) | Чёрный список слов и массовое действие. |
| night-mode | [`nightModeQueries`](../../store/channels/nightModeQueries.ts) | [`ModerationSection/NightModeBlock`](./[id]/components/ModerationSection/NightModeBlock.tsx) | Расписание ночного режима, в котором глушится активность. |
| telegram | [`channelTelegramQueries`](../../store/channels/channelTelegramQueries.ts) (`useUpdateChannelTelegramMutation`, `useUploadChannelPhotoMutation`) | [`EditChannelModal`](./[id]/components/EditChannelModal.tsx), [`DescriptionEditor`](./[id]/components/DescriptionEditor.tsx) | Название, описание и аватар канала — пушится в Telegram через бота. |
| backup | [`backupQueries`](../../store/channels/backupQueries.ts) (`useUpdateBackupModeMutation`, `useRestoreBackupMutation`, `useBackupStatsQuery`) | [`BackupSection/`](./[id]/components/BackupSection/) | Режим зеркалирования постов, цели копирования, фильтры контента, восстановление, экспорт. |
| automation | [`automationQueries`](../../store/channels/automationQueries.ts) (`useInfoMessagesQuery`, `useToggleAutoRepliesMutation`, …) | [`AutomationSection`](./[id]/components/AutomationSection.tsx) + [`CreateInfoMessageModal/`](./[id]/components/CreateInfoMessageModal/), `InfoMessagesListModal` | Информационные сообщения по расписанию, автоответы, пользовательские команды (через `auto-reply` и `bot-command` провайдеры). |
| join-settings | [`joinSettingsQueries`](../../store/channels/joinSettingsQueries.ts) (`useAutoApprovalQuery`, `useCaptchaSettingsQuery`) | [`JoinSettingsSection/`](./[id]/components/JoinSettingsSection/) (`ApprovalBlock`, `CaptchaBlock`) + [`CaptchaSettingsModal`](./[id]/components/CaptchaSettingsModal.tsx) | Авто-аппрув заявок и капча на вход в группу. |
| welcome-settings | [`welcomeSettingsQueries`](../../store/channels/welcomeSettingsQueries.ts) (`useToggleWelcomeMutation`, `useUpdateWelcomeSettingsMutation`, `useForumTopicsQuery`) | [`JoinSettingsSection/WelcomeBlock`](./[id]/components/JoinSettingsSection/WelcomeBlock.tsx) + [`WelcomeMessageModal`](./[id]/components/WelcomeMessageModal.tsx) | Приветственное сообщение, медиа, inline-кнопки, выбор forum-топика. |

Список каналов также читается через `useChannelsQuery` / `useAddChannelMutation` / `useDeleteChannelMutation` / `useRefreshChannelsMutation` ([`queries.ts`](../../store/channels/queries.ts)).

## Структура каталога

```
channels/
├── page.tsx                              # список (server)
├── ChannelsView.tsx                      # список (client)
├── styles.module.scss
├── components/
│   ├── ChannelCard/                      # карточка канала со списком включённых фич
│   ├── ConnectChannelModal/              # тонкая обёртка над общим components/connect-channel-modal
│   ├── DisconnectModal/
│   └── EmptyState/                       # пустое состояние с CTA «Подключить»
└── [id]/
    ├── page.tsx                          # детальная (server)
    ├── ChannelSettingsView.tsx           # детальная (client) — управляет табами
    ├── utils.ts                          # formatMembers (плюрализация)
    ├── styles.module.scss
    └── components/
        ├── SettingsHeader.tsx            # шапка с табами settings/backup/moderation/automation
        ├── ChannelInfoCard.tsx
        ├── DescriptionEditor.tsx
        ├── EditChannelModal.tsx          # title/описание/фото
        ├── DeleteButton.tsx
        ├── BotsSection.tsx               # композит: InviteLinks + JoinSettings + список ботов
        ├── InviteLinksSection.tsx        # переиспользует модалки из [locale]/inbox
        ├── BackupSection/                # декомпозированная секция бэкапа
        │   ├── index.tsx
        │   ├── CopyToChannelColumn.tsx
        │   ├── ArchiveColumn.tsx
        │   └── constants.ts
        ├── RestoreModal.tsx
        ├── ExportModal.tsx
        ├── ModerationSection/            # декомпозированная секция модерации
        │   ├── index.tsx
        │   ├── QuickCommandsBlock.tsx
        │   ├── MediaBlockBlock.tsx
        │   ├── AutoDeleteBlock.tsx
        │   ├── NightModeBlock.tsx
        │   ├── FloodBlock.tsx
        │   ├── AntispamBlock.tsx
        │   ├── BannedWordsBlock.tsx
        │   ├── PickerRow.tsx
        │   ├── TimeMutePicker.tsx
        │   ├── helpers.tsx
        │   └── constants.ts
        ├── JoinSettingsSection/          # вступление в группу
        │   ├── index.tsx
        │   ├── ApprovalBlock.tsx
        │   ├── CaptchaBlock.tsx
        │   ├── WelcomeBlock.tsx
        │   ├── helpers.tsx
        │   └── constants.ts
        ├── CaptchaSettingsModal.tsx
        ├── WelcomeMessageModal.tsx
        ├── AutomationSection.tsx         # инфо-сообщения + автоответы + команды
        ├── CreateInfoMessageModal/       # декомпозированная композер-модалка
        │   ├── index.tsx
        │   ├── EditorSection.tsx
        │   ├── MediaSection.tsx
        │   ├── FooterActions.tsx
        │   ├── ShareDialog.tsx
        │   ├── helpers.ts
        │   └── constants.ts
        └── InfoMessagesListModal.tsx
```

## Особые места

**Декомпозиция больших секций.** Четыре экрана разнесены по подпапкам, чтобы избежать файлов >500 строк:
- [`ModerationSection/`](./[id]/components/ModerationSection/) — 7 блоков + общий `openPicker` state-machine, чтобы открытый picker в одном блоке закрывал picker-ы в других.
- [`BackupSection/`](./[id]/components/BackupSection/) — две колонки (`CopyToChannelColumn`, `ArchiveColumn`), оркестратор хранит весь payload и шлёт `useUpdateBackupModeMutation` целиком на каждое изменение.
- [`JoinSettingsSection/`](./[id]/components/JoinSettingsSection/) — три блока, `captchaEnabled` поднят в родителя, потому что от него зависит видимость опции «проверять подписку» в `ApprovalBlock`.
- [`CreateInfoMessageModal/`](./[id]/components/CreateInfoMessageModal/) — композер с rich-text, медиа, inline-кнопками, расписанием и share-flow.

**TanStack Query вместо Redux.** Страницы дергают хуки из `store/channels` напрямую, `useChannelsQuery` шарится между списком и детальной (детальная просто фильтрует по `id`). `store/channels/slice.ts` и `thunks.ts` присутствуют в реэкспортах [`index.ts`](../../store/channels/index.ts) для legacy, но в каталоге `channels/` не используются.

**Синхронизация каналов.** Кнопка «обновить» в шапке списка использует `useRefreshChannelsMutation` — это и есть текущий sync-хук (отдельного `useSyncChannelMutation` нет). Подключение нового канала идёт через `ConnectChannelModal` → общий [`components/connect-channel-modal`](../../components/connect-channel-modal/index.tsx): сначала грузится список ботов (мастер-бот `LamaPlanner_bot` пиннится наверх), пользователь вводит ссылку/username/id, дальше вся работа с privacy mode и реальной привязкой делается на бэкенде в `SyncChannelRequest`.

**Cross-feature reuse.** `InviteLinksSection` импортирует `CreateInviteLinkModal` и `LinkInvitesModal` из `[locale]/inbox` — приглашения живут в инбоксе, секция здесь просто их показывает. `AutomationSection` оборачивает дочерние блоки в `AutoReplyProvider` и `BotCommandProvider` из общих компонентов.

## Что улучшить

- **Дублирование `formatMembers`.** Идентичная функция плюрализации лежит и в [`[id]/utils.ts`](./[id]/utils.ts), и инлайном в [`components/ChannelCard/index.tsx`](./components/ChannelCard/index.tsx). Стоит унести в общий util.
- **Legacy Redux slice.** [`store/channels/slice.ts`](../../store/channels/slice.ts) + `thunks.ts` всё ещё реэкспортируются из `index.ts`, но реально страницами не используются — кандидат на удаление либо явную пометку deprecated.
- **`AutomationSection.tsx` стал больше остальных** (3 компонента в одном файле, ~230 строк) — логично декомпозировать по тому же паттерну, что `ModerationSection/` и `BackupSection/`: `AutomationSection/index.tsx` + `InfoMessagesBlock`, `AutoRepliesBlock`, `BotCommandsBlock`.
- **`BotsSection.tsx` — название не соответствует содержимому**: рендерит `InviteLinksSection` + `JoinSettingsSection` + блок ботов. По сути это «всё, что относится к боту канала» — стоит переименовать (например, `BotIntegrationSection`) или разбить рендер в `ChannelSettingsView`.
- **`open` под `min-width: 1440px`** инициализируется через `useEffect` + `matchMedia` в `BotsSection`, `JoinSettingsSection`, `InviteLinksSection` — повторение, удобно вынести в хук `useDefaultOpenOnDesktop()`.
- **SCSS-модули секций живут на уровне выше папки** (`ModerationSection.module.scss`, `BackupSection.module.scss` лежат в `[id]/components/`, а компоненты — в подпапках). Лучше переложить стили внутрь соответствующих папок.
- **Прямая работа с `fetch`** в `BackupSection/index.tsx` для экспорта (handleExport) — стоит вынести в мутацию `useExportBackupMutation`, чтобы единообразно ловить ошибки и токен.
