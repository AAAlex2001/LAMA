import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { setSaving } from '../slices/nightMode';
import type { ChannelsPageState } from '../index';

interface NightModeResponse {
  night_mode_enabled: boolean;
  night_mode_start: string | null;
  night_mode_end: string | null;
  night_mode_block_media: boolean;
  night_mode_block_text: boolean;
}

export const updateNightModeThunk = createAsyncThunk(
  'nightMode/update',
  async ({ channelId }: { channelId: number }, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as ChannelsPageState;
    const { enabled, start, end, blockMedia, blockText } = state.nightMode;

    dispatch(setSaving(true));
    try {
      const data = await apiRequest<NightModeResponse>(`/channels/${channelId}/night-mode`, {
        method: 'PUT',
        body: JSON.stringify({
          night_mode_enabled: enabled,
          night_mode_start: start || null,
          night_mode_end: end || null,
          night_mode_block_media: blockMedia,
          night_mode_block_text: blockText,
        }),
      });
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
