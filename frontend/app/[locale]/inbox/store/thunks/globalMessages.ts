import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/store/api';
import type { InlineKeyboard } from '@/types/post';

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
      
      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки сообщения';
      return rejectWithValue(errorMessage);
    }
  }
);
