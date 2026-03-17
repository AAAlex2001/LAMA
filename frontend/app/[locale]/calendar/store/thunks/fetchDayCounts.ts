import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { RootState } from '..';
import type { DayStatusCount } from '../slices/calendar';
import { parseDate, formatDateOnly } from '../../utils/calendar-helpers';

type DayCountItem = {
  date: string;
  count: number;
  published?: number;
  scheduled?: number;
  draft?: number;
};

type DayCountsResult = {
  monthKey: string;
  anchor: string;
  counts: Record<string, number>;
  statusCounts: Record<string, DayStatusCount>;
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

    const counts: Record<string, number> = {};
    const statusCounts: Record<string, DayStatusCount> = {};

    if (Array.isArray(res.counts)) {
      for (const item of res.counts) {
        if (item?.date) {
          counts[item.date] = item.count || 0;
          statusCounts[item.date] = {
            published: item.published ?? 0,
            scheduled: item.scheduled ?? 0,
            draft: item.draft ?? 0,
          };
        }
      }
    } else {
      Object.assign(counts, res.counts);
    }

    return { monthKey, anchor: anchorKey, counts, statusCounts };
  },
);
