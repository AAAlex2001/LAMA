# Bots

## Overview

Раздел управления Telegram-ботами пользователя. Привязка по токену через `@BotFather`, активация/деактивация (регистрация webhook на бэке), редактирование профиля (имя, описание, фото), статистика, привязка ботов к каналам, настройки модерации заявок на вступление.

Лимит — 5 ботов на пользователя (`MAX_BOTS` в [`BotsView.tsx`](./BotsView.tsx)).

Данные приходят через TanStack Query из `@/store/bots` (`useBotsQuery`, `useBotQuery`, мутации). Redux-слайса нет.

## Точки входа

- [`page.tsx`](./page.tsx) — серверная обёртка с `AppLayout`, рендерит `BotsView`.
- [`BotsView.tsx`](./BotsView.tsx) — клиентский список ботов: топ-бар со счётчиком `N/5`, грид карточек `BotCard`, кнопка «Подключить», модалки `ConnectBotModal` / `BotStatsModal` / `DeleteConfirmationModal`. Каналы из `useChannelsQuery` группируются по `bot_id` через `buildChannelMap` для отображения в карточке.
- [`[id]/page.tsx`](./[id]/page.tsx) — серверная страница `/bots/:id`, парсит `params.id` и передаёт в `BotSettingsView`.
- [`[id]/BotSettingsView.tsx`](./[id]/BotSettingsView.tsx) — детальный экран: шапка с табами (`settings` / `messages`), `BotInfoCard`, секции `BotGeneralSection` или `BotMessagesSection`, модалки `EditBotModal` / `ConnectBotModal` / `DeleteConfirmationModal`.

## Поток данных

### Создание

`ConnectBotModal` принимает API-токен (валидируется только на непустоту в UI), вызывает `onSubmit(token)`. В `BotsView` / `BotSettingsView` обработчик прокидывает токен в `useCreateBotMutation().mutateAsync({ token })`. Кеш `['bots']` инвалидируется внутри мутации. При ошибке текст из `Error.message` показывается через `useNotifications().showError`.

### Активация

`useActivateBotMutation` — `mutateAsync(bot.id)`. Бэк регистрирует webhook и переводит бот в `status === 'ACTIVE'`. UI запускает мутацию из карточки списка (`onToggleActive` → `handleToggle`) и из `BotInfoCard` на детальной странице. Локальный `toggleId` блокирует кнопку на время запроса.

### Деактивация

`useDeactivateBotMutation` — симметрично активации, бэк снимает webhook. Тот же `handleToggle` смотрит на `bot.status` и выбирает мутацию.

### Sync from Telegram

В текущем коде раздела `useSyncBotFromTelegramMutation` не используется — отдельной кнопки «обновить профиль из Telegram» в `bots/` нет. Профиль (имя, username, фото) приходит из `useBotQuery` / `useBotsQuery`. Локальные правки идут через `useUpdateBotMutation` (`name`, `description`, `auto_approval_mode`, `approval_destination`), `useUploadBotPhotoMutation`, `useDeleteBotPhotoMutation` — все вызываются из [`EditBotModal`](./[id]/components/EditBotModal.tsx) и [`BotGeneralSection`](./[id]/components/BotGeneralSection.tsx).

### Удаление

`useDeleteBotMutation` — `mutateAsync(bot.id)` через `DeleteConfirmationModal`. На детальной странице после успеха роутер уводит на `/${locale}/bots`.

### Привязка к каналу

В `BotGeneralSection` через `ChannelPicker` со списком всех каналов (`useChannelsQuery`). Чекбокс канала вызывает `useBindBotToChannelMutation({ channelId, botId })` или `useUnbindBotFromChannelMutation(channelId)`. При раскрытии дропдауна инвалидируется `['channels']` — чтобы свежие каналы подтянулись без перезагрузки.

## Структура каталога

```
bots/
├── page.tsx                      # /bots — AppLayout + BotsView
├── BotsView.tsx                  # клиентский список + модалки
├── styles.module.scss
├── components/
│   ├── ConnectBotModal/          # ввод токена + инструкция «как получить токен»
│   │   ├── index.tsx
│   │   └── styles.module.scss
│   └── BotStatsModal/            # статистика бота
│       └── index.tsx
└── [id]/
    ├── page.tsx                  # /bots/:id — AppLayout + BotSettingsView
    ├── BotSettingsView.tsx       # детальная страница, табы
    ├── styles.module.scss
    └── components/
        ├── BotSettingsHeader.tsx     # «назад», счётчик, табы
        ├── BotInfoCard.tsx           # аватар, имя, кнопка edit, кнопка вкл/выкл
        ├── BotGeneralSection.tsx     # каналы, модерация, статистика inline
        ├── BotMessagesSection.tsx    # заглушка «сообщения и триггеры»
        ├── EditBotModal.tsx          # редактирование имени/описания/фото
        └── *.module.scss
```

## Особые места

### `BotStatsModal`

[`components/BotStatsModal/index.tsx`](./components/BotStatsModal/index.tsx). Данные грузятся явным `apiRequest('/bots/:id/stats')` из `handleStats` в `BotsView` (а не через мутацию/`useQuery` — кеша нет, каждый клик идёт в сеть). Отображаемые метрики из `BotStatsPayload`:

- `total_messages` — всего сообщений
- `incoming_messages` — входящих
- `outgoing_messages` — исходящих
- `total_commands` — команд (всего)
- `active_commands` — команд (активных)
- `last_message_at` — последнее сообщение (форматируется `toLocaleString('ru-RU')`)

### `ConnectBotModal`

[`components/ConnectBotModal/index.tsx`](./components/ConnectBotModal/index.tsx). Flow привязки токена:

1. Юзер открывает модалку (`Подключить`).
2. Опционально разворачивает блок «Как получить токен?» — раскрывается список из 6 шагов (`@BotFather` → `/newbot` → копирование токена).
3. Вводит токен в `Input`, локальная проверка только на `trim() !== ''`.
4. `handleSubmit` блокирует форму (`loading`), вызывает `onSubmit(token.trim())` — родитель пробрасывает в `useCreateBotMutation`.
5. При успехе токен очищается, модалка закрывается. При ошибке текст пишется в `error` и показывается под полем.

Модалка переиспользуется на странице списка и на детальной странице (там тоже видна кнопка «Подключить» в шапке `BotSettingsHeader`).

### Привязка бота к каналу (`bind-channel`)

Логика в [`[id]/components/BotGeneralSection.tsx`](./[id]/components/BotGeneralSection.tsx):

- Источник опций — `allChannels` из `useChannelsQuery`. Привязанные к текущему боту фильтруются по `ch.bot_id === botId` ещё в `BotSettingsView` и передаются как `channels`.
- `boundIds = new Set(channels.map(...))` подсвечивает чекбоксы в `ChannelPicker`.
- `handleChannelToggle(id, checked)`:
  - `checked=true` → `useBindBotToChannelMutation({ channelId, botId })`
  - `checked=false` → `useUnbindBotFromChannelMutation(channelId)` (отвязка от любого бота, второй аргумент не нужен)
- Один канал = один бот: бэк ждёт `channelId` и сам решает, что отвязать.
- `handleDropdownToggle(true)` инвалидирует `['channels']` при открытии — на случай если юзер только что подключил канал в другой вкладке.
- Кнопка `Добавить новый` в `ChannelPicker` (`onAddNew`) открывает `ConnectChannelModal` — после успеха снова инвалидируется `['channels']`.

### Прочее

- В `BotGeneralSection` блок «Статистика» захардкожен на `0` — это не данные из `BotStatsPayload`, а плейсхолдер. Реальная статистика только в модалке.
- Тогглы «капча», «проверять подписку», «отвечать на сообщения» (`BotGeneralSection`) пока чисто локальный стейт — на бэк не сохраняются.
- Таб `messages` (`BotMessagesSection`) — заглушка.
