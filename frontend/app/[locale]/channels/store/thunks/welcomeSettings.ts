import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { setWelcomeData, setEnabled, setSaving, clearMessage } from '../slices/welcomeSettings';

interface WelcomeResponse {
  welcome_enabled: boolean;
  welcome_message: string | null;
  welcome_media_url: string | null;
  welcome_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'VOICE' | 'STICKER' | 'ANIMATION' | null;
  welcome_buttons: { inline_keyboard: { text: string; url?: string }[][] } | null;
  welcome_message_thread_id: number | null;
}

function mapResponse(data: WelcomeResponse) {
  const buttons = data.welcome_buttons?.inline_keyboard ?? null;
  const mediaType = data.welcome_media_type as 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'ANIMATION' | null;
  return {
    enabled: data.welcome_enabled,
    message: data.welcome_message,
    mediaUrl: data.welcome_media_url,
    mediaType,
    buttons,
    messageThreadId: data.welcome_message_thread_id,
  };
}

export const fetchWelcomeSettingsThunk = createAsyncThunk(
  'welcomeSettings/fetch',
  async (botId: number, { dispatch }) => {
    try {
      const data = await apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`);
      dispatch(setWelcomeData(mapResponse(data)));
      return data;
    } catch {
      return null;
    }
  },
);

export const toggleWelcomeThunk = createAsyncThunk(
  'welcomeSettings/toggle',
  async ({ botId, enabled }: { botId: number; enabled: boolean }, { dispatch, rejectWithValue }) => {
    dispatch(setEnabled(enabled));
    dispatch(setSaving(true));
    try {
      const data = await apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`, {
        method: 'PUT',
        body: JSON.stringify({ welcome_enabled: enabled }),
      });
      dispatch(setWelcomeData(mapResponse(data)));
      return data;
    } catch (error) {
      dispatch(setEnabled(!enabled));
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const updateWelcomeSettingsThunk = createAsyncThunk(
  'welcomeSettings/update',
  async (
    { botId, data }: { botId: number; data: Record<string, unknown> },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setSaving(true));
    try {
      const res = await apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      dispatch(setWelcomeData(mapResponse(res)));
      return res;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const deleteWelcomeMessageThunk = createAsyncThunk(
  'welcomeSettings/deleteMessage',
  async (botId: number, { dispatch, rejectWithValue }) => {
    dispatch(setSaving(true));
    try {
      const res = await apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`, {
        method: 'PUT',
        body: JSON.stringify({
          welcome_message: null,
          welcome_media_url: null,
          welcome_media_type: null,
          welcome_buttons: null,
        }),
      });
      dispatch(clearMessage());
      return res;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка удаления');
    } finally {
      dispatch(setSaving(false));
    }
  },
);
