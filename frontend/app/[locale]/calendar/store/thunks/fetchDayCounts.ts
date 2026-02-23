import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { RootState } from '..';
import { parseDate, formatDateOnly } from '../../utils/calendar-helpers';

type DayCountItem = {
  date: string;
  count: number;
};

type DayCountsResult = {
  monthKey: string;
  anchor: string;
  counts: Record<string, number>;
};

export const fetchDayCounts = createAsyncThunk<DayCountsResult, void, { state: RootState }>(
  'calendar/fetchDayCounts',
  async (_, { getState }) => {
    const calendar = getState().calendar;
    const anchor = parseDate(calendar.countsMonthAnchor);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const monthKey = calendar.countsMonthAnchor.slice(0, 7);
    const anchorKey = calendar.countsMonthAnchor;

    const params = new URLSearchParams({
      start_date: `${formatDateOnly(new Date(year, month, 1))}T00:00:00`,
      end_date: `${formatDateOnly(new Date(year, month + 1, 0))}T23:59:59`,
    });

    const res = await apiRequest<{ counts: Record<string, number> | DayCountItem[] }>(
      `/publications/day-counts?${params}`,
    );
    if (Array.isArray(res.counts)) {
      const counts = res.counts.reduce<Record<string, number>>((acc, item) => {
        if (item?.date) {
          acc[item.date] = item.count || 0;
        }
        return acc;
      }, {});
      return { monthKey, anchor: anchorKey, counts };
    }

    return { monthKey, anchor: anchorKey, counts: res.counts };
  },
);
