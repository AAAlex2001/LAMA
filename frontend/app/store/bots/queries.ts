import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiRequest, API_BASE_URL, getAuthToken } from '@/store/api';
import { invalidateChannels } from '@/store/channels';
import { queryClient as defaultQueryClient } from '@/store/query-client';
import type { Channel } from '@/types/channel';
import type { Bot, BotCreate, BotStatus } from './slice';

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
  pageSize?: number;
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

export const botsKeys = {
  all: ['bots'] as const,
  list: (params: FetchBotsParams = {}) => [...botsKeys.all, 'list', params] as const,
  detail: (botId: number) => [...botsKeys.all, 'detail', botId] as const,
  stats: (botId: number) => [...botsKeys.all, 'stats', botId] as const,
};

async function fetchBots(params: FetchBotsParams = {}): Promise<BotListResponse> {
  const { status, page = 1, pageSize = 50 } = params;
  const qp = new URLSearchParams();
  if (status) qp.append('status', status);
  qp.append('page', String(page));
  qp.append('page_size', String(pageSize));
  return apiRequest<BotListResponse>(`/bots?${qp}`, { method: 'GET' });
}

export function useBotsQuery(params: FetchBotsParams = {}) {
  return useQuery({
    queryKey: botsKeys.list(params),
    queryFn: () => fetchBots(params),
    staleTime: 60 * 1000,
  });
}

export function useBotQuery(botId: number | null) {
  return useQuery({
    queryKey: botId !== null ? botsKeys.detail(botId) : ['bots', 'detail', 'disabled'],
    queryFn: () => apiRequest<Bot>(`/bots/${botId}`, { method: 'GET' }),
    enabled: botId !== null,
    staleTime: 60 * 1000,
  });
}

export function useBotStatsQuery(botId: number | null) {
  return useQuery({
    queryKey: botId !== null ? botsKeys.stats(botId) : ['bots', 'stats', 'disabled'],
    queryFn: () => apiRequest<BotStatsPayload>(`/bots/${botId}/stats`, { method: 'GET' }),
    enabled: botId !== null,
    staleTime: 30 * 1000,
  });
}

export function useCreateBotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BotCreate) => {
      const result = await apiRequest<{ botError?: string; botData?: Bot }>('/connect-bot', {
        method: 'POST',
        skipApiPrefix: true,
        body: JSON.stringify({ botToken: data.token, botDescription: data.description }),
      });
      if (result.botError) throw new Error(result.botError);
      if (!result.botData) throw new Error('Не удалось получить данные бота');
      return result.botData;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: botsKeys.all }),
  });
}

export function useDeleteBotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (botId: number) => {
      await apiRequest(`/bots/${botId}`, { method: 'DELETE' });
      return botId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: botsKeys.all }),
  });
}

export function useActivateBotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (botId: number) =>
      apiRequest<Bot>(`/bots/${botId}/activate`, { method: 'POST' }),
    onSuccess: (bot) => {
      qc.setQueryData(botsKeys.detail(bot.id), bot);
      qc.invalidateQueries({ queryKey: ['bots', 'list'] });
    },
  });
}

export function useDeactivateBotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (botId: number) =>
      apiRequest<Bot>(`/bots/${botId}/deactivate`, { method: 'POST' }),
    onSuccess: (bot) => {
      qc.setQueryData(botsKeys.detail(bot.id), bot);
      qc.invalidateQueries({ queryKey: ['bots', 'list'] });
    },
  });
}

export function useUpdateBotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, data }: { botId: number; data: Record<string, unknown> }) =>
      apiRequest<Bot>(`/bots/${botId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (bot) => {
      qc.setQueryData(botsKeys.detail(bot.id), bot);
      qc.invalidateQueries({ queryKey: ['bots', 'list'] });
    },
  });
}

export function useUploadBotPhotoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ botId, file }: { botId: number; file: File }) => {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch(`${API_BASE_URL}/bots/${botId}/telegram-photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Ошибка загрузки фото');
      }
      return (await response.json()) as Bot;
    },
    onSuccess: (bot) => {
      qc.setQueryData(botsKeys.detail(bot.id), bot);
      qc.invalidateQueries({ queryKey: ['bots', 'list'] });
    },
  });
}

export function useDeleteBotPhotoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (botId: number) =>
      apiRequest<Bot>(`/bots/${botId}/telegram-photo`, { method: 'DELETE' }),
    onSuccess: (bot) => {
      qc.setQueryData(botsKeys.detail(bot.id), bot);
      qc.invalidateQueries({ queryKey: ['bots', 'list'] });
    },
  });
}

export function useToggleBotOnChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: Channel) =>
      apiRequest<Channel>(`/channels/${channel.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_bot_active: !channel.is_bot_active }),
      }),
    onSuccess: () => invalidateChannels(qc),
  });
}

export function useRemoveBotFromChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: Channel) =>
      apiRequest<Channel>(`/channels/${channel.id}`, {
        method: 'PUT',
        body: JSON.stringify({ clear_bot: true }),
      }),
    onSuccess: () => invalidateChannels(qc),
  });
}

export function useBindBotToChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, botId }: { channelId: number; botId: number }) =>
      apiRequest<Channel>(`/channels/${channelId}`, {
        method: 'PUT',
        body: JSON.stringify({ bot_id: botId }),
      }),
    onSuccess: () => invalidateChannels(qc),
  });
}

export function useUnbindBotFromChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: number) =>
      apiRequest<Channel>(`/channels/${channelId}`, {
        method: 'PUT',
        body: JSON.stringify({ clear_bot: true }),
      }),
    onSuccess: () => invalidateChannels(qc),
  });
}

export function invalidateBots(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: botsKeys.all });
}
