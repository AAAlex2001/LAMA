import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { setWelcomeData, setEnabled, setSaving, clearMessage, setTopics } from '../slices/welcomeSettings';
import type { ForumTopic } from '../slices/welcomeSettings';

interface WelcomeResponse {
  welcome_enabled: boolean;
  welcome_message: string | null;
  welcome_media_url: string | null;
  welcome_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'VOICE' | 'STICKER' | 'ANIMATION' | null;
  welcome_buttons: { inline_keyboard: { text: string; url?: string }[][] } | null;
  welcome_message_thread_id: number | null;
  welcome_type: string;
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
    welcomeType: data.welcome_type ?? 'group_message',
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

export const fetchForumTopicsThunk = createAsyncThunk(
  'welcomeSettings/fetchTopics',
  async (channelId: number, { dispatch }) => {
    dispatch(setTopics([]));
    try {
      const data = await apiRequest<ForumTopic[]>(`/channels/${channelId}/topics`);
      dispatch(setTopics(data));
      return data;
    } catch {
      return null;
    }
  },
);
