import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

export interface FloodSettings {
  flood_message_limit: number | null;
  flood_interval_seconds: number | null;
  flood_action: string | null;
  flood_mute_duration_minutes: number | null;
}

export interface AutoDeleteSettings {
  id: number;
  channel_id: number;
  delete_system_messages: boolean;
  delete_command_messages: boolean;
  delete_join_messages: boolean;
  delete_all_messages: boolean;
  delete_text_only: boolean;
  delete_media_only: boolean;
  delete_delay_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface AutoDeleteUpdateRequest {
  delete_system_messages: boolean;
  delete_command_messages: boolean;
  delete_join_messages: boolean;
  delete_all_messages: boolean;
  delete_text_only: boolean;
  delete_media_only: boolean;
  delete_delay_seconds: number;
}

export interface MediaBlockResponse {
  block_media_types: string[] | null;
}

export interface QuickCommandsResponse {
  commands_enabled: boolean;
  enabled_commands: string[] | null;
}

export const moderationKeys = {
  all: ['channel-moderation'] as const,
  flood: (channelId: number) => [...moderationKeys.all, 'flood', channelId] as const,
  autoDelete: (channelId: number) => [...moderationKeys.all, 'auto-delete', channelId] as const,
  mediaBlock: (channelId: number) => [...moderationKeys.all, 'media-block', channelId] as const,
  quickCommands: (channelId: number) => [...moderationKeys.all, 'quick-commands', channelId] as const,
};

export function useFloodSettingsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? moderationKeys.flood(channelId) : ['flood', 'disabled'],
    queryFn: () => apiRequest<FloodSettings>(`/channels/${channelId}/flood`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useUpdateFloodSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: Partial<FloodSettings> }) =>
      apiRequest<FloodSettings>(`/channels/${channelId}/flood`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: moderationKeys.flood(channelId) }),
  });
}

export function useAutoDeleteSettingsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? moderationKeys.autoDelete(channelId) : ['auto-delete', 'disabled'],
    queryFn: () => apiRequest<AutoDeleteSettings>(`/channels/${channelId}/auto-delete`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAutoDeleteSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: AutoDeleteUpdateRequest }) =>
      apiRequest<AutoDeleteSettings>(`/channels/${channelId}/auto-delete`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: moderationKeys.autoDelete(channelId) }),
  });
}

export function useMediaBlockQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? moderationKeys.mediaBlock(channelId) : ['media-block', 'disabled'],
    queryFn: () => apiRequest<MediaBlockResponse>(`/channels/${channelId}/media-block`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useUpdateMediaBlockMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, blockTypes }: { channelId: number; blockTypes: string[] }) =>
      apiRequest<MediaBlockResponse>(`/channels/${channelId}/media-block`, {
        method: 'PUT',
        body: JSON.stringify({ block_media_types: blockTypes.length > 0 ? blockTypes : null }),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: moderationKeys.mediaBlock(channelId) }),
  });
}

export function useQuickCommandsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? moderationKeys.quickCommands(channelId) : ['quick-commands', 'disabled'],
    queryFn: () => apiRequest<QuickCommandsResponse>(`/channels/${channelId}/quick-commands`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useUpdateQuickCommandsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId, enabled, commands,
    }: { channelId: number; enabled: boolean; commands: string[] }) =>
      apiRequest<QuickCommandsResponse>(`/channels/${channelId}/quick-commands`, {
        method: 'PUT',
        body: JSON.stringify({
          commands_enabled: enabled,
          enabled_commands: enabled ? commands : null,
        }),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: moderationKeys.quickCommands(channelId) }),
  });
}

export function invalidateChannelModeration(channelId: number, qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: moderationKeys.flood(channelId) });
  qc.invalidateQueries({ queryKey: moderationKeys.autoDelete(channelId) });
  qc.invalidateQueries({ queryKey: moderationKeys.mediaBlock(channelId) });
  qc.invalidateQueries({ queryKey: moderationKeys.quickCommands(channelId) });
}
