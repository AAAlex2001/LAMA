import { createAsyncThunk } from '@reduxjs/toolkit';
import type { DraftListResponse, Draft, BotMessageCompact } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { RootState } from '..';
import { parseDate, getRangeForView, getVisibleDayKeys } from '../../utils/calendar-helpers';

interface WeekBatchDay {
  items: Draft[];
  has_more: boolean;
  bot_messages?: BotMessageCompact[];
}

interface WeekBatchResponse {
  days: Record<string, WeekBatchDay>;
}

type GridDayResult = { dateKey: string; items: Draft[]; hasMore: boolean };

type CalendarRequestMeta = {
  view: RootState['calendar']['currentView'];
  selectedDate: string;
  sidebarDate: string;
  listRangeStart: string | null;
  listRangeEnd: string | null;
  listSortOrder: RootState['calendar']['listSortOrder'];
  listStatusFilter: string | null;
};

type FetchDataResult =
  | { type: 'grid'; merge?: boolean; keys: string[]; results: GridDayResult[]; request: CalendarRequestMeta }
  | { type: 'list'; items: Draft[]; hasMore: boolean; rangeKey: string; request: CalendarRequestMeta };

function botMessageToDraft(msg: BotMessageCompact): Draft {
  return {
    id: -msg.id,
    content_type: msg.media_url ? 'text_with_media' : 'text',
    status: 'published',
    text_content: msg.text_content || msg.name,
    media_urls: msg.media_url ? [msg.media_url] : undefined,
    created_at: msg.sent_at,
    updated_at: msg.sent_at,
    scheduled_time: msg.sent_at,
    channels: [],
    tags: [],
    is_bot_message: true,
    bot_username: msg.bot_username,
    bot_total_chats: msg.total_chats,
    bot_success_chats: msg.success_chats,
  };
}

export const fetchCalendarData = createAsyncThunk<FetchDataResult, void, { state: RootState }>(
  'calendar/fetchData',
  async (_, { getState }) => {
    const s = getState().calendar;
    const date = parseDate(s.selectedDate);
    const view = s.currentView;
    const request: CalendarRequestMeta = {
      view,
      selectedDate: s.selectedDate,
      sidebarDate: s.sidebarDate,
      listRangeStart: s.listRangeStart,
      listRangeEnd: s.listRangeEnd,
      listSortOrder: s.listSortOrder,
      listStatusFilter: s.listStatusFilter,
    };

    if (view === 'month') {
      const dayKey = s.sidebarDate;
      const pageSize = 20;
      const params = new URLSearchParams({
        page: '1', page_size: String(pageSize),
        start_date: `${dayKey}T00:00:00`, end_date: `${dayKey}T23:59:59`,
        sort_order: 'asc',
      });
      const res = await apiRequest<DraftListResponse>(`/publications/?${params}`);
      const allItems = [
        ...res.items,
        ...(res.bot_messages ?? []).map(botMessageToDraft),
      ];
      const results: GridDayResult[] = [
        { dateKey: dayKey, items: allItems, hasMore: res.items.length === pageSize },
      ];
      return { type: 'grid', merge: true, keys: [dayKey], results, request };
    }

    if (view === 'week') {
      const keys = getVisibleDayKeys(view, date);
      const range = getRangeForView(view, date);
      const params = new URLSearchParams({
        start_date: `${range.startDate}T00:00:00`,
        end_date: `${range.endDate}T23:59:59`,
        per_day: '20',
      });
      const res = await apiRequest<WeekBatchResponse>(`/publications/week-batch/?${params}`);
      const results: GridDayResult[] = keys.map((dateKey) => {
        const day = res.days[dateKey];
        const pubItems = day?.items ?? [];
        const botItems = (day?.bot_messages ?? []).map(botMessageToDraft);
        return {
          dateKey,
          items: [...pubItems, ...botItems],
          hasMore: day?.has_more ?? false,
        };
      });
      return { type: 'grid', keys, results, request };
    }

    let startDate: string, endDate: string;
    if (view === 'list' && s.listRangeStart && s.listRangeEnd) {
      startDate = s.listRangeStart;
      endDate = s.listRangeEnd;
    } else {
      const range = getRangeForView(view, date);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const pageSize = 30;
    const params = new URLSearchParams({
      page: '1', page_size: String(pageSize),
      start_date: `${startDate}T00:00:00`, end_date: `${endDate}T23:59:59`,
    });
    if (view === 'list') {
      if (s.listSortOrder) params.set('sort_order', s.listSortOrder);
      if (s.listStatusFilter) params.set('status', s.listStatusFilter);
    }

    const res = await apiRequest<DraftListResponse>(`/publications/?${params}`);
    const rangeKey = view === 'list' && s.listRangeStart && s.listRangeEnd
      ? `${s.listRangeStart}_${s.listRangeEnd}`
      : getRangeForView(view, date).key;

    const allItems = [
      ...res.items,
      ...(res.bot_messages ?? []).map(botMessageToDraft),
    ];

    return { type: 'list', items: allItems, hasMore: res.items.length === pageSize, rangeKey, request };
  },
);
