import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Draft, DraftListResponse } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import { setItems, setWeekItems, setIsLoading, removeItem } from './index';

function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Format date as ISO datetime string for API (start of day) */
function toStartOfDayISO(dateStr: string): string {
  return `${dateStr}T00:00:00`;
}

/** Format date as ISO datetime string for API (end of day) */
function toEndOfDayISO(dateStr: string): string {
  return `${dateStr}T23:59:59`;
}

/** Group posts by date key (YYYY-MM-DD) based on scheduled_time / created_at */
function groupPostsByDate(posts: Draft[]): Record<string, Draft[]> {
  const result: Record<string, Draft[]> = {};
  for (const post of posts) {
    const timeStr = (post as any).scheduled_time || post.updated_at || post.created_at;
    const d = new Date(timeStr);
    const key = formatDate(d);
    if (!result[key]) result[key] = [];
    result[key].push(post);
  }
  return result;
}

export const fetchCalendarPosts = createAsyncThunk(
  'calendar/fetchPosts',
  async (params: { date: string }, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        page_size: '30',
        start_date: toStartOfDayISO(params.date),
        end_date: toEndOfDayISO(params.date),
      });
      const response = await apiRequest<DraftListResponse>(
        `/publications?${queryParams}`
      );
      dispatch(setItems(response.items));
      return response.items;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchWeeklyPosts = createAsyncThunk(
  'calendar/fetchWeeklyPosts',
  async (params: { date: string }, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const weekStart = getWeekStart(params.date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startDateStr = formatDate(weekStart);
      const endDateStr = formatDate(weekEnd);

      const queryParams = new URLSearchParams({
        page: '1',
        page_size: '20',
        start_date: toStartOfDayISO(startDateStr),
        end_date: toEndOfDayISO(endDateStr),
      });

      const response = await apiRequest<DraftListResponse>(
        `/publications?${queryParams}`
      );

      const grouped = groupPostsByDate(response.items);
      const weekItems: Record<string, Draft[]> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const key = formatDate(d);
        weekItems[key] = grouped[key] || [];
      }

      dispatch(setWeekItems(weekItems));
      return weekItems;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchMonthlyPosts = createAsyncThunk(
  'calendar/fetchMonthlyPosts',
  async (params: { date: string }, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const baseDate = new Date(params.date + 'T00:00:00');
      const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

      const startDateStr = formatDate(monthStart);
      const endDateStr = formatDate(monthEnd);

      const allItems: Draft[] = [];
      let page = 1;
      const pageSize = 20;

      while (true) {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          start_date: toStartOfDayISO(startDateStr),
          end_date: toEndOfDayISO(endDateStr),
        });

        const response = await apiRequest<DraftListResponse>(
          `/publications?${queryParams}`
        );

        allItems.push(...response.items);

        if (response.items.length < pageSize) {
          break;
        }
        page += 1;
      }

      const grouped = groupPostsByDate(allItems);
      const monthItems: Record<string, Draft[]> = {};

      const daysInMonth = monthEnd.getDate();
      for (let i = 0; i < daysInMonth; i++) {
        const d = new Date(monthStart);
        d.setDate(monthStart.getDate() + i);
        const key = formatDate(d);
        monthItems[key] = grouped[key] || [];
      }

      dispatch(setWeekItems(monthItems));
      dispatch(setItems(allItems));
      return monthItems;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchListPosts = createAsyncThunk(
  'calendar/fetchListPosts',
  async (params: { date: string }, { dispatch, rejectWithValue }) => {
    dispatch(setIsLoading(true));
    try {
      const baseDate = new Date(params.date + 'T00:00:00');
      const year = baseDate.getFullYear();

      const startDateStr = `${year}-01-01`;
      const endDateStr = `${year}-12-31`;

      const allItems: Draft[] = [];
      let page = 1;
      const pageSize = 30;

      while (true) {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          start_date: toStartOfDayISO(startDateStr),
          end_date: toEndOfDayISO(endDateStr),
        });

        const response = await apiRequest<DraftListResponse>(
          `/publications?${queryParams}`
        );

        allItems.push(...response.items);

        if (response.items.length < pageSize) {
          break;
        }
        page += 1;
      }

      dispatch(setItems(allItems));
      dispatch(setWeekItems({}));
      return allItems;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const deleteCalendarPost = createAsyncThunk(
  'calendar/deletePost',
  async (postId: number, { dispatch, rejectWithValue }) => {
    dispatch(removeItem(postId));
    try {
      await apiRequest(`/publications/${postId}`, { method: 'DELETE' });
      return postId;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  }
);
