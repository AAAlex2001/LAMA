import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import { updateChannel } from '@/store/channels';
import type { Channel, ChannelBasic } from '@/types/channel';
import type { Bot, BotCreate, BotStatus } from './slice';
import {
  setBots,
  setCurrentBot,
  clearCurrentBot,
  addBot,
  updateBot,
  removeBot,
  setLoading,
  setToggling,
  setError,
  setPagination,
} from './slice';

export interface BotListResponse {
  items: Bot[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface FetchBotsParams {
  status?: BotStatus;
  page?: number;
  page_size?: number;
}

export interface BotStatsPayload {
  bot_id: number;
  total_messages: number;
  incoming_messages: number;
  outgoing_messages: number;
  total_commands: number;
  active_commands: number;
  last_message_at: string | null;
}

function toChannelBasic(ch: Channel): ChannelBasic {
  return {
    id: ch.id,
    title: ch.title,
    selected: true,
    members_count: ch.members_count,
    photo_url: ch.photo_url,
    username: ch.username,
    invite_link: ch.invite_link,
    channel_type: ch.channel_type,
    description: ch.description,
    bot_id: ch.bot_id,
    is_bot_active: ch.is_bot_active,
  };
}

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const fetchBotsThunk = createAsyncThunk(
  'bots/fetchList',
  async (params: FetchBotsParams = {}, { dispatch, rejectWithValue }) => {
    const { status, page = 1, page_size = 50 } = params;
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const qp = new URLSearchParams();
      if (status) qp.append('status', status);
      qp.append('page', String(page));
      qp.append('page_size', String(page_size));
      const res = await apiRequest<BotListResponse>(`/bots?${qp}`, { method: 'GET' });
      dispatch(setBots(res.items ?? []));
      dispatch(setPagination({ page, pageSize: page_size, total: res.total ?? 0 }));
      return res.items ?? [];
    } catch (error) {
      const msg = errMsg(error, 'Ошибка загрузки ботов');
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const fetchBotThunk = createAsyncThunk(
  'bots/fetchSingle',
  async (botId: number, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const bot = await apiRequest<Bot>(`/bots/${botId}`, { method: 'GET' });
      dispatch(setCurrentBot(bot));
      return bot;
    } catch (error) {
      const msg = errMsg(error, 'Ошибка загрузки бота');
      dispatch(setError(msg));
      return rejectWithValue(msg);
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const createBotThunk = createAsyncThunk(
  'bots/create',
  async (data: BotCreate, { dispatch, rejectWithValue }) => {
    dispatch(setError(null));
    try {
      const result = await apiRequest<{ botError?: string; botData?: Bot }>('/connect-bot', {
        method: 'POST',
        skipApiPrefix: true,
        body: JSON.stringify({ botToken: data.token, botDescription: data.description }),
      });
      if (result.botError) throw new Error(result.botError);
      if (!result.botData) throw new Error('Не удалось получить данные бота');
      dispatch(addBot(result.botData));
      return result.botData;
    } catch (error) {
      const msg = errMsg(error, 'Ошибка подключения бота');
      dispatch(setError(msg));
      return rejectWithValue(msg);
    }
  },
);

export const deleteBotThunk = createAsyncThunk(
  'bots/delete',
  async (botId: number, { dispatch, rejectWithValue }) => {
    try {
      await apiRequest(`/bots/${botId}`, { method: 'DELETE' });
      dispatch(removeBot(botId));
      return botId;
    } catch (error) {
      return rejectWithValue(errMsg(error, 'Ошибка удаления бота'));
    }
  },
);

export const activateBotThunk = createAsyncThunk(
  'bots/activate',
  async (botId: number, { dispatch, rejectWithValue }) => {
    try {
      const bot = await apiRequest<Bot>(`/bots/${botId}/activate`, { method: 'POST' });
      dispatch(updateBot(bot));
      return bot;
    } catch (error) {
      return rejectWithValue(errMsg(error, 'Не удалось запустить бота'));
    }
  },
);

export const deactivateBotThunk = createAsyncThunk(
  'bots/deactivate',
  async (botId: number, { dispatch, rejectWithValue }) => {
    try {
      const bot = await apiRequest<Bot>(`/bots/${botId}/deactivate`, { method: 'POST' });
      dispatch(updateBot(bot));
      return bot;
    } catch (error) {
      return rejectWithValue(errMsg(error, 'Не удалось остановить бота'));
    }
  },
);

export const fetchBotStatsThunk = createAsyncThunk(
  'bots/fetchStats',
  async (botId: number, { rejectWithValue }) => {
    try {
      return await apiRequest<BotStatsPayload>(`/bots/${botId}/stats`, { method: 'GET' });
    } catch (error) {
      return rejectWithValue(errMsg(error, 'Ошибка загрузки статистики'));
    }
  },
);

export const updateBotThunk = createAsyncThunk(
  'bots/update',
  async (
    { botId, data }: { botId: number; data: { name?: string; description?: string } },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const bot = await apiRequest<Bot>(`/bots/${botId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      dispatch(updateBot(bot));
      dispatch(setCurrentBot(bot));
      return bot;
    } catch (error) {
      return rejectWithValue(errMsg(error, 'Ошибка обновления бота'));
    }
  },
);

export const toggleBotOnChannelThunk = createAsyncThunk(
  'bots/toggleOnChannel',
  async (channel: Channel, { dispatch, rejectWithValue }) => {
    dispatch(setToggling(true));
    try {
      const updated = await apiRequest<Channel>(`/channels/${channel.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_bot_active: !channel.is_bot_active }),
      });
      dispatch(updateChannel(toChannelBasic(updated)));
      return updated.is_bot_active;
    } catch (error) {
      return rejectWithValue(errMsg(error, 'Ошибка переключения бота'));
    } finally {
      dispatch(setToggling(false));
    }
  },
);

export const removeBotFromChannelThunk = createAsyncThunk(
  'bots/removeFromChannel',
  async (channel: Channel, { dispatch, rejectWithValue }) => {
    dispatch(setToggling(true));
    try {
      const updated = await apiRequest<Channel>(`/channels/${channel.id}`, {
        method: 'PUT',
        body: JSON.stringify({ clear_bot: true }),
      });
      dispatch(updateChannel(toChannelBasic(updated)));
      dispatch(clearCurrentBot());
      return updated;
    } catch (error) {
      return rejectWithValue(errMsg(error, 'Ошибка удаления бота'));
    } finally {
      dispatch(setToggling(false));
    }
  },
);
