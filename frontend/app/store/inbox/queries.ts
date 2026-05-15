import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

export type InboxCategory = 'moderation' | 'system' | 'automation';
export type EntityType = 'bot' | 'channel' | 'system';
export type EventStatus = 'new' | 'processed' | 'banned' | 'ignored';
export type SortDir = 'new' | 'old';
export type BulkActionType = 'read' | 'ignore' | 'delete' | 'block' | 'unblock';

export type EventType =
  | 'bot_message'
  | 'bot_command'
  | 'bot_error'
  | 'channel_comment'
  | 'channel_join_request'
  | 'channel_link_join'
  | 'channel_ban'
  | 'channel_member_joined'
  | 'channel_member_left'
  | 'channel_title_changed'
  | 'channel_photo_changed'
  | 'channel_pinned_message'
  | 'system_notification'
  | 'system_trigger'
  | 'system_autoreply'
  | 'system_update';

export type InboxActionType =
  | 'mark_resolved'
  | 'ignore'
  | 'reply'
  | 'accept'
  | 'reject'
  | 'unban'
  | 'block'
  | 'delete_message'
  | 'delete_and_block'
  | 'change_ban';

export interface InboxEventResponse {
  id: number;
  category: InboxCategory;
  entity_type: EntityType;
  event_type: EventType;
  bot_id: number | null;
  tg_bot_name?: string | null;
  tg_bot_username?: string | null;
  channel_id: number | null;
  tg_user_id: number | null;
  tg_username: string | null;
  tg_first_name: string | null;
  status: EventStatus;
  description: string | null;
  reason?: string | null;
  reason_source?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_new: boolean;
}

export interface InboxListResponse {
  items: InboxEventResponse[];
  total: number;
}

export interface InboxEventFilters {
  category?: InboxCategory;
  status?: EventStatus | null;
  botIds?: number[] | null;
  channelIds?: number[] | null;
  system?: boolean | null;
  typeAutoReplies?: boolean | null;
  typeTriggers?: boolean | null;
  typeCommands?: boolean | null;
  search?: string | null;
  sort?: SortDir;
  pageSize?: number;
}

export const inboxKeys = {
  all: ['inbox'] as const,
  events: () => [...inboxKeys.all, 'events'] as const,
  eventList: (filters: InboxEventFilters) => [...inboxKeys.events(), filters] as const,
};

const DEFAULT_PAGE_SIZE = 50;

function buildEventsUrl(filters: InboxEventFilters, offset: number): string {
  const params = new URLSearchParams();
  const limit = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.botIds && filters.botIds.length > 0) params.set('bot_ids', filters.botIds.join(','));
  if (filters.channelIds && filters.channelIds.length > 0) params.set('channel_ids', filters.channelIds.join(','));
  if (filters.system !== undefined && filters.system !== null) params.set('system', String(filters.system));
  if (filters.typeAutoReplies !== undefined && filters.typeAutoReplies !== null) {
    params.set('type_auto_replies', String(filters.typeAutoReplies));
  }
  if (filters.typeTriggers !== undefined && filters.typeTriggers !== null) {
    params.set('type_triggers', String(filters.typeTriggers));
  }
  if (filters.typeCommands !== undefined && filters.typeCommands !== null) {
    params.set('type_commands', String(filters.typeCommands));
  }
  if (filters.search) params.set('search', filters.search);
  params.set('sort', filters.sort ?? 'new');
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return `/inbox?${params}`;
}

export function useInboxEventsQuery(filters: InboxEventFilters) {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: inboxKeys.eventList(filters),
    queryFn: ({ pageParam }) =>
      apiRequest<InboxListResponse>(buildEventsUrl(filters, pageParam)),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((acc, p) => acc + p.items.length, 0);
      return lastPage.items.length >= pageSize ? loaded : undefined;
    },
    staleTime: 30 * 1000,
  });
}

export interface BulkActionParams {
  event_ids: number[];
  action: BulkActionType;
  apply_to_all?: boolean;
}

export function useBulkInboxActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: BulkActionParams) =>
      apiRequest<{ status: string; affected_rows: number }>('/inbox/bulk-action', {
        method: 'POST',
        body: JSON.stringify({
          event_ids: params.event_ids,
          action: params.action,
          apply_to_all: params.apply_to_all ?? false,
        }),
      }),
    onSuccess: () => invalidateInbox(qc),
  });
}

export interface SpecificActionResponse {
  status: string;
  bot_id?: number;
  tg_user_id?: number;
  chat_id?: number;
  message_id?: number;
  affected_channels?: number[];
}

export interface SpecificActionParams {
  eventId: number;
  action_type: InboxActionType;
  payload?: Record<string, unknown>;
}

export function useSpecificInboxActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, action_type, payload }: SpecificActionParams) =>
      apiRequest<SpecificActionResponse>(`/inbox/${eventId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action_type, payload }),
      }),
    onSuccess: () => invalidateInbox(qc),
  });
}

export function invalidateInbox(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: inboxKeys.all });
}
