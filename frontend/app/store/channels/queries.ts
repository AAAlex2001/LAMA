import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { ChannelBasic, ChannelsResponse, SyncChannelRequest, SyncChannelResponse } from '@/types';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

export const channelsQueryKey = (page = 1, pageSize = 50) =>
  ['channels', page, pageSize] as const;

interface FetchChannelsParams {
  page?: number;
  pageSize?: number;
  forceRefresh?: boolean;
}

async function fetchChannels({
  page = 1,
  pageSize = 50,
  forceRefresh = false,
}: FetchChannelsParams = {}): Promise<ChannelsResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (forceRefresh) params.set('force_refresh', 'true');
  return apiRequest<ChannelsResponse>(`/channels?${params}`, { method: 'GET' });
}

export function useChannelsQuery(params: FetchChannelsParams = {}) {
  const { page = 1, pageSize = 50 } = params;
  return useQuery({
    queryKey: channelsQueryKey(page, pageSize),
    queryFn: () => fetchChannels(params),
    staleTime: 5 * 60 * 1000,
  });
}

export async function loadChannelsList(qc: QueryClient = defaultQueryClient): Promise<ChannelBasic[]> {
  const data = await qc.fetchQuery({
    queryKey: channelsQueryKey(),
    queryFn: () => fetchChannels(),
    staleTime: 5 * 60 * 1000,
  });
  return data.items ?? [];
}

function parseChannelInput(input: string): Omit<SyncChannelRequest, 'token' | 'bot_id'> {
  const trimmed = input.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return { telegram_id: parseInt(trimmed, 10) };
  }
  if (trimmed.includes('t.me/')) {
    return { invite_link: trimmed };
  }
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return { username };
}

export interface AddChannelMutationParams {
  input: string;
  botId?: number;
  token?: string;
}

export function useAddChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, botId, token }: AddChannelMutationParams): Promise<ChannelBasic> => {
      if (!input.trim()) throw new Error('Введите ссылку, username или ID канала');
      const channelData = parseChannelInput(input);
      const syncData: SyncChannelRequest = {
        ...channelData,
        ...(botId ? { bot_id: botId } : token ? { token } : {}),
      };
      const response = await apiRequest<SyncChannelResponse>('/channels/sync', {
        method: 'POST',
        body: JSON.stringify(syncData),
      });
      if (!response.success || !response.channel) {
        throw new Error(response.message || 'Не удалось подключить канал');
      }
      return response.channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useDeleteChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: number): Promise<number> => {
      await apiRequest(`/channels/${channelId}`, { method: 'DELETE' });
      return channelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useRefreshChannelsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchChannels({ forceRefresh: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function invalidateChannels(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: ['channels'] });
}
