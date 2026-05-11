import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { InlineKeyboard } from '@/types/post';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

export interface BotCommand {
  id: number;
  bot_id: number;
  command: string;
  description: string;
  response_text: string;
  response_media_url?: string;
  response_media_urls?: string[];
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotCommandCreate {
  command: string;
  description: string;
  response_text: string;
  response_media_url?: string;
  response_media_urls?: string[];
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
}

interface BotCommandListResponse {
  items: BotCommand[];
  total: number;
}

export const botCommandsKeys = {
  all: ['bot-commands'] as const,
  byBot: (botId: number, isActive?: boolean | null) =>
    [...botCommandsKeys.all, 'bot', botId, { isActive: isActive ?? null }] as const,
};

export function useBotCommandsQuery(botId: number | null, isActive?: boolean | null) {
  return useQuery({
    queryKey: botId !== null
      ? botCommandsKeys.byBot(botId, isActive)
      : ['bot-commands', 'disabled'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isActive !== undefined && isActive !== null) params.set('is_active', String(isActive));
      const qs = params.toString();
      const response = await apiRequest<BotCommandListResponse>(
        `/bots/${botId}/commands${qs ? `?${qs}` : ''}`,
      );
      return response.items ?? [];
    },
    enabled: botId !== null,
    staleTime: 30 * 1000,
  });
}

export function useCreateBotCommandMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, data }: { botId: number; data: BotCommandCreate }) =>
      apiRequest<BotCommand>(`/bots/${botId}/commands`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { botId }) =>
      qc.invalidateQueries({ queryKey: [...botCommandsKeys.all, 'bot', botId] }),
  });
}

export function invalidateBotCommands(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: botCommandsKeys.all });
}
