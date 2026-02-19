import { createAsyncThunk } from '@reduxjs/toolkit';
import type { DraftListResponse, Draft } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { RootState } from '..';
import { parseDate, getRangeForView, mergeUniqueById } from '../../utils/calendar-helpers';

/** Пагинация для day/list вида — дозагрузка постов */
export const fetchMoreListPosts = createAsyncThunk<
  { items: Draft[]; page: number; hasMore: boolean }, void, { state: RootState }
>(
  'calendar/fetchMoreList',
  async (_, { getState }) => {
    const s = getState().calendar;
    const date = parseDate(s.selectedDate);

    let startDate: string, endDate: string;
    if (s.currentView === 'list' && s.listRangeStart && s.listRangeEnd) {
      startDate = s.listRangeStart; endDate = s.listRangeEnd;
    } else {
      const r = getRangeForView(s.currentView, date);
      startDate = r.startDate; endDate = r.endDate;
    }

    const nextPage = s.currentPage + 1;
    const params = new URLSearchParams({
      page: String(nextPage), page_size: '30',
      start_date: `${startDate}T00:00:00`, end_date: `${endDate}T23:59:59`,
    });
    if (s.currentView === 'list') {
      if (s.listSortOrder) params.set('sort_order', s.listSortOrder);
      if (s.listStatusFilter) params.set('status', s.listStatusFilter);
    }

    const res = await apiRequest<DraftListResponse>(`/publications?${params}`);
    const merged = mergeUniqueById(s.items, res.items);
    return { items: merged, page: nextPage, hasMore: merged.length > s.items.length && res.items.length > 0 };
  },
  {
    condition: (_, { getState }) => {
      const s = getState().calendar;
      if (s.currentView === 'week' || s.currentView === 'month') return false;
      return !s.isLoading && !s.isLoadingMore && s.hasMore;
    },
  },
);

/** Пагинация одной колонки-дня в grid-виде */
export const fetchMoreDayPosts = createAsyncThunk<
  { dateKey: string; items: Draft[]; page: number; hasMore: boolean }, string, { state: RootState }
>(
  'calendar/fetchMoreDay',
  async (dateKey, { getState }) => {
    const s = getState().calendar;
    const dayState = s.dayPageState[dateKey];
    if (!dayState) throw new Error(`No day state for ${dateKey}`);

    const nextPage = dayState.page + 1;
    const params = new URLSearchParams({
      page: String(nextPage), page_size: '20',
      start_date: `${dateKey}T00:00:00`, end_date: `${dateKey}T23:59:59`,
    });

    const res = await apiRequest<DraftListResponse>(`/publications?${params}`);
    const current = s.weekItems[dateKey] || [];
    const merged = mergeUniqueById(current, res.items);
    return { dateKey, items: merged, page: nextPage, hasMore: merged.length > current.length && res.items.length > 0 };
  },
  {
    condition: (dateKey, { getState }) => {
      const ds = getState().calendar.dayPageState[dateKey];
      return !!ds && !ds.isLoading && ds.hasMore;
    },
  },
);
