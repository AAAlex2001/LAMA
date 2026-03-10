import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import { InlineKeyboard } from '@/app/[locale]/create-post/store/types';

export interface SendMessageRequest {
  text_content?: string;
  media_url?: string;
  media_urls?: string[];
  inline_keyboard?: InlineKeyboard;
}

export interface BotMessageResponse {
  id: number;
  bot_id: number;
  chat_id?: number;
  text_content?: string;
  media_url?: string;
  media_type?: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  inline_keyboard?: Record<string, unknown>;
  is_incoming: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotMessageListResponse {
  items: BotMessageResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface FetchMessagesParams {
  botId: number;
  chat_id?: number | null;
  is_incoming?: boolean | null;
  page?: number;
  page_size?: number;
}

export interface SendMessageParams {
  botId: number;
  data: SendMessageRequest;
}

export const fetchMessagesThunk = createAsyncThunk(
  'globalMessages/fetchMessages',
  async (params: FetchMessagesParams, { rejectWithValue }) => {
    const { botId, chat_id, is_incoming, page = 1, page_size = 50 } = params;
    
    try {
      const queryParams = new URLSearchParams();
      if (chat_id !== undefined && chat_id !== null) {
        queryParams.append('chat_id', String(chat_id));
      }
      if (is_incoming !== undefined && is_incoming !== null) {
        queryParams.append('is_incoming', String(is_incoming));
      }
      queryParams.append('page', String(page));
      queryParams.append('page_size', String(page_size));
      
      const response = await apiRequest<BotMessageListResponse>(
        `/bots/${botId}/messages?${queryParams.toString()}`,
        { method: 'GET' }
      );
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки сообщений';
      return rejectWithValue(errorMessage);
    }
  }
);

export const sendMessageThunk = createAsyncThunk(
  'globalMessages/sendMessage',
  async (params: SendMessageParams, { rejectWithValue }) => {
    const { botId, data } = params;

    try {
      const message = await apiRequest<BotMessageResponse>(
        `/bots/${botId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      console.log('message', message);
      
      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки сообщения';
      return rejectWithValue(errorMessage);
    }
  }
);
