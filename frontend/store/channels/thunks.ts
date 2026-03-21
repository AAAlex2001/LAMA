import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ChannelBasic, ChannelsResponse, SyncChannelRequest, SyncChannelResponse } from '@/types';
import { apiRequest } from '@/store/api';
import {
  setChannels,
  addChannel as addChannelAction,
  updateChannel as updateChannelAction,
  removeChannel as removeChannelAction,
  setLoading,
  setSyncing,
  setError,
  setTotal
} from './slice';

function parseChannelInput(input: string): Omit<SyncChannelRequest, 'token' | 'bot_id'> {
  const trimmed = input.trim();

  if (/^-?\d+$/.test(trimmed)) {
    return { telegram_id: parseInt(trimmed, 10) };
  }

  if (trimmed.includes('t.me/')) {
    return { invite_link: trimmed };
  }

  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return { username };
}

export const fetchChannelsThunk = createAsyncThunk(
  'channels/fetchChannels',
  async (params: { page?: number; pageSize?: number; force?: boolean } = {}, { getState, dispatch, rejectWithValue }) => {
    const { page = 1, pageSize = 50, force = false } = params;
    const state = getState() as { channels: { channels: ChannelBasic[]; loading: boolean } };

    if (state.channels.loading) return;
    if (!force && state.channels.channels.length > 0) return;

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });

      const response = await apiRequest<ChannelsResponse>(
        `/channels?${queryParams}`,
        { method: 'GET' }
      );

      const channelsWithSelection = (response.items || []).map((ch: ChannelBasic) => ({
        ...ch,
        selected: true,
      }));

      dispatch(setChannels(channelsWithSelection));
      dispatch(setTotal(response.total || 0));
      return channelsWithSelection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки каналов';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export interface AddChannelParams {
  input: string;
  botId?: number;
  token?: string;
}

export const addChannelThunk = createAsyncThunk(
  'channels/addChannel',
  async (params: string | AddChannelParams, { getState, dispatch, rejectWithValue }) => {
    const { input, botId, token } = typeof params === 'string'
      ? { input: params, botId: undefined, token: undefined }
      : params;

    if (!input.trim()) {
      return rejectWithValue('Введите ссылку, username или ID канала');
    }

    dispatch(setSyncing(true));
    dispatch(setError(null));

    try {
      const channelData = parseChannelInput(input);
      const syncData: SyncChannelRequest = {
        ...channelData,
        ...(botId ? { bot_id: botId } : token ? { token } : {}),
      };

      const response = await apiRequest<SyncChannelResponse>(
        '/channels/sync',
        {
          method: 'POST',
          body: JSON.stringify(syncData),
        }
      );

      if (!response.success || !response.channel) {
        const errorMessage = response.message || 'Не удалось подключить канал';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }

      const channelWithSelection = { ...response.channel, selected: true };

      const state = getState() as { channels: { channels: ChannelBasic[] } };
      const exists = state.channels.channels.some(
        (ch) => ch.id === response.channel!.id,
      );

      if (exists) {
        dispatch(updateChannelAction(channelWithSelection));
        return rejectWithValue('Этот канал уже подключён');
      }

      dispatch(addChannelAction(channelWithSelection));
      return channelWithSelection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка подключения канала';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setSyncing(false));
    }
  }
);

export const refreshChannelsThunk = createAsyncThunk(
  'channels/refreshChannels',
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(setSyncing(true));
    dispatch(setError(null));

    try {
      const response = await apiRequest<ChannelsResponse>(
        '/channels?force_refresh=true',
        { method: 'GET' },
      );

      const channelsWithSelection = (response.items || []).map((ch: ChannelBasic) => ({
        ...ch,
        selected: true,
      }));

      dispatch(setChannels(channelsWithSelection));
      dispatch(setTotal(response.total || 0));
      return channelsWithSelection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления каналов';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setSyncing(false));
    }
  },
);

export const deleteChannelThunk = createAsyncThunk(
  'channels/deleteChannel',
  async (channelId: number, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));

    try {
      await apiRequest(
        `/channels/${channelId}`,
        { method: 'DELETE' }
      );

      dispatch(removeChannelAction(channelId));
      return channelId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления канала';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);
