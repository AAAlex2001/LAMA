'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';
import type { BotMessageCompact, Draft, DraftListResponse } from '@/types/post';
import {
  createAdRevenue,
  deleteAdRevenue,
  fetchAdRevenues,
  fetchAdRevenueStats,
  fetchCommunityStats,
  fetchMonthlyAdStats,
  updateAdRevenue,
} from './api';
import type {
  AdRevenueCreatePayload,
  AdRevenueListFilters,
  AdRevenueListResponse,
  AdRevenueStats,
  AdRevenueUpdatePayload,
  CommunityStatsFilters,
  CommunityStatsResponse,
  MonthlyAdStatsFilters,
  MonthlyAdStatsResponse,
} from './types';

// ============================================================
// Query keys
// ============================================================

export const walletKeys = {
  all: ['wallet'] as const,
  revenues: (filters: AdRevenueListFilters) => ['wallet', 'revenues', filters] as const,
  stats: (filters: Omit<AdRevenueListFilters, 'limit' | 'offset' | 'type'>) =>
    ['wallet', 'stats', filters] as const,
  communities: (filters: CommunityStatsFilters) =>
    ['wallet', 'communities', filters] as const,
  monthly: (filters: MonthlyAdStatsFilters) =>
    ['wallet', 'monthly', filters] as const,
  dayCounts: (monthKey: string) => ['wallet', 'day-counts', monthKey] as const,
  dayBatch: (dateKey: string, isAd: boolean, status: string) =>
    ['wallet', 'day-batch', dateKey, isAd, status] as const,
  drafts: (search: string) => ['wallet', 'drafts', search] as const,
};

// ============================================================
// AdRevenue: list, stats, mutations
// ============================================================

export function useAdRevenuesQuery(
  filters: AdRevenueListFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<AdRevenueListResponse>({
    queryKey: walletKeys.revenues(filters),
    queryFn: () => fetchAdRevenues(filters),
    staleTime: 30 * 1000,
    enabled: options.enabled ?? true,
  });
}

export function useAdRevenueStatsQuery(
  filters: Omit<AdRevenueListFilters, 'limit' | 'offset' | 'type'> = {},
) {
  return useQuery<AdRevenueStats>({
    queryKey: walletKeys.stats(filters),
    queryFn: () => fetchAdRevenueStats(filters),
    staleTime: 30 * 1000,
  });
}

export function useCommunityStatsQuery(
  filters: CommunityStatsFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<CommunityStatsResponse>({
    queryKey: walletKeys.communities(filters),
    queryFn: () => fetchCommunityStats(filters),
    staleTime: 30 * 1000,
    enabled: options.enabled ?? true,
  });
}

export function useMonthlyAdStatsQuery(
  filters: MonthlyAdStatsFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<MonthlyAdStatsResponse>({
    queryKey: walletKeys.monthly(filters),
    queryFn: () => fetchMonthlyAdStats(filters),
    staleTime: 30 * 1000,
    enabled: options.enabled ?? true,
  });
}

function invalidateRevenues(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['wallet', 'revenues'] });
  qc.invalidateQueries({ queryKey: ['wallet', 'stats'] });
  qc.invalidateQueries({ queryKey: ['wallet', 'communities'] });
  qc.invalidateQueries({ queryKey: ['wallet', 'monthly'] });
}

export function useAddAdRevenueMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdRevenueCreatePayload) => createAdRevenue(payload),
    onSuccess: () => invalidateRevenues(qc),
  });
}

export function useUpdateAdRevenueMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdRevenueUpdatePayload }) =>
      updateAdRevenue(id, payload),
    onSuccess: () => invalidateRevenues(qc),
  });
}

export function useDeleteAdRevenueMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAdRevenue(id),
    onSuccess: () => invalidateRevenues(qc),
  });
}

// ============================================================
// Publications: day-counts (calendar dots) + day batch (single day)
// ============================================================

const pad = (n: number) => String(n).padStart(2, '0');
const formatDateOnly = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

interface DayCount {
  date: string;
  count: number;
  published?: number;
  scheduled?: number;
  draft?: number;
  ads?: number;
  bot_messages?: number;
}
interface DayCountsResponse {
  counts: DayCount[];
}

export interface DayCountsBuckets {
  total: Record<string, number>;
  ads: Record<string, number>;
}

export function useDayCountsQuery(monthStart: Date) {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const monthKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}`;

  return useQuery<DayCountsBuckets>({
    queryKey: walletKeys.dayCounts(monthKey),
    queryFn: async () => {
      const qs = new URLSearchParams({
        start_date: `${formatDateOnly(start)}T00:00:00`,
        end_date: `${formatDateOnly(end)}T23:59:59`,
        tz: getTz(),
      });
      const res = await apiRequest<DayCountsResponse>(`/publications/day-counts?${qs}`);
      const buckets: DayCountsBuckets = { total: {}, ads: {} };
      for (const dc of res.counts ?? []) {
        buckets.total[dc.date] = dc.count;
        if (dc.ads) buckets.ads[dc.date] = dc.ads;
      }
      return buckets;
    },
    staleTime: 60 * 1000,
  });
}

interface WeekBatchDay {
  items: Draft[];
  has_more: boolean;
  bot_messages?: BotMessageCompact[];
  total?: number;
}
interface WeekBatchResponse {
  days: Record<string, WeekBatchDay>;
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

export function useDayBatchQuery(
  date: Date | null,
  options: { isAd?: boolean; status?: 'scheduled' | 'published' | null } = {},
) {
  const { isAd = false, status = null } = options;
  const dateKey = date ? formatDateOnly(date) : '';

  return useQuery<Draft[]>({
    queryKey: walletKeys.dayBatch(dateKey, isAd, status ?? 'all'),
    enabled: !!date,
    queryFn: async () => {
      const qs = new URLSearchParams({
        start_date: `${dateKey}T00:00:00`,
        end_date: `${dateKey}T23:59:59`,
        per_day: '50',
        tz: getTz(),
      });
      if (isAd) qs.set('is_ad', 'true');
      if (status) qs.set('status', status);
      const res = await apiRequest<WeekBatchResponse>(`/publications/week-batch/?${qs}`);
      const day = res.days?.[dateKey];
      const items = day?.items ?? [];
      const botItems = isAd ? [] : (day?.bot_messages ?? []).map(botMessageToDraft);
      return [...items, ...botItems];
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================
// Drafts: one-shot fetch (count is small, filter client-side)
// ============================================================

export function useDraftsListQuery(search = '') {
  const trimmed = search.trim();
  return useQuery<Draft[]>({
    queryKey: walletKeys.drafts(trimmed),
    queryFn: async () => {
      const qs = new URLSearchParams({
        status: 'draft',
        page: '1',
        page_size: '50',
        tz: getTz(),
      });
      if (trimmed) qs.set('search', trimmed);
      const res = await apiRequest<DraftListResponse>(`/publications/?${qs}`);
      return res.items ?? [];
    },
    staleTime: 30 * 1000,
  });
}
