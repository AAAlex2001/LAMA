import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';

export type MessageType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'VOICE' | 'STICKER' | 'ANIMATION';

export interface DirectChatResponse {
  id: number;
  bot_id: number;
  bot_username?: string | null;
  bot_first_name?: string | null;
  tg_chat_id: number;
  tg_user_id: number | null;
  tg_username: string | null;
  tg_first_name: string | null;
  tg_last_name: string | null;
  tg_photo_url: string | null;
  is_pinned: boolean;
  is_blocked: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
  last_message_at: string | null;
}

export interface DirectChatListResponse {
  items: DirectChatResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface BotMessageResponse {
  id: number;
  bot_id: number;
  message_id: number;
  telegram_message_id: number;
  chat_id: number;
  user_id: number | null;
  message_type: MessageType;
  text_content: string | null;
  media_file_id: string | null;
  media_url: string | null;
  media_group_id: string | null;
  media_name: string | null;
  media_size: number | null;
  reply_to_message_id: number | null;
  is_incoming: boolean;
  created_at: string;
}

export interface BotMessageBatchResponse {
  items: BotMessageResponse[];
}

export interface ChatHistoryResponse {
  items: BotMessageResponse[];
  total: number;
  page: number;
  page_size: number;
}

// --- Request param types ---

export interface FetchDirectChatsParams {
  botId?: number;
  skip?: number;
  limit?: number;
}

export interface FetchDirectMessagesParams {
  botId: number;
  tgChatId: number;
  skip?: number;
  limit?: number;
}

export interface SendDirectMessageParams {
  botId: number;
  tgChatId: number;
  chat_id: number;
  text_content?: string;
  media_url?: string;
  media_urls?: string[];
  media_type?: MessageType;
  buttons?: Record<string, unknown>;
  reply_to_message_id?: number;
}

export interface EditDirectMessageParams {
  messageId: number;
  text_content?: string;
}

export interface DeleteDirectMessageParams {
  messageId: number;
  chatId: number;
}

export interface UpdateDirectChatParams {
  chatId: number;
  is_pinned?: boolean;
  is_blocked?: boolean;
  unread_count?: number;
}

export const fetchDirectChatsThunk = createAsyncThunk(
  'directChat/fetchChats',
  async (params: FetchDirectChatsParams, { rejectWithValue }) => {
    const { botId, skip = 0, limit = 50 } = params;

    try {
      const queryParams = new URLSearchParams();
      if (botId !== undefined) queryParams.append('bot_id', String(botId));
      queryParams.append('skip', String(skip));
      queryParams.append('limit', String(limit));

      const response = await apiRequest<DirectChatListResponse>(
        `/direct/chats?${queryParams.toString()}`,
        { method: 'GET' }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки чатов';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchDirectMessagesThunk = createAsyncThunk(
  'directChat/fetchMessages',
  async (params: FetchDirectMessagesParams, { rejectWithValue }) => {
    const { botId, tgChatId, skip = 0, limit = 50 } = params;

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('skip', String(skip));
      queryParams.append('limit', String(limit));

      const response = await apiRequest<ChatHistoryResponse>(
        `/direct/chats/${botId}/${tgChatId}/messages?${queryParams.toString()}`,
        { method: 'GET' }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки сообщений';
      return rejectWithValue(errorMessage);
    }
  }
);

export const sendDirectMessageThunk = createAsyncThunk(
  'directChat/sendMessage',
  async (params: SendDirectMessageParams, { rejectWithValue }) => {
    const { botId, tgChatId, ...body } = params;

    try {
      const response = await apiRequest<BotMessageBatchResponse>(
        `/direct/chats/${botId}/${tgChatId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки сообщения';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateDirectChatThunk = createAsyncThunk(
  'directChat/updateChat',
  async (params: UpdateDirectChatParams, { rejectWithValue }) => {
    const { chatId, ...body } = params;

    try {
      const response = await apiRequest<DirectChatResponse>(
        `/direct/chats/${chatId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления чата';
      return rejectWithValue(errorMessage);
    }
  }
);

export const editDirectMessageThunk = createAsyncThunk(
  'directChat/editMessage',
  async (params: EditDirectMessageParams, { rejectWithValue }) => {
    const { messageId, ...body } = params;

    try {
      const response = await apiRequest<BotMessageResponse>(
        `/direct/messages/${messageId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка редактирования сообщения';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteDirectMessageThunk = createAsyncThunk(
  'directChat/deleteMessage',
  async (params: DeleteDirectMessageParams, { rejectWithValue }) => {
    const { messageId } = params;

    try {
      await apiRequest(
        `/direct/messages/${messageId}`,
        { method: 'DELETE' }
      );
      return params;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления сообщения';
      return rejectWithValue(errorMessage);
    }
  }
);
