import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import {
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  setInfoMessagesEnabled,
  setAutoReplyEnabled,
  setLoading,
  setSaving,
  setSavingType,
  InfoMessage,
  SavingType,
} from '../slices/automation';

interface InfoMessagesResponse {
  enabled: boolean;
  auto_reply_enabled: boolean;
  items: InfoMessage[];
}

export const fetchInfoMessagesThunk = createAsyncThunk(
  'automation/fetchInfoMessages',
  async (channelId: number, { dispatch }) => {
    dispatch(setLoading(true));
    try {
      const data = await apiRequest<InfoMessagesResponse>(
        `/channels/${channelId}/info-messages`,
      );
      dispatch(setInfoMessagesEnabled(data.enabled));
      dispatch(setAutoReplyEnabled(data.auto_reply_enabled ?? true));
      dispatch(setMessages(data.items));
      return data;
    } catch {
      return null;
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const toggleInfoMessagesThunk = createAsyncThunk(
  'automation/toggleInfoMessages',
  async (
    { channelId, enabled }: { channelId: number; enabled: boolean },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setSaving(true));
    try {
      await apiRequest(`/channels/${channelId}/info-messages/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      dispatch(setInfoMessagesEnabled(enabled));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
    }
  },
);

export const createInfoMessageThunk = createAsyncThunk(
  'automation/createInfoMessage',
  async (
    {
      channelId,
      data,
      savingType,
    }: {
      channelId: number;
      data: {
        text: string;
        media_url?: string | null;
        media_type?: string | null;
        media_urls?: string[] | null;
        inline_keyboard?: any[][] | null;
      };
      savingType: SavingType;
    },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setSaving(true));
    dispatch(setSavingType(savingType));
    try {
      const msg = await apiRequest<InfoMessage>(
        `/channels/${channelId}/info-messages`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      dispatch(addMessage(msg));
      return msg;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка создания';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
      dispatch(setSavingType(null));
    }
  },
);

export const updateInfoMessageThunk = createAsyncThunk(
  'automation/updateInfoMessage',
  async (
    {
      channelId,
      messageId,
      data,
      savingType,
    }: {
      channelId: number;
      messageId: number;
      data: {
        text?: string;
        media_url?: string | null;
        media_type?: string | null;
        media_urls?: string[] | null;
        inline_keyboard?: any[][] | null;
        is_enabled?: boolean;
      };
      savingType: SavingType;
    },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setSaving(true));
    dispatch(setSavingType(savingType));
    try {
      const msg = await apiRequest<InfoMessage>(
        `/channels/${channelId}/info-messages/${messageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
      );
      dispatch(updateMessage(msg));
      return msg;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления';
      return rejectWithValue(msg);
    } finally {
      dispatch(setSaving(false));
      dispatch(setSavingType(null));
    }
  },
);

export const publishInfoMessageThunk = createAsyncThunk(
  'automation/publishInfoMessage',
  async (
    {
      channelId,
      messageId,
    }: {
      channelId: number;
      messageId: number;
    },
    { rejectWithValue },
  ) => {
    try {
      const msg = await apiRequest<InfoMessage>(
        `/channels/${channelId}/info-messages/${messageId}/publish`,
        { method: 'POST' },
      );
      return msg;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка публикации';
      return rejectWithValue(msg);
    }
  },
);

export const toggleAutoReplyEnabledThunk = createAsyncThunk(
  'automation/toggleAutoReplyEnabled',
  async (
    { channelId, enabled }: { channelId: number; enabled: boolean },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await apiRequest(`/channels/${channelId}/auto-replies/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      dispatch(setAutoReplyEnabled(enabled));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка сохранения';
      return rejectWithValue(msg);
    }
  },
);

export const deleteInfoMessageThunk = createAsyncThunk(
  'automation/deleteInfoMessage',
  async (
    { channelId, messageId }: { channelId: number; messageId: number },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await apiRequest(`/channels/${channelId}/info-messages/${messageId}`, {
        method: 'DELETE',
      });
      dispatch(removeMessage(messageId));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка удаления';
      return rejectWithValue(msg);
    }
  },
);
