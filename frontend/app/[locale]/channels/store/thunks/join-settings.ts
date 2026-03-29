import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import {
  setApprovalData,
  setLoaded,
  setSaving,
  setError,
  setCaptchaData,
  setCaptchaLoaded,
  setCaptchaEnabled,
  type CaptchaFailAction,
} from '../slices/joinSettings';

interface AutoApprovalData {
  auto_approval_mode: 'AUTO' | 'MANUAL' | 'CRITERIA';
  approval_criteria: { required_channels?: number[] } | null;
}

export const fetchJoinSettingsThunk = createAsyncThunk(
  'joinSettings/fetch',
  async (botId: number, { dispatch, rejectWithValue }) => {
    dispatch(setApprovalData({ approvalMode: 'MANUAL', requiredChannels: [] }));
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

interface CaptchaSettingsData {
  captcha_enabled: boolean;
  captcha_timeout_seconds: number;
  captcha_fail_action: CaptchaFailAction;
  captcha_fail_duration_seconds: number | null;
  captcha_restriction_type: string | null;
  captcha_message_before: string | null;
  captcha_message_fail: string | null;
  captcha_message_success: string | null;
}

export const fetchCaptchaSettingsThunk = createAsyncThunk(
  'joinSettings/fetchCaptcha',
  async (channelId: number, { dispatch, rejectWithValue }) => {
    try {
      const data = await apiRequest<CaptchaSettingsData>(`/channels/${channelId}/captcha`);
      dispatch(setCaptchaData({
        captchaEnabled: data.captcha_enabled,
        captchaTimeoutSeconds: data.captcha_timeout_seconds,
        captchaFailAction: data.captcha_fail_action,
        captchaFailDurationSeconds: data.captcha_fail_duration_seconds,
        captchaRestrictionType: data.captcha_restriction_type || 'send_messages',
        captchaMessageBefore: data.captcha_message_before,
        captchaMessageFail: data.captcha_message_fail,
        captchaMessageSuccess: data.captcha_message_success,
      }));
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки настроек капчи';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setCaptchaLoaded(true));
    }
  },
);

export const updateCaptchaSettingsThunk = createAsyncThunk(
  'joinSettings/updateCaptcha',
  async (
    { channelId, data }: { channelId: number; data: Partial<CaptchaSettingsData> },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setSaving(true));
    try {
      const result = await apiRequest<CaptchaSettingsData>(`/channels/${channelId}/captcha`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      dispatch(setCaptchaData({
        captchaEnabled: result.captcha_enabled,
        captchaTimeoutSeconds: result.captcha_timeout_seconds,
        captchaFailAction: result.captcha_fail_action,
        captchaFailDurationSeconds: result.captcha_fail_duration_seconds,
        captchaRestrictionType: result.captcha_restriction_type || 'send_messages',
        captchaMessageBefore: result.captcha_message_before,
        captchaMessageFail: result.captcha_message_fail,
        captchaMessageSuccess: result.captcha_message_success,
      }));
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления настроек капчи';
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const toggleCaptchaThunk = createAsyncThunk(
  'joinSettings/toggleCaptcha',
  async (
    { channelId, enabled }: { channelId: number; enabled: boolean },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setCaptchaEnabled(enabled));
    dispatch(setSaving(true));
    try {
      const result = await apiRequest<CaptchaSettingsData>(`/channels/${channelId}/captcha`, {
        method: 'PUT',
        body: JSON.stringify({ captcha_enabled: enabled }),
      });
      dispatch(setCaptchaData({
        captchaEnabled: result.captcha_enabled,
        captchaTimeoutSeconds: result.captcha_timeout_seconds,
        captchaFailAction: result.captcha_fail_action,
        captchaFailDurationSeconds: result.captcha_fail_duration_seconds,
        captchaRestrictionType: result.captcha_restriction_type || 'send_messages',
        captchaMessageBefore: result.captcha_message_before,
        captchaMessageFail: result.captcha_message_fail,
        captchaMessageSuccess: result.captcha_message_success,
      }));
      return result;
    } catch (error) {
      dispatch(setCaptchaEnabled(!enabled));
      const msg = error instanceof Error ? error.message : 'Ошибка переключения капчи';
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
