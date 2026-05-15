# app/store/

Глобальный shared слой: TanStack Query хуки для server-data, общий `apiRequest<T>`, query-client, утилиты. Также содержит deprecated Redux slices (`bots/slice.ts`, `channels/slice.ts`) которые никто уже не читает — оставлены как placeholder.

## Структура

| Файл / папка | Что |
|---|---|
| [api.ts](api.ts) | `apiRequest<T>` + `getAuthToken` + `uploadMediaFile` — единый HTTP-слой |
| [query-client.ts](query-client.ts) | Singleton QueryClient (используется в `QueryProvider` в [locale]/layout.tsx) |
| [utils.ts](utils.ts) | Хелперы для query-keys + работа с локальным storage |
| [bots/](bots/) | `useBotsQuery`, `useBotQuery`, mutations |
| [calendar/](calendar/) | `useCalendarDataQuery`, `useFetchMoreDayPostsMutation`, `useFetchMoreListPostsMutation`, delete mutations |
| [channels/](channels/) | `useChannelsQuery` + 9 settings-доменов (см. ниже) |
| [inbox/](inbox/) | `useInboxEventsQuery`, commands/triggers/invite-links/global-messages |
| [publications/](publications/) | `useDayCountsQuery`, group/series-операции |
| [tags/](tags/) | `useTagsQuery` + CRUD |
| [text-templates/](text-templates/) | `useTextTemplatesQuery` + CRUD |
| [wallet/](wallet/) | Ad-revenues queries + types |

## API Layer

```ts
import { apiRequest } from '@/store/api';

const bots = await apiRequest<Bot[]>('/bots/', { method: 'GET' });
await apiRequest('/bots/123/activate', { method: 'POST' });
```

### Что делает `apiRequest<T>`

1. Цепляет base URL из `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000/api`).
2. Цепляет `Authorization: Bearer <localStorage['lamaplanner_access_token']>`.
3. Парсит JSON, типизирует через generic `T`.
4. На 401 — очищает токен, редиректит на `/login`.
5. На 4xx/5xx — кидает `ApiError` с status + detail.

### Медиа-загрузка

```ts
import { uploadMediaFile } from '@/store/api';

const { url, file_id, thumbnail_url } = await uploadMediaFile(file);
```

## TanStack Query Patterns

### Queries

```ts
// store/bots/queries.ts
export function useBotsQuery() {
  return useQuery({
    queryKey: ['bots'],
    queryFn: () => apiRequest<Bot[]>('/bots/'),
  });
}

export function useBotQuery(botId: number | null) {
  return useQuery({
    queryKey: ['bot', botId],
    queryFn: () => apiRequest<Bot>(`/bots/${botId}`),
    enabled: botId !== null,  // disabled-state pattern
  });
}
```

**Disabled-state**: хуки принимают `null` для условного запуска. Гарантирует что hooks-rules не ломаются при условном рендере.

### Mutations

```ts
export function useDeleteBotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/bots/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bots'] }),
  });
}
```

**Инвалидация**: после успешной мутации — `invalidateQueries` с правильным `queryKey`. Это перезагрузит зависимые запросы.

### Optimistic updates (где есть)

В `calendar/queries.ts` для `useFetchMoreDayPostsMutation` используется `setQueryData` чтобы дописать данные в существующий бакет:

```ts
qc.setQueryData(['calendar', view, params], (old) => ({
  ...old,
  results: appendDayBucket(old.results, dateKey, newPosts),
}));
```

## Channels — 9 settings-доменов

Большой `channels/` поделен на под-файлы по доменам настроек:

| Файл | Покрывает | Backend route |
|---|---|---|
| [queries.ts](channels/queries.ts) | List + create + update + delete каналов | `/channels/*` |
| [moderationQueries.ts](channels/moderationQueries.ts) | Moderation rules CRUD | `/channels/{id}/moderation/*` |
| [antispamQueries.ts](channels/antispamQueries.ts) | Antispam settings (linkFilter, flood) | `/channels/{id}/antispam/*` |
| [bannedWordsQueries.ts](channels/bannedWordsQueries.ts) | Banned words list | `/channels/{id}/banned-words/*` |
| [nightModeQueries.ts](channels/nightModeQueries.ts) | Night-mode (часы, что блокировать) | `/channels/{id}/night-mode` |
| [channelTelegramQueries.ts](channels/channelTelegramQueries.ts) | Telegram-side settings (pin, perms, photo, title) | `/channels/{id}/telegram/*` |
| [backupQueries.ts](channels/backupQueries.ts) | Backup mode + target + restore | `/channels/{id}/backup/*` |
| [automationQueries.ts](channels/automationQueries.ts) | Триггеры/автоответы для канала | `/channels/{id}/automation/*` |
| [joinSettingsQueries.ts](channels/joinSettingsQueries.ts) | Join-request settings (captcha mode, approval) | `/channels/{id}/join-settings` |
| [welcomeSettingsQueries.ts](channels/welcomeSettingsQueries.ts) | Welcome-сообщение настройки | `/channels/{id}/welcome` |

## Calendar — особенности

[calendar/queries.ts](calendar/queries.ts) (~414 строк) — самый сложный модуль:
- `useCalendarDataQuery` возвращает либо `{type: 'grid', results: GridDayResult[]}` (week/month) либо `{type: 'list', items, hasMore, total}` (day/list)
- `useFetchMoreDayPostsMutation` — догрузка постов внутри одного дня через `setQueryData`
- **Критично**: `pageSize=50` ДОЛЖНО совпадать с `per_day=50` начального запроса — иначе ломается infinite scroll

## Redux Slices (legacy)

- [bots/slice.ts](bots/slice.ts), [channels/slice.ts](channels/slice.ts) — **никто не читает**. Раньше держали server-data, после миграции на TanStack Query они не нужны. Оставлены как placeholder; ничего не пишет в эти reducers.
- `bots/slice.ts` и `channels/slice.ts` НЕ зарегистрированы ни в одном `inbox-store` / `create-post-store` — поэтому де-факто dead code. Можно удалить.

## Selectors с параметрами

Стандартный RTK-паттерн (НЕ создавай новый селектор на каждый вызов):

```ts
export const selectMessages = createSelector(
  [(s) => s.messages, (_s, chatKey: string) => chatKey],
  (messages, chatKey) => messages[chatKey] || [],
);

// Usage:
const messages = useAppSelector((s) => selectMessages(s, chatKey));
```

## query-keys конвенция

```ts
['bots']                          // список ботов
['bot', botId]                    // один бот
['channels']                      // список каналов
['channels', { bot_id }]          // с фильтром
['channel', channelId]            // один канал
['channel-moderation', channelId] // 9 доменов настроек: channel-<domain>
['calendar', view, params]        // календарь
['inbox', filters]                // inbox-события
```

Везде первая часть — domain (kebab-case). Параметры идут далее как литерал или объект.

## Где НЕ используется apiRequest

- WebSocket (`/api/direct/ws`) — нативный WebSocket API
- File downloads (xlsx exports) — `fetch` напрямую с blob

## Что улучшить

- Удалить `bots/slice.ts` и `channels/slice.ts` (dead code)
- Объединить commonly-needed-types из разных features в `app/types/`
