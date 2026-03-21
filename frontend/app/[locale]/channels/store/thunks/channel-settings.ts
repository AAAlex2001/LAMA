import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest, API_BASE_URL, getAuthToken } from '@/store/api';
import { updateChannel } from '@/store/channels';
import type { Channel } from '@/types/channel';

interface UpdateChannelTelegramParams {
  channelId: number;
  title?: string;
  description?: string;
}

export const updateChannelTelegramThunk = createAsyncThunk(
  'channels/updateChannelTelegram',
  async ({ channelId, ...data }: UpdateChannelTelegramParams, { dispatch, rejectWithValue }) => {
    try {
      const updated = await apiRequest<Channel>(`/channels/${channelId}/telegram-settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      dispatch(updateChannel({ ...updated, selected: true } as any));
      return updated;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления канала';
      return rejectWithValue(msg);
    }
  }
);

export const uploadChannelPhotoThunk = createAsyncThunk(
  'channels/uploadChannelPhoto',
  async ({ channelId, file }: { channelId: number; file: File }, { dispatch, rejectWithValue }) => {
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_BASE_URL}/channels/${channelId}/telegram-photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Ошибка загрузки фото');
      }

      const updated: Channel = await response.json();
      dispatch(updateChannel({ ...updated, selected: true } as any));
      return updated;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки фото';
      return rejectWithValue(msg);
    }
  }
);

export const deleteChannelPhotoThunk = createAsyncThunk(
  'channels/deleteChannelPhoto',
  async (channelId: number, { dispatch, rejectWithValue }) => {
    try {
      const updated = await apiRequest<Channel>(`/channels/${channelId}/telegram-photo`, {
        method: 'DELETE',
      });
      dispatch(updateChannel({ ...updated, selected: true } as any));
      return updated;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка удаления фото';
      return rejectWithValue(msg);
    }
  }
);
