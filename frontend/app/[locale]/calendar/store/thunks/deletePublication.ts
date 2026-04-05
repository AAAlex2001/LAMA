import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { removeItem } from '../slices/calendar';
import { fetchCalendarData } from './fetchCalendarData';

export const deletePublication = createAsyncThunk<
  void,
  { id: number; deleteFromChannel?: boolean }
>(
  'calendar/deletePublication',
  async ({ id, deleteFromChannel }, { dispatch }) => {
    const params = new URLSearchParams();
    if (deleteFromChannel) params.set('delete_from_channel', 'true');
    const qs = params.toString();
    await apiRequest(`/publications/${id}${qs ? `?${qs}` : ''}`, { method: 'DELETE' });
    dispatch(removeItem(id));
  },
);

export const deleteRepeatPublication = createAsyncThunk<
  void,
  { id: number; mode: 'this' | 'this_and_following'; repeatDate?: string }
>(
  'calendar/deleteRepeatPublication',
  async ({ id, mode, repeatDate }, { dispatch }) => {
    const params = new URLSearchParams({ repeat_mode: mode });
    if (repeatDate) {
      params.set('repeat_date', repeatDate);
    }
    await apiRequest(`/publications/${id}?${params}`, { method: 'DELETE' });
    dispatch(fetchCalendarData());
  },
);
