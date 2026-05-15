import { apiRequest, API_BASE_URL, getAuthToken } from '@/store/api';
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

export type ExportDataKey = 'general_income' | 'general_expense' | 'ads_income' | 'ads_expense';
export type ExportScope = 'filtered' | 'all';
export type ExportFormat = 'xlsx' | 'csv';

export interface ExportAdRevenuesParams {
  dataTypes: ExportDataKey[];
  scope: ExportScope;
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
  channelId?: number;
  botId?: number;
  currency?: string;
}

export async function exportAdRevenues(params: ExportAdRevenuesParams): Promise<Blob> {
  const qs = new URLSearchParams({
    data_types: params.dataTypes.join(','),
    scope: params.scope,
    format: params.format,
  });
  if (params.scope === 'filtered') {
    if (params.dateFrom) qs.set('date_from', params.dateFrom);
    if (params.dateTo) qs.set('date_to', params.dateTo);
    if (params.channelId !== undefined) qs.set('channel_id', String(params.channelId));
    if (params.botId !== undefined) qs.set('bot_id', String(params.botId));
    if (params.currency) qs.set('currency', params.currency);
  }
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/ad-revenues/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail || 'Ошибка экспорта');
  }
  return res.blob();
}

const BACKEND_SORT_KEYS = new Set([
  'date', 'price', 'type', 'comments', 'views', 'clicks', 'reactions',
]);

function buildQuery(filters: AdRevenueListFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.channel_id !== undefined) params.set('channel_id', String(filters.channel_id));
  if (filters.bot_id !== undefined) params.set('bot_id', String(filters.bot_id));
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  if (filters.sort_by && BACKEND_SORT_KEYS.has(filters.sort_by)) {
    params.set('sort_by', filters.sort_by);
  }
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

