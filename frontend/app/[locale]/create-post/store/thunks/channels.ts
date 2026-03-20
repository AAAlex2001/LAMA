import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Channel, ChannelsResponse, SyncChannelRequest, SyncChannelResponse } from '../types';
import { apiRequest } from './api';
import { 
  setChannels, 
  addChannel as addChannelAction,
  removeChannel as removeChannelAction,
  setLoading, 
  setSyncing,
  setError,
  setTotal 
} from '../slices/channels';

const MASTER_BOT_TOKEN = '8308599165:AAGZ3NgOQE34lZ8EwTPB_8HPH_fsqpfffUw';

function parseChannelInput(input: string): SyncChannelRequest {
  const trimmed = input.trim();
  const base = { token: MASTER_BOT_TOKEN };
  
  if (/^-?\d+$/.test(trimmed)) {
    return { ...base, telegram_id: parseInt(trimmed, 10) };
  }
  
  if (trimmed.includes('t.me/')) {
    return { ...base, invite_link: trimmed };
  }
  
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return { ...base, username };
}

export const fetchChannelsThunk = createAsyncThunk(
  'channels/fetchChannels',
  async (params: { page?: number; pageSize?: number; force?: boolean } = {}, { getState, dispatch, rejectWithValue }) => {
    const { page = 1, pageSize = 50, force = false } = params;
    const state = getState() as { channels: { channels: Channel[]; loading: boolean } };
    
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
      
      const channelsWithSelection = (response.items || []).map((ch: Channel) => ({
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

export const addChannelThunk = createAsyncThunk(
  'channels/addChannel',
  async (input: string, { dispatch, rejectWithValue }) => {
    if (!input.trim()) {
      return rejectWithValue('Введите ссылку, username или ID канала');
    }
    
    dispatch(setSyncing(true));
    dispatch(setError(null));
    
    try {
      const syncData = parseChannelInput(input);
      
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
