import { useMutation } from '@tanstack/react-query';
import type { InlineKeyboard } from '@/types/post';
import { apiRequest } from '@/store/api';

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

export function useSendBotMessageMutation() {
  return useMutation({
    mutationFn: ({ botId, data }: { botId: number; data: SendMessageRequest }) =>
      apiRequest<BotMessageResponse>(`/bots/${botId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
