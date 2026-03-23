import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { initFromResponse, setSaving } from '../slices/antispam';
import type { ChannelsPageState } from '../index';

interface AntispamResponse {
  link_filter_mode: 'DISABLED' | 'BLOCK_ALL' | 'ALLOW_TME_ONLY' | 'WHITELIST' | 'BLACKLIST';
  link_whitelist: string[] | null;
  link_blacklist: string[] | null;
  link_filter_action: 'DELETE' | 'MUTE' | 'KICK';
  link_filter_mute_duration: number | null;
}

export const fetchAntispamThunk = createAsyncThunk(
  'antispam/fetch',
  async (channelId: number, { dispatch }) => {
    try {
      const data = await apiRequest<AntispamResponse>(`/channels/${channelId}/antispam`);
      dispatch(initFromResponse(data));
      return data;
    } catch {
      return null;
    }
  },
);

export const updateAntispamThunk = createAsyncThunk(
  'antispam/update',
  async ({ channelId }: { channelId: number }, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as ChannelsPageState;
    const { mode, whitelist, blacklist, action, muteDays, muteHours, muteMinutes } = state.antispam;
    const totalMinutes = muteDays * 1440 + muteHours * 60 + muteMinutes;

    dispatch(setSaving(true));
    try {
      const data = await apiRequest<AntispamResponse>(`/channels/${channelId}/antispam`, {
        method: 'PUT',
        body: JSON.stringify({
          link_filter_mode: mode,
          link_whitelist: whitelist.length > 0 ? whitelist : null,
          link_blacklist: blacklist.length > 0 ? blacklist : null,
          link_filter_action: action,
          link_filter_mute_duration: action === 'MUTE' ? totalMinutes || 1 : null,
        }),
      });
      dispatch(initFromResponse(data));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
