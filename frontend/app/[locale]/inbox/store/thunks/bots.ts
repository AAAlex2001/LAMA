import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import type { Bot, BotCreate, BotStatus } from '../slices/bots';
import {
  setBots,
  addBot,
  setLoading,
  setError,
  setPagination,
} from '../slices/bots';

export interface BotListResponse {
  items: Bot[];
  total: number;
}

export interface FetchBotsParams {
  status?: BotStatus;
  page?: number;
  page_size?: number;
}

export const fetchBotsThunk = createAsyncThunk(
  'bots/fetchBots',
  async (params: FetchBotsParams = {}, { dispatch, rejectWithValue }) => {
    const { status, page = 1, page_size = 50 } = params;
    
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const queryParams = new URLSearchParams();
      if (status !== undefined && status !== null) {
        queryParams.append('status', status);
      }
      queryParams.append('page', String(page));
      queryParams.append('page_size', String(page_size));
      
      const response = await apiRequest<BotListResponse>(
        `/bots?${queryParams.toString()}`,
        { method: 'GET' }
      );
      
      const bots = response.items || [];
      dispatch(setBots(bots));
      dispatch(setPagination({
        page,
        pageSize: page_size,
        total: response.total || 0,
      }));
      return bots;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки ботов';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const createBotThunk = createAsyncThunk(
  'bots/createBot',
  async (data: BotCreate, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const bot = await apiRequest<Bot>(
        '/bots',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      dispatch(addBot(bot));
      return bot;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания бота';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);
