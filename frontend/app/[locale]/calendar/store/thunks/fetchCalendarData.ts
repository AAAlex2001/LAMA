import { createAsyncThunk } from '@reduxjs/toolkit';
import type { DraftListResponse, Draft, BotMessageCompact } from '@/types/post';
import { apiRequest } from '@/store/api';
import type { RootState } from '..';
import { parseDate, getRangeForView, getVisibleDayKeys } from '../../utils/calendar-helpers';
import { groupSeriesPosts } from '../../utils/groupSeries';

interface WeekBatchDay {
  items: Draft[];
  has_more: boolean;
  bot_messages?: BotMessageCompact[];
  total?: number;
}

interface WeekBatchResponse {
  days: Record<string, WeekBatchDay>;
}

type GridDayResult = { dateKey: string; items: Draft[]; hasMore: boolean; total: number };

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
  | { type: 'list'; items: Draft[]; hasMore: boolean; total: number; rangeKey: string; request: CalendarRequestMeta };

type DayCountItem = {
  date: string;
  count: number;
};

function getCountsTotal(res: { counts: Record<string, number> | DayCountItem[] }): number {
  if (Array.isArray(res.counts)) {
    return res.counts.reduce((sum, item) => sum + (item?.count || 0), 0);
  }
  return Object.values(res.counts || {}).reduce((sum, n) => sum + (n || 0), 0);
}

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

    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (view === 'month') {
      const dayKey = s.sidebarDate;
      const params = new URLSearchParams({
        start_date: `${dayKey}T00:00:00`,
        end_date: `${dayKey}T23:59:59`,
        per_day: '50',
        tz: userTz,
      });
      const res = await apiRequest<WeekBatchResponse>(`/publications/week-batch/?${params}`);
      const day = res.days[dayKey];
      const pubItems = day?.items ?? [];
      const botItems = (day?.bot_messages ?? []).map(botMessageToDraft);
      const grouped = groupSeriesPosts(pubItems);
      const total = day?.total ?? (grouped.length + botItems.length);
      const results: GridDayResult[] = [
        { dateKey: dayKey, items: [...grouped, ...botItems], hasMore: day?.has_more ?? false, total },
      ];
      return { type: 'grid', merge: true, keys: [dayKey], results, request };
    }

    if (view === 'week') {
      const keys = getVisibleDayKeys(view, date);
      const range = getRangeForView(view, date);
      const params = new URLSearchParams({
        start_date: `${range.startDate}T00:00:00`,
        end_date: `${range.endDate}T23:59:59`,
        per_day: '50',
        tz: userTz,
      });
      const res = await apiRequest<WeekBatchResponse>(`/publications/week-batch/?${params}`);

      const seriesCounts = new Map<number, number>();
      for (const dateKey of keys) {
        const day = res.days[dateKey];
        for (const item of day?.items ?? []) {
          if (item.series_id) {
            seriesCounts.set(item.series_id, (seriesCounts.get(item.series_id) ?? 0) + 1);
          }
        }
      }

      const results: GridDayResult[] = keys.map((dateKey) => {
        const day = res.days[dateKey];
        const pubItems = day?.items ?? [];
        const botItems = (day?.bot_messages ?? []).map(botMessageToDraft);
        const grouped = groupSeriesPosts(pubItems);
        for (const item of grouped) {
          if (item.series_id && seriesCounts.has(item.series_id)) {
            item.series_count = seriesCounts.get(item.series_id);
          }
        }
        const total = day?.total ?? (grouped.length + botItems.length);
        return {
          dateKey,
          items: [...grouped, ...botItems],
          hasMore: day?.has_more ?? false,
          total,
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
      sort_order: s.listSortOrder ?? 'desc',
      tz: userTz,
    });
    if (view === 'list') {
      if (s.listStatusFilter) params.set('status', s.listStatusFilter);
    }

    const res = await apiRequest<DraftListResponse>(`/publications/?${params}`);
    const countsRes = await apiRequest<{ counts: Record<string, number> | DayCountItem[] }>(
      `/publications/day-counts?start_date=${startDate}T00:00:00&end_date=${endDate}T23:59:59&tz=${encodeURIComponent(userTz)}`,
    );
    const rangeKey = view === 'list' && s.listRangeStart && s.listRangeEnd
      ? `${s.listRangeStart}_${s.listRangeEnd}`
      : getRangeForView(view, date).key;

    const botItems = (res.bot_messages ?? []).map(botMessageToDraft);
    const grouped = groupSeriesPosts(res.items);
    const allItems = view === 'list'
      ? grouped
      : [...grouped, ...botItems];

    const total = getCountsTotal(countsRes);

    return { type: 'list', items: allItems, hasMore: res.items.length >= pageSize, total, rangeKey, request };
  },
);
