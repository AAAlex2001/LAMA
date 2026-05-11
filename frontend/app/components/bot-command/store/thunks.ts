import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { setItems, addItem, updateItem, removeItem, setLoading, type BotCommand } from './slices/list';
import { setIsSubmitting, close } from './slices/form';

interface BotCommandListResponse {
  items: BotCommand[];
  total: number;
}

export const fetchBotCommandsThunk = createAsyncThunk(
  'botCommand/fetch',
  async ({ botId, channelId }: { botId: number; channelId: number }, { dispatch }) => {
    dispatch(setLoading(true));
    try {
      const data = await apiRequest<BotCommandListResponse>(
        `/bots/${botId}/commands?channel_id=${channelId}`,
      );
      dispatch(setItems(data.items || []));
      return data.items;
    } catch {
      dispatch(setItems([]));
      return [];
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const createBotCommandThunk = createAsyncThunk(
  'botCommand/create',
  async ({ botId, data }: { botId: number; data: Record<string, unknown> }, { dispatch, rejectWithValue }) => {
    dispatch(setIsSubmitting(true));
    try {
      const created = await apiRequest<BotCommand>(`/bots/${botId}/commands`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      dispatch(addItem(created));
      dispatch(close());
      return created;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка создания';
      return rejectWithValue(msg);
    } finally {
      dispatch(setIsSubmitting(false));
    }
  },
);

export const updateBotCommandThunk = createAsyncThunk(
  'botCommand/update',
  async (
    { botId, commandId, data }: { botId: number; commandId: number; data: Record<string, unknown> },
    { dispatch, rejectWithValue },
  ) => {
    dispatch(setIsSubmitting(true));
    try {
      const updated = await apiRequest<BotCommand>(`/bots/${botId}/commands/${commandId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      dispatch(updateItem(updated));
      dispatch(close());
      return updated;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка обновления';
      return rejectWithValue(msg);
    } finally {
      dispatch(setIsSubmitting(false));
    }
  },
);

export const deleteBotCommandThunk = createAsyncThunk(
  'botCommand/delete',
  async ({ botId, commandId }: { botId: number; commandId: number }, { dispatch, rejectWithValue }) => {
    try {
      await apiRequest(`/bots/${botId}/commands/${commandId}`, { method: 'DELETE' });
      dispatch(removeItem(commandId));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка удаления';
      return rejectWithValue(msg);
    }
  },
);

export const toggleBotCommandThunk = createAsyncThunk(
  'botCommand/toggle',
  async ({ botId, entryId, isActive }: { botId: number; entryId: number; isActive: boolean }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await apiRequest<BotCommand>(`/bots/${botId}/commands/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      });
      dispatch(updateItem(updated));
      return updated;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка';
      return rejectWithValue(msg);
    }
  },
);
