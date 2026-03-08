import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';

// --- Backend enums ---

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
  | 'system_notification'
  | 'system_trigger'
  | 'system_autoreply'
  | 'system_update';
export type EventStatus = 'new' | 'processed' | 'ignored';
export type SortDir = 'new' | 'old';
export type BulkActionType = 'read' | 'ignore' | 'delete' | 'block' | 'unblock';

// --- Response types ---

export interface InboxEventResponse {
  id: number;
  category: InboxCategory;
  entity_type: EntityType;
  event_type: EventType;
  bot_id: number | null;
  channel_id: number | null;
  tg_user_id: number | null;
  tg_username: string | null;
  status: EventStatus;
  description: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_new: boolean;
}

export interface InboxListResponse {
  items: InboxEventResponse[];
  total: number;
}

// --- Request param types ---

export interface FetchInboxEventsParams {
  category?: InboxCategory;
  status?: EventStatus;
  entity_type?: EntityType;
  entity_ids?: number[];
  event_types?: EventType[];
  sort?: SortDir;
  limit?: number;
  offset?: number;
}

export interface BulkActionParams {
  event_ids: number[];
  action: BulkActionType;
  apply_to_all?: boolean;
}

export interface SpecificActionParams {
  eventId: number;
  action_type: string;
  payload?: Record<string, unknown>;
}

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
      entity_type,
      entity_ids,
      event_types,
      sort = 'new',
      limit = 50,
      offset = 0,
    } = params;

    try {
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);
      if (status) queryParams.append('status', status);
      if (entity_type) queryParams.append('entity_type', entity_type);
      if (entity_ids && entity_ids.length > 0) {
        queryParams.append('entity_ids', entity_ids.join(','));
      }
      if (event_types && event_types.length > 0) {
        queryParams.append('event_types', event_types.join(','));
      }
      queryParams.append('sort', sort);
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const response = await apiRequest<InboxListResponse>(
        `/inbox`,
        { method: 'GET' }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки уведомлений';
      return rejectWithValue(errorMessage);
    }
  }
);

export const bulkInboxActionThunk = createAsyncThunk(
  'inboxEvents/bulkAction',
  async (params: BulkActionParams, { rejectWithValue }) => {
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

      return { ...response, params };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка выполнения действия';
      return rejectWithValue(errorMessage);
    }
  }
);

export const specificInboxActionThunk = createAsyncThunk(
  'inboxEvents/specificAction',
  async (params: SpecificActionParams, { rejectWithValue }) => {
    const { eventId, action_type, payload } = params;

    try {
      const result = await apiRequest<SpecificActionResult>(
        `/inbox/${eventId}/action`,
        {
          method: 'POST',
          body: JSON.stringify({ action_type, payload }),
        }
      );

      return { ...result, eventId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка выполнения действия';
      return rejectWithValue(errorMessage);
    }
  }
);
