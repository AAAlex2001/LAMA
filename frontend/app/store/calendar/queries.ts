import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type { BotMessageCompact, Draft, DraftListResponse } from '@/types/post';
import { apiRequest } from '@/store/api';
import { invalidatePublications } from '@/store/publications/queries';
import { groupSeriesPosts } from '@/store/publications/groupSeries';
import {
  parseDate,
  getRangeForView,
  getVisibleDayKeys,
  mergeUniqueById,
} from '@/[locale]/calendar/utils/calendar-helpers';
import type { CalendarView } from '@/[locale]/calendar/store/slices/calendar';

const PER_DAY = 50;
const LIST_PAGE_SIZE = 30;

interface WeekBatchDay {
  items: Draft[];
  has_more: boolean;
  bot_messages?: BotMessageCompact[];
  total?: number;
}

interface WeekBatchResponse {
  days: Record<string, WeekBatchDay>;
}

export type GridDayResult = {
  dateKey: string;
  items: Draft[];
  hasMore: boolean;
  total: number;
  page: number;
};

export type CalendarGridData = {
  type: 'grid';
  merge?: boolean;
  results: GridDayResult[];
};

export type CalendarListData = {
  type: 'list';
  items: Draft[];
  hasMore: boolean;
  total: number;
  page: number;
};

export type CalendarData = CalendarGridData | CalendarListData;

export interface CalendarQueryParams {
  view: CalendarView;
  selectedDate: string;
  sidebarDate: string;
  listRangeStart: string | null;
  listRangeEnd: string | null;
  listSortOrder: 'asc' | 'desc' | null;
  listStatusFilter: string | null;
}

export const calendarKeys = {
  all: ['calendar'] as const,
  data: (params: CalendarQueryParams): QueryKey => [
    'calendar',
    params.view,
    params.selectedDate,
    params.sidebarDate,
    params.listRangeStart,
    params.listRangeEnd,
    params.listSortOrder,
    params.listStatusFilter,
  ],
};

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

async function fetchMonth(params: CalendarQueryParams, tz: string): Promise<CalendarGridData> {
  const dayKey = params.sidebarDate;
  const qs = new URLSearchParams({
    start_date: `${dayKey}T00:00:00`,
    end_date: `${dayKey}T23:59:59`,
    per_day: String(PER_DAY),
    tz,
  });
  const res = await apiRequest<WeekBatchResponse>(`/publications/week-batch/?${qs}`);
  const day = res.days[dayKey];
  const pubItems = day?.items ?? [];
  const botItems = (day?.bot_messages ?? []).map(botMessageToDraft);
  const grouped = groupSeriesPosts(pubItems);
  const total = day?.total ?? (grouped.length + botItems.length);
  return {
    type: 'grid',
    merge: true,
    results: [
      { dateKey: dayKey, items: [...grouped, ...botItems], hasMore: day?.has_more ?? false, total, page: 1 },
    ],
  };
}

async function fetchWeek(params: CalendarQueryParams, tz: string): Promise<CalendarGridData> {
  const date = parseDate(params.selectedDate);
  const keys = getVisibleDayKeys('week', date);
  const range = getRangeForView('week', date);
  const qs = new URLSearchParams({
    start_date: `${range.startDate}T00:00:00`,
    end_date: `${range.endDate}T23:59:59`,
    per_day: String(PER_DAY),
    tz,
  });
  const res = await apiRequest<WeekBatchResponse>(`/publications/week-batch/?${qs}`);

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
      page: 1,
    };
  });
  return { type: 'grid', results };
}

type DayCountItem = { date: string; count: number };

function getCountsTotal(res: { counts: Record<string, number> | DayCountItem[] }): number {
  if (Array.isArray(res.counts)) {
    return res.counts.reduce((sum, item) => sum + (item?.count || 0), 0);
  }
  return Object.values(res.counts || {}).reduce((sum, n) => sum + (n || 0), 0);
}

async function fetchList(params: CalendarQueryParams, tz: string): Promise<CalendarListData> {
  const date = parseDate(params.selectedDate);
  let startDate: string;
  let endDate: string;
  if (params.view === 'list' && params.listRangeStart && params.listRangeEnd) {
    startDate = params.listRangeStart;
    endDate = params.listRangeEnd;
  } else {
    const range = getRangeForView(params.view, date);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  const qs = new URLSearchParams({
    page: '1',
    page_size: String(LIST_PAGE_SIZE),
    start_date: `${startDate}T00:00:00`,
    end_date: `${endDate}T23:59:59`,
    sort_order: params.listSortOrder ?? 'desc',
    tz,
  });
  if (params.view === 'list' && params.listStatusFilter) {
    qs.set('status', params.listStatusFilter);
  }

  const res = await apiRequest<DraftListResponse>(`/publications/?${qs}`);
  const countsRes = await apiRequest<{ counts: Record<string, number> | DayCountItem[] }>(
    `/publications/day-counts?start_date=${startDate}T00:00:00&end_date=${endDate}T23:59:59&tz=${encodeURIComponent(tz)}`,
  );

  const botItems = (res.bot_messages ?? []).map(botMessageToDraft);
  const grouped = groupSeriesPosts(res.items);
  const allItems = params.view === 'list' ? grouped : [...grouped, ...botItems];

  return {
    type: 'list',
    items: allItems,
    hasMore: res.items.length >= LIST_PAGE_SIZE,
    total: getCountsTotal(countsRes),
    page: 1,
  };
}

export function useCalendarDataQuery(params: CalendarQueryParams) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useQuery<CalendarData>({
    queryKey: calendarKeys.data(params),
    queryFn: () => {
      if (params.view === 'month') return fetchMonth(params, tz);
      if (params.view === 'week') return fetchWeek(params, tz);
      return fetchList(params, tz);
    },
    staleTime: 30 * 1000,
  });
}

export interface FetchMoreDayArgs {
  queryKey: QueryKey;
  dateKey: string;
  currentItems: Draft[];
  currentPage: number;
}

export interface FetchMoreDayResult {
  dateKey: string;
  items: Draft[];
  page: number;
  hasMore: boolean;
}

export function useFetchMoreDayPostsMutation() {
  const qc = useQueryClient();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useMutation<FetchMoreDayResult, Error, FetchMoreDayArgs>({
    mutationFn: async ({ dateKey, currentItems, currentPage }) => {
      const nextPage = currentPage + 1;
      const qs = new URLSearchParams({
        page: String(nextPage),
        page_size: String(PER_DAY),
        start_date: `${dateKey}T00:00:00`,
        end_date: `${dateKey}T23:59:59`,
        tz,
      });
      const res = await apiRequest<DraftListResponse>(`/publications/?${qs}`);
      const grouped = groupSeriesPosts(res.items);
      const merged = mergeUniqueById(currentItems, grouped);
      const gotFullPage = res.items.length >= PER_DAY;
      const gotNewItems = merged.length > currentItems.length;
      return { dateKey, items: merged, page: nextPage, hasMore: gotFullPage && gotNewItems };
    },
    onSuccess: (result, { queryKey }) => {
      qc.setQueryData<CalendarData>(queryKey, (prev) => {
        if (!prev || prev.type !== 'grid') return prev;
        const results = prev.results.map((r) =>
          r.dateKey === result.dateKey
            ? { ...r, items: result.items, hasMore: result.hasMore, page: result.page }
            : r,
        );
        return { ...prev, results };
      });
    },
  });
}

export interface FetchMoreListArgs {
  queryKey: QueryKey;
  currentItems: Draft[];
  currentPage: number;
  view: CalendarView;
  selectedDate: string;
  listRangeStart: string | null;
  listRangeEnd: string | null;
  listSortOrder: 'asc' | 'desc' | null;
  listStatusFilter: string | null;
}

export interface FetchMoreListResult {
  items: Draft[];
  page: number;
  hasMore: boolean;
}

export function useFetchMoreListPostsMutation() {
  const qc = useQueryClient();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useMutation<FetchMoreListResult, Error, FetchMoreListArgs>({
    mutationFn: async ({
      currentItems, currentPage, view, selectedDate,
      listRangeStart, listRangeEnd, listSortOrder, listStatusFilter,
    }) => {
      const date = parseDate(selectedDate);
      let startDate: string;
      let endDate: string;
      if (view === 'list' && listRangeStart && listRangeEnd) {
        startDate = listRangeStart;
        endDate = listRangeEnd;
      } else {
        const r = getRangeForView(view, date);
        startDate = r.startDate;
        endDate = r.endDate;
      }

      const nextPage = currentPage + 1;
      const qs = new URLSearchParams({
        page: String(nextPage),
        page_size: String(LIST_PAGE_SIZE),
        start_date: `${startDate}T00:00:00`,
        end_date: `${endDate}T23:59:59`,
        tz,
      });
      if (view === 'list') {
        if (listSortOrder) qs.set('sort_order', listSortOrder);
        if (listStatusFilter) qs.set('status', listStatusFilter);
      }

      const res = await apiRequest<DraftListResponse>(`/publications/?${qs}`);
      const grouped = groupSeriesPosts(res.items);
      const merged = mergeUniqueById(currentItems, grouped);
      const gotFullPage = res.items.length >= LIST_PAGE_SIZE;
      const gotNewItems = merged.length > currentItems.length;
      return { items: merged, page: nextPage, hasMore: gotFullPage && gotNewItems };
    },
    onSuccess: (result, { queryKey }) => {
      qc.setQueryData<CalendarData>(queryKey, (prev) => {
        if (!prev || prev.type !== 'list') return prev;
        const reachedTotal = prev.total > 0 && result.items.length >= prev.total;
        return {
          ...prev,
          items: result.items,
          page: result.page,
          hasMore: result.hasMore && !reachedTotal,
        };
      });
    },
  });
}

function invalidateCalendar(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: calendarKeys.all });
}

export interface DeletePublicationArgs {
  id: number;
  deleteFromChannel?: boolean;
}

export function useDeletePublicationMutation() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeletePublicationArgs>({
    mutationFn: async ({ id, deleteFromChannel }) => {
      const params = new URLSearchParams();
      if (deleteFromChannel) params.set('delete_from_channel', 'true');
      const qs = params.toString();
      await apiRequest(`/publications/${id}${qs ? `?${qs}` : ''}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      invalidateCalendar(qc);
      invalidatePublications(qc);
    },
  });
}

export interface DeleteSeriesArgs {
  seriesId: number;
}

export function useDeleteSeriesMutation() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteSeriesArgs>({
    mutationFn: async ({ seriesId }) => {
      await apiRequest(`/publications/series/${seriesId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      invalidateCalendar(qc);
      invalidatePublications(qc);
    },
  });
}

export interface DeleteRepeatPublicationArgs {
  id: number;
  mode: 'this' | 'this_and_following';
  repeatDate?: string;
}

export function useDeleteRepeatPublicationMutation() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteRepeatPublicationArgs>({
    mutationFn: async ({ id, mode, repeatDate }) => {
      const params = new URLSearchParams({ repeat_mode: mode });
      if (repeatDate) params.set('repeat_date', repeatDate);
      await apiRequest(`/publications/${id}?${params}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      invalidateCalendar(qc);
      invalidatePublications(qc);
    },
  });
}
