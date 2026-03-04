import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { Trigger, TriggerCreate, TriggerType } from '../slices/triggers';
import {
  setTriggers,
  addTrigger,
  setLoading,
  setError,
} from '../slices/triggers';

export interface TriggerListResponse {
  items: Trigger[];
  total: number;
}

export interface FetchTriggersParams {
  botId: number;
  triggerType?: TriggerType | null;
  isActive?: boolean | null;
}

export const fetchTriggersThunk = createAsyncThunk(
  'triggers/fetchTriggers',
  async (params: FetchTriggersParams, { dispatch, rejectWithValue }) => {
    const { botId, triggerType, isActive } = params;
    
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const queryParams = new URLSearchParams();
      if (triggerType !== undefined && triggerType !== null) {
        queryParams.append('trigger_type', triggerType);
      }
      if (isActive !== undefined && isActive !== null) {
        queryParams.append('is_active', String(isActive));
      }
      
      const response = await apiRequest<TriggerListResponse>(
        `/bots/${botId}/triggers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
        { method: 'GET' }
      );
      
      const triggers = response.items || [];
      dispatch(setTriggers(triggers));
      return triggers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки триггеров';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const createTriggerThunk = createAsyncThunk(
  'triggers/createTrigger',
  async (
    { botId, data }: { botId: number; data: TriggerCreate },
    { dispatch, rejectWithValue }
  ) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const trigger = await apiRequest<Trigger>(
        `/bots/${botId}/triggers`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      dispatch(addTrigger(trigger));
      return trigger;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания триггера';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);
