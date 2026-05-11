import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';

export type AntispamMode = 'DISABLED' | 'BLOCK_ALL' | 'ALLOW_TME_ONLY' | 'WHITELIST' | 'BLACKLIST';
export type AntispamAction = 'BAN' | 'MUTE' | 'KICK' | 'DELETE';

export interface AntispamSettings {
  link_filter_mode: AntispamMode;
  link_whitelist: string[] | null;
  link_blacklist: string[] | null;
  link_filter_action: AntispamAction;
  link_filter_mute_duration: number | null;
}

export interface AntispamUpdateRequest {
  link_filter_mode: AntispamMode;
  link_whitelist: string[];
  link_blacklist: string[];
  link_filter_action: AntispamAction;
  link_filter_mute_duration: number | null;
}

export const antispamKeys = {
  all: ['channel-antispam'] as const,
  byChannel: (channelId: number) => [...antispamKeys.all, channelId] as const,
};

export function useAntispamQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? antispamKeys.byChannel(channelId) : ['antispam', 'disabled'],
    queryFn: () => apiRequest<AntispamSettings>(`/channels/${channelId}/antispam`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAntispamMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: AntispamUpdateRequest }) =>
      apiRequest<AntispamSettings>(`/channels/${channelId}/antispam`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: antispamKeys.byChannel(channelId) }),
  });
}
