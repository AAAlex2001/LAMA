import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import {
  setFloodEnabled,
  setFloodSettings,
  setAutoDeleteEnabled,
  initAutoDeleteSettings,
  setMediaBlockTypes,
  setCommandsEnabled,
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

interface AutoDeleteSettings {
  id: number;
  channel_id: number;
  delete_system_messages: boolean;
  delete_command_messages: boolean;
  delete_join_messages: boolean;
  delete_all_messages: boolean;
  delete_text_only: boolean;
  delete_media_only: boolean;
  delete_delay_seconds: number;
  created_at: string;
  updated_at: string;
}

interface MediaBlockResponse {
  block_media_types: string[] | null;
}

interface QuickCommandsResponse {
  commands_enabled: boolean;
  enabled_commands: string[] | null;
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
                flood_action: floodSettings.flood_action || 'MUTE',
                flood_mute_duration_minutes: (floodSettings.flood_action || 'MUTE') === 'MUTE' ? (totalMinutes || 1) : null,
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

export const fetchAutoDeleteThunk = createAsyncThunk(
  'moderation/fetchAutoDelete',
  async (channelId: number, { dispatch }) => {
    try {
      const data = await apiRequest<AutoDeleteSettings>(`/channels/${channelId}/auto-delete`);
      dispatch(initAutoDeleteSettings({
        delete_system_messages: data.delete_system_messages,
        delete_command_messages: data.delete_command_messages,
        delete_join_messages: data.delete_join_messages,
        delete_all_messages: data.delete_all_messages,
        delete_text_only: data.delete_text_only,
        delete_media_only: data.delete_media_only,
        delete_delay_seconds: data.delete_delay_seconds,
      }));
      return data;
    } catch {
      return null;
    }
  },
);

export const updateAutoDeleteThunk = createAsyncThunk(
  'moderation/updateAutoDelete',
  async (
    { channelId }: { channelId: number },
    { dispatch, getState, rejectWithValue },
  ) => {
    const state = getState() as ChannelsPageState;
    const {
      autoDeleteSystemMessages, autoDeleteCommandMessages,
      autoDeleteJoinMessages, autoDeleteAllMessages,
      autoDeleteTextOnly, autoDeleteMediaOnly, autoDeleteDelaySeconds,
    } = state.moderation;

    dispatch(setSaving(true));
    try {
      const data = await apiRequest<AutoDeleteSettings>(`/channels/${channelId}/auto-delete`, {
        method: 'PUT',
        body: JSON.stringify({
          delete_system_messages: autoDeleteSystemMessages,
          delete_command_messages: autoDeleteCommandMessages,
          delete_join_messages: autoDeleteJoinMessages,
          delete_all_messages: autoDeleteAllMessages,
          delete_text_only: autoDeleteTextOnly,
          delete_media_only: autoDeleteMediaOnly,
          delete_delay_seconds: autoDeleteDelaySeconds,
        }),
      });
      dispatch(initAutoDeleteSettings({
        delete_system_messages: data.delete_system_messages,
        delete_command_messages: data.delete_command_messages,
        delete_join_messages: data.delete_join_messages,
        delete_all_messages: data.delete_all_messages,
        delete_text_only: data.delete_text_only,
        delete_media_only: data.delete_media_only,
        delete_delay_seconds: data.delete_delay_seconds,
      }));
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

export const fetchMediaBlockThunk = createAsyncThunk(
  'moderation/fetchMediaBlock',
  async (channelId: number, { dispatch }) => {
    try {
      const data = await apiRequest<MediaBlockResponse>(`/channels/${channelId}/media-block`);
      dispatch(setMediaBlockTypes(data.block_media_types ?? []));
      return data;
    } catch {
      return null;
    }
  },
);

export const updateMediaBlockThunk = createAsyncThunk(
  'moderation/updateMediaBlock',
  async ({ channelId }: { channelId: number }, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as ChannelsPageState;
    const { mediaBlockTypes } = state.moderation;

    dispatch(setSaving(true));
    try {
      const data = await apiRequest<MediaBlockResponse>(`/channels/${channelId}/media-block`, {
        method: 'PUT',
        body: JSON.stringify({
          block_media_types: mediaBlockTypes.length > 0 ? mediaBlockTypes : null,
        }),
      });
      dispatch(setMediaBlockTypes(data.block_media_types ?? []));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const fetchQuickCommandsThunk = createAsyncThunk(
  'moderation/fetchQuickCommands',
  async (channelId: number, { dispatch }) => {
    try {
      const data = await apiRequest<QuickCommandsResponse>(`/channels/${channelId}/quick-commands`);
      dispatch(setCommandsEnabled(data.commands_enabled));
      return data;
    } catch {
      return null;
    }
  },
);

export const updateQuickCommandsThunk = createAsyncThunk(
  'moderation/updateQuickCommands',
  async ({ channelId }: { channelId: number }, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as ChannelsPageState;
    const { commandsEnabled, selectedCommands } = state.moderation;

    dispatch(setSaving(true));
    try {
      const data = await apiRequest<QuickCommandsResponse>(`/channels/${channelId}/quick-commands`, {
        method: 'PUT',
        body: JSON.stringify({
          commands_enabled: commandsEnabled,
          enabled_commands: commandsEnabled ? selectedCommands : null,
        }),
      });
      dispatch(setCommandsEnabled(data.commands_enabled));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
