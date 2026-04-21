import { createAsyncThunk, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';

export type InboxCategory = 'moderation' | 'system' | 'automation';
export type EntityType = 'bot' | 'channel' | 'system';
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
export type EventStatus = 'new' | 'processed' | 'banned' | 'ignored';
export type SortDir = 'new' | 'old';
export type BulkActionType = 'read' | 'ignore' | 'delete' | 'block' | 'unblock';

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

export interface FetchInboxEventsParams {
  category?: InboxCategory;
  status?: EventStatus;
  bot_ids?: number[];
  channel_ids?: number[];
  system?: boolean | null;
  type_auto_replies?: boolean | null;
  type_triggers?: boolean | null;
  type_commands?: boolean | null;
  event_types?: EventType[];
  sort?: SortDir;
  limit?: number;
  offset?: number;
  search?: string | null;
}

export interface BulkActionParams {
  event_ids: number[];
  action: BulkActionType;
  apply_to_all?: boolean;
}

export interface SpecificActionParams {
  eventId: number;
  action_type: InboxActionType;
  payload?: Record<string, unknown>;
}

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

export interface SpecificActionResult {
  status: string;
  bot_id?: number | null;
  tg_user_id?: number | null;
  chat_id?: number | null;
  affected_channels?: number[] | null;
  eventId: number;
}

export const fetchInboxEventsThunk = createAsyncThunk(
  'inboxEvents/fetch',
  async (params: FetchInboxEventsParams, { rejectWithValue }) => {
    const {
      category,
      status,
      bot_ids,
      channel_ids,
      system,
      type_auto_replies,
      type_triggers,
      type_commands,
      event_types,
      sort = 'new',
      limit = 50,
      offset = 0,
      search,
    } = params;

    try {
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);
      if (status) queryParams.append('status', status);
      if (bot_ids && bot_ids.length > 0) {
        queryParams.append('bot_ids', bot_ids.join(','));
      }
      if (channel_ids && channel_ids.length > 0) {
        queryParams.append('channel_ids', channel_ids.join(','));
      }
      if (system !== undefined && system !== null) {
        queryParams.append('system', String(system));
      }
      if (type_auto_replies !== undefined && type_auto_replies !== null) {
        queryParams.append('type_auto_replies', String(type_auto_replies));
      }
      if (type_triggers !== undefined && type_triggers !== null) {
        queryParams.append('type_triggers', String(type_triggers));
      }
      if (type_commands !== undefined && type_commands !== null) {
        queryParams.append('type_commands', String(type_commands));
      }
      if (event_types && event_types.length > 0) {
        queryParams.append('event_types', event_types.join(','));
      }
      if (search) {
        queryParams.append('search', search);
      }
      queryParams.append('sort', sort);
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const response = await apiRequest<InboxListResponse>(
        `/inbox?${queryParams.toString()}`,
        { method: 'GET' }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки уведомлений';
      return rejectWithValue(errorMessage);
    }
  }
);

export const CATEGORY_MAP: Record<string, string | undefined> = {
  all: undefined,
  moderation: 'moderation',
  system: 'system',
  automation: 'automation',
};

export const fetchMoreInboxEventsThunk = createAsyncThunk<
  InboxListResponse,
  void,
  { state: { inbox: import('../slices/inbox').InboxState } }
>(
  'inboxEvents/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    const s = getState().inbox;
    const limit = 50;

    try {
      const queryParams = new URLSearchParams();
      const category = CATEGORY_MAP[s.selectedFilter];
      if (category) queryParams.append('category', category);
      if (s.statusFilter) queryParams.append('status', s.statusFilter);
      if (s.botIds && s.botIds.length > 0) {
        queryParams.append('bot_ids', s.botIds.join(','));
      }
      if (s.channelIds && s.channelIds.length > 0) {
        queryParams.append('channel_ids', s.channelIds.join(','));
      }
      if (s.system !== undefined && s.system !== null) {
        queryParams.append('system', String(s.system));
      }
      if (s.typeAutoReplies !== undefined && s.typeAutoReplies !== null) {
        queryParams.append('type_auto_replies', String(s.typeAutoReplies));
      }
      if (s.typeTriggers !== undefined && s.typeTriggers !== null) {
        queryParams.append('type_triggers', String(s.typeTriggers));
      }
      if (s.typeCommands !== undefined && s.typeCommands !== null) {
        queryParams.append('type_commands', String(s.typeCommands));
      }
      if (s.search) {
        queryParams.append('search', s.search);
      }
      queryParams.append('sort', s.sortDir);
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(s.itemsOffset));

      const response = await apiRequest<InboxListResponse>(
        `/inbox?${queryParams.toString()}`,
        { method: 'GET' }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки уведомлений';
      return rejectWithValue(errorMessage);
    }
  },
  {
    condition: (_, { getState }) => {
      const s = getState().inbox;
      return !s.itemsLoading && s.itemsHasMore;
    },
  },
);

export const bulkInboxActionThunk = createAsyncThunk<
  { status: string; affected_rows: number; params: BulkActionParams },
  BulkActionParams,
  { state: { inbox: import('../slices/inbox').InboxState }; dispatch: ThunkDispatch<unknown, unknown, UnknownAction> }
>(
  'inboxEvents/bulkAction',
  async (params, { rejectWithValue, dispatch, getState }) => {
    try {
      const response = await apiRequest<{ status: string; affected_rows: number }>(
        '/inbox/bulk-action',
        {
          method: 'POST',
          body: JSON.stringify({
            event_ids: params.event_ids,
            action: params.action,
            apply_to_all: params.apply_to_all ?? false,
          }),
        }
      );

      if (params.action === 'delete') {
        const s = getState().inbox;
        const queryParams = new URLSearchParams();
        const category = CATEGORY_MAP[s.selectedFilter];
        if (category) queryParams.append('category', category);
        if (s.statusFilter) queryParams.append('status', s.statusFilter);
        if (s.botIds && s.botIds.length > 0) {
          queryParams.append('bot_ids', s.botIds.join(','));
        }
        if (s.channelIds && s.channelIds.length > 0) {
          queryParams.append('channel_ids', s.channelIds.join(','));
        }
        if (s.system !== undefined && s.system !== null) {
          queryParams.append('system', String(s.system));
        }
        if (s.typeAutoReplies !== undefined && s.typeAutoReplies !== null) {
          queryParams.append('type_auto_replies', String(s.typeAutoReplies));
        }
        if (s.typeTriggers !== undefined && s.typeTriggers !== null) {
          queryParams.append('type_triggers', String(s.typeTriggers));
        }
        if (s.typeCommands !== undefined && s.typeCommands !== null) {
          queryParams.append('type_commands', String(s.typeCommands));
        }
        if (s.search) {
          queryParams.append('search', s.search);
        }
        queryParams.append('sort', s.sortDir);
        queryParams.append('limit', '50');
        queryParams.append('offset', '0');

        dispatch(fetchInboxEventsThunk({
          category: category as InboxCategory | undefined,
          status: s.statusFilter as EventStatus | undefined,
          bot_ids: s.botIds ?? undefined,
          channel_ids: s.channelIds ?? undefined,
          system: s.system,
          type_auto_replies: s.typeAutoReplies,
          type_triggers: s.typeTriggers,
          type_commands: s.typeCommands,
          search: s.search,
          sort: s.sortDir,
          limit: 50,
          offset: 0,
        }));
      }

      return { ...response, params };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка выполнения действия';
      return rejectWithValue(errorMessage);
    }
  }
);

export interface SpecificActionResponse {
  status: string;
  bot_id?: number;
  tg_user_id?: number;
  chat_id?: number;
  message_id?: number;
  affected_channels?: number[];
}

export const specificInboxActionThunk = createAsyncThunk(
  'inboxEvents/specificAction',
  async (params: SpecificActionParams, { rejectWithValue }) => {
    const { eventId, action_type, payload } = params;

    try {
      const response = await apiRequest<SpecificActionResponse>(
        `/inbox/${eventId}/action`,
        {
          method: 'POST',
          body: JSON.stringify({ action_type, payload }),
        }
      );

      return { ...params, response };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка выполнения действия';
      return rejectWithValue(errorMessage);
    }
  }
);
