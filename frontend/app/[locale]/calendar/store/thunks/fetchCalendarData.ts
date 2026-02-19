import { createAsyncThunk } from '@reduxjs/toolkit';
import type { DraftListResponse, Draft } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { RootState } from '..';
import { parseDate, getRangeForView, getVisibleDayKeys } from '../../utils/calendar-helpers';

type GridDayResult = { dateKey: string; items: Draft[]; hasMore: boolean };

type FetchDataResult =
  | { type: 'grid'; keys: string[]; results: GridDayResult[] }
  | { type: 'list'; items: Draft[]; hasMore: boolean; rangeKey: string };

/** Основной фетч: вызывается при смене вида / даты / фильтров */
export const fetchCalendarData = createAsyncThunk<FetchDataResult, void, { state: RootState }>(
  'calendar/fetchData',
  async (_, { getState }) => {
    const s = getState().calendar;
    const date = parseDate(s.selectedDate);
    const view = s.currentView;

    if (view === 'week' || view === 'month') {
      const keys = getVisibleDayKeys(view, date);
      const results = await Promise.all(
        keys.map(async (dateKey): Promise<GridDayResult> => {
          const params = new URLSearchParams({
            page: '1', page_size: '20',
            start_date: `${dateKey}T00:00:00`, end_date: `${dateKey}T23:59:59`,
          });
          const res = await apiRequest<DraftListResponse>(`/publications?${params}`);
          return { dateKey, items: res.items, hasMore: res.items.length > 0 };
        }),
      );
      return { type: 'grid', keys, results };
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

    const params = new URLSearchParams({
      page: '1', page_size: '30',
      start_date: `${startDate}T00:00:00`, end_date: `${endDate}T23:59:59`,
    });
    if (view === 'list') {
      if (s.listSortOrder) params.set('sort_order', s.listSortOrder);
      if (s.listStatusFilter) params.set('status', s.listStatusFilter);
    }

    const res = await apiRequest<DraftListResponse>(`/publications?${params}`);
    const rangeKey = view === 'list' && s.listRangeStart && s.listRangeEnd
      ? `${s.listRangeStart}_${s.listRangeEnd}`
      : getRangeForView(view, date).key;

    return { type: 'list', items: res.items, hasMore: res.items.length > 0, rangeKey };
  },
);
