import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { BotMessageCompact, Draft, DraftListResponse, PublicationStatus } from '@/types/post';
import { API_BASE_URL, apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

const DEFAULT_PAGE_SIZE = 30;

export interface PublicationListFilters {
  status?: PublicationStatus;
  tagIds?: number[];
  channelId?: number;
  seriesId?: number;
  sortOrder?: 'asc' | 'desc';
  dateMode?: 'updated' | 'scheduled';
  search?: string;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  tz?: string;
}

export const publicationsKeys = {
  all: ['publications'] as const,
  lists: () => [...publicationsKeys.all, 'list'] as const,
  list: (filters: PublicationListFilters) => [...publicationsKeys.lists(), filters] as const,
  details: () => [...publicationsKeys.all, 'detail'] as const,
  detail: (id: number) => [...publicationsKeys.details(), id] as const,
  weekBatch: (startDate: string, endDate: string) =>
    [...publicationsKeys.all, 'week-batch', startDate, endDate] as const,
  dayCounts: (startDate: string, endDate: string) =>
    [...publicationsKeys.all, 'day-counts', startDate, endDate] as const,
  dayPosts: (dateKey: string) => [...publicationsKeys.all, 'day', dateKey] as const,
};

function buildListUrl(filters: PublicationListFilters, page: number): string {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(filters.pageSize ?? DEFAULT_PAGE_SIZE),
  });
  if (filters.status) params.set('status', filters.status);
  if (filters.sortOrder) params.set('sort_order', filters.sortOrder);
  if (filters.dateMode) params.set('date_mode', filters.dateMode);
  if (filters.search) params.set('search', filters.search);
  if (filters.channelId !== undefined) params.set('channel_id', String(filters.channelId));
  if (filters.seriesId !== undefined) params.set('series_id', String(filters.seriesId));
  filters.tagIds?.forEach((id) => params.append('tag_ids', String(id)));
  if (filters.startDate) params.set('start_date', `${filters.startDate}T00:00:00`);
  if (filters.endDate) params.set('end_date', `${filters.endDate}T23:59:59`);
  if (filters.tz) params.set('tz', filters.tz);
  return `/publications?${params}`;
}

export function usePublicationsListQuery(filters: PublicationListFilters | null) {
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: filters ? publicationsKeys.list(filters) : ['publications', 'list', null],
    queryFn: ({ pageParam }) => apiRequest<DraftListResponse>(buildListUrl(filters as PublicationListFilters, pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.items.length >= pageSize ? pages.length + 1 : undefined,
    enabled: !!filters,
    staleTime: 30 * 1000,
  });
}

export function usePublicationByIdQuery(id: number | null) {
  return useQuery({
    queryKey: id ? publicationsKeys.detail(id) : publicationsKeys.details(),
    queryFn: () => apiRequest<Draft>(`/publications/${id}`),
    enabled: id !== null,
    staleTime: 30 * 1000,
  });
}

export function useDeletePublicationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<number> => {
      await apiRequest(`/publications/${id}`, { method: 'DELETE' });
      return id;
    },
    onSuccess: () => invalidatePublications(qc),
  });
}

export function invalidatePublications(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: publicationsKeys.all });
}

export function invalidatePublication(id: number, qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: publicationsKeys.detail(id) });
}

// === Calendar: week-batch ================================================

interface WeekBatchDay {
  items: Draft[];
  has_more: boolean;
  bot_messages?: BotMessageCompact[];
  total?: number;
}

export interface WeekBatchResponse {
  days: Record<string, WeekBatchDay>;
}

export interface WeekBatchParams {
  startDate: string;
  endDate: string;
  perDay?: number;
  tz?: string;
}

export function useWeekBatchQuery(params: WeekBatchParams | null) {
  return useQuery({
    queryKey: params
      ? publicationsKeys.weekBatch(params.startDate, params.endDate)
      : ['publications', 'week-batch', null],
    queryFn: () => {
      const p = params as WeekBatchParams;
      const qs = new URLSearchParams({
        start_date: `${p.startDate}T00:00:00`,
        end_date: `${p.endDate}T23:59:59`,
        per_day: String(p.perDay ?? 50),
      });
      if (p.tz) qs.set('tz', p.tz);
      return apiRequest<WeekBatchResponse>(`/publications/week-batch/?${qs}`);
    },
    enabled: !!params,
    staleTime: 30 * 1000,
  });
}

// === Calendar: day-counts ================================================

export interface DayCountItem {
  date: string;
  count: number;
  published?: number;
  scheduled?: number;
  draft?: number;
  bot_messages?: number;
  ads?: number;
}

export interface DayCountsResponse {
  counts: Record<string, number> | DayCountItem[];
}

export interface DayCountsParams {
  startDate: string;
  endDate: string;
  tz?: string;
}

export function useDayCountsQuery(params: DayCountsParams | null) {
  return useQuery({
    queryKey: params
      ? publicationsKeys.dayCounts(params.startDate, params.endDate)
      : ['publications', 'day-counts', null],
    queryFn: () => {
      const p = params as DayCountsParams;
      const qs = new URLSearchParams({
        start_date: `${p.startDate}T00:00:00`,
        end_date: `${p.endDate}T23:59:59`,
      });
      if (p.tz) qs.set('tz', p.tz);
      return apiRequest<DayCountsResponse>(`/publications/day-counts?${qs}`);
    },
    enabled: !!params,
    staleTime: 30 * 1000,
  });
}

// === Calendar: day posts (infinite by single date) =======================

export function useDayPostsInfiniteQuery(dateKey: string | null, pageSize = 20, tz?: string) {
  return useInfiniteQuery({
    queryKey: dateKey ? publicationsKeys.dayPosts(dateKey) : ['publications', 'day', null],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        page_size: String(pageSize),
        start_date: `${dateKey}T00:00:00`,
        end_date: `${dateKey}T23:59:59`,
      });
      if (tz) params.set('tz', tz);
      return apiRequest<DraftListResponse>(`/publications/?${params}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.items.length >= pageSize ? pages.length + 1 : undefined,
    enabled: !!dateKey,
    staleTime: 30 * 1000,
  });
}

// === Shared draft (по публичному share-токену) ===========================

/** GET без auth — публичный endpoint, токен в URL. */
async function fetchSharedDraft(token: string): Promise<Draft> {
  const res = await fetch(`${API_BASE_URL}/publications/shared/${token}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'Ссылка недействительна' : 'Не удалось загрузить черновик');
  return res.json();
}

export function useSharedDraftQuery(token: string | null) {
  return useQuery({
    queryKey: ['publications', 'shared', token],
    queryFn: () => fetchSharedDraft(token as string),
    enabled: !!token,
    retry: false,
    staleTime: 60 * 1000,
  });
}

function pickContentType(draft: Draft): string {
  if (draft.content_type) return draft.content_type;
  if (draft.poll_data?.question) return draft.poll_data.is_quiz ? 'quiz' : 'poll';
  if (draft.media_urls && draft.media_urls.length > 0) return 'media';
  return 'text';
}

function buildSharedSavePayload(draft: Draft) {
  return {
    content_type: pickContentType(draft),
    text_content: draft.text_content,
    formatted_content: draft.formatted_content,
    media_urls: draft.media_urls || [],
    media_thumbnail_urls: draft.media_thumbnail_urls || [],
    media_file_ids: draft.media_file_ids || [],
    media_blur: draft.media_blur || [],
    inline_keyboard: draft.inline_keyboard,
    poll_data: draft.poll_data,
    pin_message: draft.pin_message ?? false,
    disable_notification: draft.disable_notification ?? false,
    disable_web_page_preview: draft.disable_web_page_preview ?? false,
    scheduled_time: null,
    timezone: draft.timezone,
    channel_ids: [] as number[],
    tag_names: (draft.tags || []).map((t) => t.name),
    tag_colors: (draft.tags || []).map((t) => t.color),
  };
}

export function useSaveSharedDraftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, token }: { draft: Draft; token: string }): Promise<{ id: number }> => {
      const created = await apiRequest<{ id: number }>('/publications', {
        method: 'POST',
        body: JSON.stringify(buildSharedSavePayload(draft)),
      });
      // consume share token — fire-and-forget, не критично если упадёт
      fetch(`${API_BASE_URL}/publications/shared/${token}/consume`, { method: 'POST' }).catch(() => {});
      return created;
    },
    onSuccess: () => invalidatePublications(qc),
  });
}

interface ShareLinkResponse {
  share_token: string;
}

export function useShareDraftLinkMutation() {
  return useMutation({
    mutationFn: (draftId: number) =>
      apiRequest<ShareLinkResponse>(`/publications/${draftId}/share`, { method: 'POST' }),
  });
}
