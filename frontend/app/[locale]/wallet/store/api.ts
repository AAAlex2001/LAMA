import { apiRequest } from '@/store/api';
import {
  AdRevenue,
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

function buildQuery(filters: AdRevenueListFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.channel_id !== undefined) params.set('channel_id', String(filters.channel_id));
  if (filters.bot_id !== undefined) params.set('bot_id', String(filters.bot_id));
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_dir) params.set('sort_dir', filters.sort_dir);
  if (filters.status) params.set('status', filters.status);
  if (filters.currency) params.set('currency', filters.currency);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchAdRevenues(filters: AdRevenueListFilters = {}): Promise<AdRevenueListResponse> {
  return apiRequest<AdRevenueListResponse>(`/ad-revenues/${buildQuery(filters)}`);
}

export function fetchAdRevenueStats(filters: Omit<AdRevenueListFilters, 'limit' | 'offset' | 'type'> = {}): Promise<AdRevenueStats> {
  return apiRequest<AdRevenueStats>(`/ad-revenues/stats${buildQuery(filters)}`);
}

export function fetchCommunityStats(filters: CommunityStatsFilters = {}): Promise<CommunityStatsResponse> {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.currency) params.set('currency', filters.currency);
  if (filters.kind) params.set('kind', filters.kind);
  const qs = params.toString();
  return apiRequest<CommunityStatsResponse>(`/ad-revenues/communities${qs ? `?${qs}` : ''}`);
}

export function fetchMonthlyAdStats(filters: MonthlyAdStatsFilters = {}): Promise<MonthlyAdStatsResponse> {
  const params = new URLSearchParams();
  if (filters.year !== undefined) params.set('year', String(filters.year));
  if (filters.currency) params.set('currency', filters.currency);
  if (filters.channel_id !== undefined) params.set('channel_id', String(filters.channel_id));
  const qs = params.toString();
  return apiRequest<MonthlyAdStatsResponse>(`/ad-revenues/monthly${qs ? `?${qs}` : ''}`);
}

export function createAdRevenue(payload: AdRevenueCreatePayload): Promise<AdRevenue> {
  return apiRequest<AdRevenue>('/ad-revenues/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdRevenue(id: number, payload: AdRevenueUpdatePayload): Promise<AdRevenue> {
  return apiRequest<AdRevenue>(`/ad-revenues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdRevenue(id: number): Promise<void> {
  return apiRequest<void>(`/ad-revenues/${id}`, { method: 'DELETE' });
}

