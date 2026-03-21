import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import type { AutoReply, AutoReplyCreate } from '../slices/autoReplies';
import {
  setAutoReplies,
  addAutoReply,
  setLoading,
  setError,
} from '../slices/autoReplies';

export interface AutoReplyListResponse {
  items: AutoReply[];
  total: number;
}

export interface FetchAutoRepliesParams {
  botId: number;
  isActive?: boolean | null;
}

export const fetchAutoRepliesThunk = createAsyncThunk(
  'autoReplies/fetchAutoReplies',
  async (params: FetchAutoRepliesParams, { dispatch, rejectWithValue }) => {
    const { botId, isActive } = params;
    
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const queryParams = new URLSearchParams();
      if (isActive !== undefined && isActive !== null) {
        queryParams.append('is_active', String(isActive));
      }
      
      const response = await apiRequest<AutoReplyListResponse>(
        `/bots/${botId}/auto-replies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
        { method: 'GET' }
      );
      
      const autoReplies = response.items || [];
      dispatch(setAutoReplies(autoReplies));
      return autoReplies;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки автоответов';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const createAutoReplyThunk = createAsyncThunk(
  'autoReplies/createAutoReply',
  async (
    { botId, data }: { botId: number; data: AutoReplyCreate },
    { dispatch, rejectWithValue }
  ) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const autoReply = await apiRequest<AutoReply>(
        `/bots/${botId}/auto-replies`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      dispatch(addAutoReply(autoReply));
      return autoReply;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания автоответа';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);
