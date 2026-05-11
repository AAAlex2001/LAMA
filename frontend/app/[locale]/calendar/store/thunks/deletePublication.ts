import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { invalidatePublications } from '@/store/publications/queries';
import { removeItem } from '../slices/calendar';
import { fetchCalendarData } from './fetchCalendarData';
import type { RootState, AppDispatch } from '../index';

export const deletePublication = createAsyncThunk<
  void,
  { id: number; deleteFromChannel?: boolean },
  { state: RootState; dispatch: AppDispatch }
>(
  'calendar/deletePublication',
  async ({ id, deleteFromChannel }, { dispatch }) => {
    const params = new URLSearchParams();
    if (deleteFromChannel) params.set('delete_from_channel', 'true');
    const qs = params.toString();
    await apiRequest(`/publications/${id}${qs ? `?${qs}` : ''}`, { method: 'DELETE' });
    dispatch(removeItem(id));
    invalidatePublications();
    dispatch(fetchCalendarData());
  },
);

export const deleteSeries = createAsyncThunk<
  void,
  { seriesId: number },
  { state: RootState; dispatch: AppDispatch }
>(
  'calendar/deleteSeries',
  async ({ seriesId }, { dispatch }) => {
    await apiRequest(`/publications/series/${seriesId}`, { method: 'DELETE' });
    invalidatePublications();
    dispatch(fetchCalendarData());
  },
);

export const deleteRepeatPublication = createAsyncThunk<
  void,
  { id: number; mode: 'this' | 'this_and_following'; repeatDate?: string },
  { state: RootState; dispatch: AppDispatch }
>(
  'calendar/deleteRepeatPublication',
  async ({ id, mode, repeatDate }, { dispatch }) => {
    const params = new URLSearchParams({ repeat_mode: mode });
    if (repeatDate) {
      params.set('repeat_date', repeatDate);
    }
    await apiRequest(`/publications/${id}?${params}`, { method: 'DELETE' });
    invalidatePublications();
    dispatch(fetchCalendarData());
  },
);
