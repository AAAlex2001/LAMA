import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import {
  setApprovalData,
  setLoaded,
  setSaving,
  setError,
} from '../slices/joinSettings';

interface AutoApprovalData {
  auto_approval_mode: 'AUTO' | 'MANUAL' | 'CRITERIA';
  approval_criteria: { required_channels?: number[] } | null;
}

export const fetchJoinSettingsThunk = createAsyncThunk(
  'joinSettings/fetch',
  async (botId: number, { dispatch, rejectWithValue }) => {
    try {
      const data = await apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`);
      dispatch(setApprovalData({
        approvalMode: data.auto_approval_mode,
        requiredChannels: data.approval_criteria?.required_channels || [],
      }));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки настроек';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setLoaded(true));
    }
  },
);

export const toggleAutoApproveThunk = createAsyncThunk(
  'joinSettings/toggleAutoApprove',
  async ({ botId, checked }: { botId: number; checked: boolean }, { dispatch, rejectWithValue }) => {
    const newMode = checked ? 'AUTO' : 'MANUAL';
    dispatch(setSaving(true));
    try {
      const data = await apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`, {
        method: 'PUT',
        body: JSON.stringify({
          auto_approval_mode: newMode,
          approval_criteria: null,
        }),
      });
      dispatch(setApprovalData({
        approvalMode: data.auto_approval_mode,
        requiredChannels: data.approval_criteria?.required_channels || [],
      }));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления настроек';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const toggleRequiredChannelThunk = createAsyncThunk(
  'joinSettings/toggleChannel',
  async (
    { botId, telegramId, currentChannels, currentMode }: {
      botId: number;
      telegramId: number;
      currentChannels: number[];
      currentMode: 'AUTO' | 'MANUAL' | 'CRITERIA';
    },
    { dispatch, rejectWithValue },
  ) => {
    const isSelected = currentChannels.includes(telegramId);
    const newChannels = isSelected
      ? currentChannels.filter((id) => id !== telegramId)
      : [...currentChannels, telegramId];

    const newMode = newChannels.length > 0
      ? 'CRITERIA'
      : currentMode === 'CRITERIA' ? 'MANUAL' : currentMode;

    dispatch(setSaving(true));
    try {
      const data = await apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`, {
        method: 'PUT',
        body: JSON.stringify({
          auto_approval_mode: newMode,
          approval_criteria: newChannels.length > 0 ? { required_channels: newChannels } : null,
        }),
      });
      dispatch(setApprovalData({
        approvalMode: data.auto_approval_mode,
        requiredChannels: data.approval_criteria?.required_channels || [],
      }));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления настроек';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);
