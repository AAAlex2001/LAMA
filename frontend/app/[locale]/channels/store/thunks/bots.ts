import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { updateChannel } from '@/store/channels';
import { setBot, setBotLoading, setBotToggling, setBotError, clearBot, BotData } from '../slices/bots';
import type { Channel } from '@/types/channel';

export const fetchChannelBotThunk = createAsyncThunk(
  'bots/fetchChannelBot',
  async (botId: number, { dispatch, rejectWithValue }) => {
    dispatch(setBotLoading(true));
    dispatch(setBotError(null));

    try {
      const data = await apiRequest<BotData>(`/bots/${botId}`, { method: 'GET' });
      dispatch(setBot(data));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки бота';
      dispatch(setBotError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setBotLoading(false));
    }
  }
);

export const toggleBotActiveThunk = createAsyncThunk(
  'bots/toggleBotActive',
  async (channel: Channel, { dispatch, rejectWithValue }) => {
    dispatch(setBotToggling(true));

    try {
      const newActive = !channel.is_bot_active;
      const updated = await apiRequest<Channel>(`/channels/${channel.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_bot_active: newActive }),
      });
      dispatch(updateChannel({ ...updated, selected: true } as any));
      return updated.is_bot_active;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка переключения бота';
      return rejectWithValue(msg);
    } finally {
      dispatch(setBotToggling(false));
    }
  }
);

export const removeBotThunk = createAsyncThunk(
  'bots/removeBot',
  async (channel: Channel, { dispatch, rejectWithValue }) => {
    dispatch(setBotToggling(true));

    try {
      const updated = await apiRequest<Channel>(`/channels/${channel.id}`, {
        method: 'PUT',
        body: JSON.stringify({ clear_bot: true }),
      });
      dispatch(updateChannel({ ...updated, selected: true } as any));
      dispatch(clearBot());
      return updated;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка удаления бота';
      return rejectWithValue(msg);
    } finally {
      dispatch(setBotToggling(false));
    }
  }
);
