import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import { updateChannel } from '@/app/[locale]/create-post/store/slices/channels';
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
