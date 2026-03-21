import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import type { BotCommand, BotCommandCreate } from '../slices/commands';
import {
  setCommands,
  addCommand,
  setLoading,
  setError,
} from '../slices/commands';

export interface BotCommandListResponse {
  items: BotCommand[];
  total: number;
}

export interface FetchCommandsParams {
  botId: number;
  isActive?: boolean | null;
}

export const fetchCommandsThunk = createAsyncThunk(
  'commands/fetchCommands',
  async (params: FetchCommandsParams, { dispatch, rejectWithValue }) => {
    const { botId, isActive } = params;
    
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const queryParams = new URLSearchParams();
      if (isActive !== undefined && isActive !== null) {
        queryParams.append('is_active', String(isActive));
      }
      
      const response = await apiRequest<BotCommandListResponse>(
        `/bots/${botId}/commands${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
        { method: 'GET' }
      );
      
      const commands = response.items || [];
      dispatch(setCommands(commands));
      return commands;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки команд';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const createCommandThunk = createAsyncThunk(
  'commands/createCommand',
  async (
    { botId, data }: { botId: number; data: BotCommandCreate },
    { dispatch, rejectWithValue }
  ) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      const command = await apiRequest<BotCommand>(
        `/bots/${botId}/commands`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      dispatch(addCommand(command));
      return command;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания команды';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);
