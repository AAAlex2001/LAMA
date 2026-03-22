import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import {
  setFloodEnabled,
  setFloodSettings,
  setAutoDeleteEnabled,
  setSaving,
  setError,
} from '../slices/moderation';
import type { ChannelsPageState } from '../index';

interface FloodSettings {
  flood_message_limit: number | null;
  flood_interval_seconds: number | null;
  flood_action: string | null;
  flood_mute_duration_minutes: number | null;
}

export const fetchFloodSettingsThunk = createAsyncThunk(
  'moderation/fetchFlood',
  async (channelId: number, { dispatch }) => {
    try {
      const data = await apiRequest<FloodSettings>(`/channels/${channelId}/flood`);
      dispatch(setFloodSettings(data));
      dispatch(setFloodEnabled(!!data.flood_message_limit));
      return data;
    } catch {
      return null;
    }
  },
);

export const updateFloodSettingsThunk = createAsyncThunk(
  'moderation/updateFlood',
  async (
    { channelId }: { channelId: number },
    { dispatch, getState, rejectWithValue },
  ) => {
    const state = getState() as ChannelsPageState;
    const { muteDays, muteHours, muteMinutes, floodSettings, floodEnabled } = state.moderation;
    const totalMinutes = muteDays * 1440 + muteHours * 60 + muteMinutes;

    dispatch(setSaving(true));
    dispatch(setError(null));
    try {
      const data = await apiRequest<FloodSettings>(`/channels/${channelId}/flood`, {
        method: 'PUT',
        body: JSON.stringify(
          floodEnabled
            ? {
                flood_message_limit: floodSettings.flood_message_limit || 5,
                flood_interval_seconds: floodSettings.flood_interval_seconds || 10,
                flood_action: 'MUTE',
                flood_mute_duration_minutes: totalMinutes || 1,
              }
            : {
                flood_message_limit: null,
                flood_interval_seconds: null,
                flood_mute_duration_minutes: null,
              },
        ),
      });
      dispatch(setFloodSettings(data));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const disableFloodThunk = createAsyncThunk(
  'moderation/disableFlood',
  async (channelId: number, { dispatch, rejectWithValue }) => {
    dispatch(setFloodEnabled(false));
    dispatch(setSaving(true));
    try {
      const data = await apiRequest<FloodSettings>(`/channels/${channelId}/flood`, {
        method: 'PUT',
        body: JSON.stringify({
          flood_message_limit: null,
          flood_interval_seconds: null,
          flood_mute_duration_minutes: null,
        }),
      });
      dispatch(setFloodSettings(data));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const updateAutoDeleteThunk = createAsyncThunk(
  'moderation/updateAutoDelete',
  async (
    { channelId, enabled }: { channelId: number; enabled: boolean },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setAutoDeleteEnabled(enabled));
    dispatch(setSaving(true));
    try {
      await apiRequest(`/channels/${channelId}/auto-delete`, {
        method: 'PUT',
        body: JSON.stringify({
          delete_system_messages: enabled,
          delete_command_messages: enabled,
        }),
      });
      return enabled;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
