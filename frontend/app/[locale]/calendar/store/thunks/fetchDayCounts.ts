import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { RootState } from '..';
import { parseDate, formatDateOnly } from '../../utils/calendar-helpers';

/** Количество постов за каждый день месяца (для виджета-датапикера) */
export const fetchDayCounts = createAsyncThunk<Record<string, number>, void, { state: RootState }>(
  'calendar/fetchDayCounts',
  async (_, { getState }) => {
    const anchor = parseDate(getState().calendar.countsMonthAnchor);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();

    const params = new URLSearchParams({
      start_date: `${formatDateOnly(new Date(year, month, 1))}T00:00:00`,
      end_date: `${formatDateOnly(new Date(year, month + 1, 0))}T23:59:59`,
    });

    const res = await apiRequest<{ counts: Record<string, number> }>(
      `/publications/day-counts?${params}`,
    );
    return res.counts;
  },
);
