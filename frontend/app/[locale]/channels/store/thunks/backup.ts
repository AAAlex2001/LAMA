import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { updateChannel } from '@/store/channels';
import {
  setCopyEnabled,
  toggleTarget,
  togglePostType,
  toggleContentType,
  setSaving,
  setError,
} from '../slices/backup';
import type { Channel, BackupMode } from '@/types/channel';
import type { ChannelsPageState } from '../index';

interface BackupModePayload {
  backup_mode: BackupMode;
  backup_target_ids: number[] | null;
  backup_post_types: string[] | null;
  backup_content_types: string[] | null;
  backup_ai_prompt: string | null;
}

const buildPayload = (state: ChannelsPageState): BackupModePayload => {
  const { backup } = state;
  return {
    backup_mode: backup.copyEnabled ? 'INSTANT' : 'DISABLED',
    backup_target_ids: backup.selectedTargets.length > 0 ? backup.selectedTargets : null,
    backup_post_types: backup.postTypes.length > 0 ? backup.postTypes : null,
    backup_content_types: backup.contentTypes.length > 0 ? backup.contentTypes : null,
    backup_ai_prompt: backup.aiPrompt || null,
  };
};

const sendBackupUpdate = async (
  channelId: number,
  payload: BackupModePayload,
  dispatch: any,
) => {
  dispatch(setSaving(true));
  dispatch(setError(null));
  try {
    const updated = await apiRequest<Channel>(
      `/channels/${channelId}/backup-mode`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    dispatch(updateChannel({ ...updated, selected: true } as any));
    return updated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Ошибка обновления настроек';
    dispatch(setError(msg));
    throw error;
  } finally {
    dispatch(setSaving(false));
  }
};

export const disableBackupThunk = createAsyncThunk(
  'backup/disable',
  async (channelId: number, { dispatch }) => {
    dispatch(setCopyEnabled(false));
    return sendBackupUpdate(channelId, {
      backup_mode: 'DISABLED',
      backup_target_ids: null,
      backup_post_types: null,
      backup_content_types: null,
      backup_ai_prompt: null,
    }, dispatch);
  },
);

export const toggleBackupTargetThunk = createAsyncThunk(
  'backup/toggleTarget',
  async ({ channelId, targetId }: { channelId: number; targetId: number }, { dispatch, getState }) => {
    dispatch(toggleTarget(targetId));
    const state = getState() as ChannelsPageState;
    const payload = buildPayload(state);
    return sendBackupUpdate(channelId, payload, dispatch);
  },
);

export const toggleBackupPostTypeThunk = createAsyncThunk(
  'backup/togglePostType',
  async ({ channelId, postType }: { channelId: number; postType: string }, { dispatch, getState }) => {
    dispatch(togglePostType(postType));
    const state = getState() as ChannelsPageState;
    const payload = buildPayload(state);
    return sendBackupUpdate(channelId, payload, dispatch);
  },
);

export const toggleBackupContentTypeThunk = createAsyncThunk(
  'backup/toggleContentType',
  async ({ channelId, contentType }: { channelId: number; contentType: string }, { dispatch, getState }) => {
    dispatch(toggleContentType(contentType));
    const state = getState() as ChannelsPageState;
    const payload = buildPayload(state);
    return sendBackupUpdate(channelId, payload, dispatch);
  },
);

export const updateBackupAiPromptThunk = createAsyncThunk(
  'backup/updateAiPrompt',
  async ({ channelId, prompt }: { channelId: number; prompt: string }, { dispatch, getState }) => {
    const state = getState() as ChannelsPageState;
    const payload = buildPayload({ ...state, backup: { ...state.backup, aiPrompt: prompt } } as ChannelsPageState);
    return sendBackupUpdate(channelId, payload, dispatch);
  },
);

export const restoreBackupThunk = createAsyncThunk(
  'backup/restore',
  async (
    { sourceChannelId, targetChannelId }: { sourceChannelId: number; targetChannelId: number },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setSaving(true));
    try {
      const result = await apiRequest<{ success: boolean; job_id: number; message: string }>(
        '/channels/restore',
        {
          method: 'POST',
          body: JSON.stringify({
            source_channel_id: sourceChannelId,
            target_channel_id: targetChannelId,
          }),
        },
      );
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка восстановления';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
