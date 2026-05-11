import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import {
  setItems,
  addItem,
  updateItem,
  removeItem,
  setLoading,
  type AutoReply,
} from './slices/list';
import { setIsSubmitting, close } from './slices/form';

interface AutoReplyListResponse {
  items: AutoReply[];
  total: number;
}

export const fetchAutoRepliesThunk = createAsyncThunk(
  'autoReply/fetch',
  async ({ botId, channelId, search }: { botId: number; channelId?: number; search?: string }, { dispatch }) => {
    dispatch(setLoading(true));
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (channelId) params.set('channel_id', String(channelId));
      if (search?.trim()) params.set('search', search.trim());
      const data = await apiRequest<AutoReplyListResponse>(`/bots/${botId}/auto-replies?${params}`);
      dispatch(setItems(data.items || []));
      return data.items;
    } catch {
      return [];
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const createAutoReplyThunk = createAsyncThunk(
  'autoReply/create',
  async (
    { botId, channelId, data }: { botId: number; channelId?: number; data: Record<string, unknown> },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setIsSubmitting(true));
    try {
      const body = channelId ? { ...data, channel_id: channelId } : data;
      const reply = await apiRequest<AutoReply>(`/bots/${botId}/auto-replies`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      dispatch(addItem(reply));
      dispatch(close());
      return reply;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка создания';
      return rejectWithValue(msg);
    } finally {
      dispatch(setIsSubmitting(false));
    }
  },
);

export const updateAutoReplyThunk = createAsyncThunk(
  'autoReply/update',
  async (
    { botId, replyId, data }: { botId: number; replyId: number; data: Record<string, unknown> },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setIsSubmitting(true));
    try {
      const reply = await apiRequest<AutoReply>(`/bots/${botId}/auto-replies/${replyId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      dispatch(updateItem(reply));
      dispatch(close());
      return reply;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления';
      return rejectWithValue(msg);
    } finally {
      dispatch(setIsSubmitting(false));
    }
  },
);

export const deleteAutoReplyThunk = createAsyncThunk(
  'autoReply/delete',
  async (
    { botId, replyId }: { botId: number; replyId: number },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await apiRequest(`/bots/${botId}/auto-replies/${replyId}`, { method: 'DELETE' });
      dispatch(removeItem(replyId));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка удаления';
      return rejectWithValue(msg);
    }
  },
);

export const toggleAutoReplyThunk = createAsyncThunk(
  'autoReply/toggle',
  async (
    { botId, replyId, isActive }: { botId: number; replyId: number; isActive: boolean },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const reply = await apiRequest<AutoReply>(`/bots/${botId}/auto-replies/${replyId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      });
      dispatch(updateItem(reply));
      return reply;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка';
      return rejectWithValue(msg);
    }
  },
);
